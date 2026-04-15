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

async function testClovaOcr() {
  if (!CLOVA_API_URL || !CLOVA_SECRET) {
    console.error("❌ CLOVA OCR API 키가 설정되지 않았습니다");
    console.log("VITE_CLOVA_OCR_API_URL:", CLOVA_API_URL ? "✓" : "✗");
    console.log("VITE_CLOVA_OCR_SECRET_KEY:", CLOVA_SECRET ? "✓" : "✗");
    return;
  }

  console.log("✓ API URL:", CLOVA_API_URL);
  console.log("✓ Secret Key:", CLOVA_SECRET.substring(0, 10) + "***");

  // 테스트용 이미지 파일 경로 (인수로 받거나 기본값 사용)
  const testFilePath = process.argv[2];
  if (!testFilePath) {
    console.log("\n사용법: npx tsx scripts/test-clova-ocr.ts <파일경로>");
    console.log("예: npx tsx scripts/test-clova-ocr.ts ./test-image.jpg");
    return;
  }

  if (!fs.existsSync(testFilePath)) {
    console.error(`❌ 파일을 찾을 수 없습니다: ${testFilePath}`);
    return;
  }

  console.log(`\n📄 테스트 파일: ${testFilePath}`);

  const fileBuffer = fs.readFileSync(testFilePath);
  const base64Data = fileBuffer.toString("base64");

  const ext = path.extname(testFilePath).toLowerCase().slice(1);
  const format = ["jpg", "jpeg", "png", "gif", "bmp"].includes(ext) ? ext : "jpg";

  console.log(`📋 파일 형식: ${format}, 크기: ${fileBuffer.length} bytes`);

  const messageBody = JSON.stringify({
    version: "V2",
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    images: [{ format, name: "test", data: base64Data }],
  });

  console.log("\n🔄 CLOVA OCR API 호출 중...");

  try {
    const ocrRes = await fetch(CLOVA_API_URL, {
      method: "POST",
      headers: {
        "X-OCR-SECRET": CLOVA_SECRET,
        "Content-Type": "application/json",
      },
      body: messageBody,
    });

    console.log(`📊 응답 상태: ${ocrRes.status}`);

    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      console.error(`❌ OCR 오류: ${errText}`);
      return;
    }

    const ocrData = await ocrRes.json();

    const fullText: string = (ocrData.images ?? [])
      .flatMap((img: { fields?: { inferText: string }[] }) =>
        (img.fields ?? []).map((f) => f.inferText)
      )
      .join(" ");

    console.log(`\n✅ 성공! 추출된 텍스트 길이: ${fullText.length}자`);
    console.log("\n📝 추출된 텍스트:");
    console.log(fullText.slice(0, 500) + (fullText.length > 500 ? "..." : ""));
  } catch (err) {
    console.error(`❌ 요청 실패: ${err}`);
  }
}

testClovaOcr();
