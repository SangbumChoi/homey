import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnv(): Record<string, string> {
  const envPath = path.join(__dirname, "../.env");
  const content = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      env[key] = vals.join("=");
    }
  }
  return env;
}

const env = loadEnv();
const CLOVA_API_URL = env.VITE_CLOVA_OCR_API_URL ?? "";
const CLOVA_SECRET = env.VITE_CLOVA_OCR_SECRET_KEY ?? "";

async function callClovaOcr(file: File): Promise<string> {
  if (!CLOVA_API_URL || !CLOVA_SECRET) {
    throw new Error("CLOVA OCR API 키가 설정되지 않았습니다");
  }

  const fileBytes = await file.arrayBuffer();
  const uint8 = new Uint8Array(fileBytes);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  const base64Data = btoa(binary);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const format = ext === "pdf" ? "pdf" : "jpg";

  const messageBody = JSON.stringify({
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [{ format, name: "document", data: base64Data }],
  });

  const ocrRes = await fetch(CLOVA_API_URL, {
    method: "POST",
    headers: {
      "X-OCR-SECRET": CLOVA_SECRET,
      "Content-Type": "application/json",
    },
    body: messageBody,
  });

  if (!ocrRes.ok) {
    const errText = await ocrRes.text();
    throw new Error(`CLOVA OCR 오류 (${ocrRes.status}): ${errText}`);
  }

  const ocrData = await ocrRes.json();
  const fullText: string = (ocrData.images ?? [])
    .flatMap((img: { fields?: { inferText: string }[] }) =>
      (img.fields ?? []).map((f) => f.inferText)
    )
    .join(" ");

  return fullText;
}

function parseRegistrationText(text: string) {
  // 소유자 추출 (개인: 2-6자, 법인: 주식회사/유한책임 등)
  let owner = "미확인";
  
  // 법인명 추출 (주식회사, 유한책임 etc.)
  const corpMatch = text.match(/(?:상호|명칭)\s*[:\s]*((?:주식회사|유한책임|합자회사|사단법인|학교법인|의료법인|[가-힣]+(?:유한|합자))[^,\s]*)/);
  if (corpMatch?.[1]) {
    owner = corpMatch[1].trim();
  }
  
  // 개인명 추출 (소유자 다음)
  if (owner === "미확인") {
    const personalMatch = text.match(/소유자\s+([가-힣]{2,6})/);
    if (personalMatch?.[1]) {
      owner = personalMatch[1];
    }
  }

  // 상호명 직접 찾기 (법등기부등본의 경우)
  if (owner === "미확인") {
    const directCorp = text.match(/(?:상호|명칭)\s*((?:주식회사|유한책임)[^,\s]{0,30})/);
    if (directCorp?.[1]) {
      owner = directCorp[1].trim();
    }
  }

  const mortgages: { creditor: string; amount: number }[] = [];
  
  // 채권최고액 찾기
  const amountRe = /채권최고액\s*금\s*([\d,]+)\s*원/g;
  let m: RegExpExecArray | null;
  while ((m = amountRe.exec(text)) !== null) {
    const amount = Math.round(parseInt(m[1].replace(/,/g, ""), 10) / 10000);
    const before = text.substring(Math.max(0, m.index - 400), m.index);
    const creditorMatch = before.match(
      /([가-힣]+(?:은행|증권|캐피탈|저축은행|카드|생명|화재|신협|새마을금고|농협|수협|우체국))/g,
    );
    const creditor = creditorMatch?.at(-1) ?? "금융기관";
    mortgages.push({ creditor, amount });
  }

  const seniorDebt = mortgages.reduce((s, x) => s + x.amount, 0);

  const warnings: string[] = [];
  if (text.includes("가압류")) warnings.push("가압류 등기가 발견되었습니다");
  if (text.includes("가처분")) warnings.push("가처분 등기가 발견되었습니다");
  if (text.includes("경매개시")) warnings.push("경매개시결정 등기가 있습니다");
  if (text.includes("압류") && !text.includes("가압류")) {
    warnings.push("압류 등기가 발견되었습니다");
  }
  if (text.includes("전세권")) warnings.push("선순위 전세권이 설정되어 있습니다");

  return {
    owner,
    seniorDebt,
    mortgages,
    hasSeizure: warnings.some((w) => w.includes("가압류") || w.includes("압류")),
    hasAuction: warnings.some((w) => w.includes("경매")),
    ownershipTransferCount: 0,
    warnings,
  };
}

async function test() {
  if (!CLOVA_API_URL || !CLOVA_SECRET) {
    console.error("❌ CLOVA OCR API 키가 설정되지 않았습니다");
    return;
  }
  const testFilePath = path.join(__dirname, "../examples/법인등기부등본.pdf");

  if (!fs.existsSync(testFilePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${testFilePath}`);
    return;
  }

  console.log("📄 테스트 파일:", testFilePath);
  console.log("");

  // 1. Load file
  const fileBuffer = fs.readFileSync(testFilePath);
  const blob = new Blob([fileBuffer], { type: "application/pdf" });
  const file = new File([blob], "법인등기부등본.pdf", { type: "application/pdf" });

  console.log("1️⃣ CLOVA OCR API 호출 중...");
  const fullText = await callClovaOcr(file);
  console.log(`   ✅ 추출 완료! 텍스트 길이: ${fullText.length}자\n`);

  // 2. Parse text
  console.log("2️⃣ 텍스트 파싱 중...");
  const result = parseRegistrationText(fullText);
  console.log("");

  // 3. Display results
  console.log("📊 파싱 결과:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`🏢 소유자: ${result.owner}`);
  console.log(`💰 선순위채권: ${result.seniorDebt.toLocaleString()}만원`);
  console.log(`📋 근저당 ${result.mortgages.length}건:`);
  result.mortgages.forEach((m, i) => {
    console.log(`   ${i + 1}. ${m.creditor}: ${m.amount.toLocaleString()}만원`);
  });
  console.log("");
  console.log(`⚠️ 경고사항 ${result.warnings.length}건:`);
  if (result.warnings.length === 0) {
    console.log("   없음 ✅");
  } else {
    result.warnings.forEach((w) => console.log(`   - ${w}`));
  }
  console.log("");
  console.log(`🔨 경매 개시: ${result.hasAuction ? "예" : "아니오"}`);
  console.log(`🔒 압류/가압류: ${result.hasSeizure ? "예" : "아니오"}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

test().catch(console.error);
