const CLOVA_API_URL = import.meta.env.VITE_CLOVA_OCR_API_URL ?? "";
const CLOVA_SECRET = import.meta.env.VITE_CLOVA_OCR_SECRET_KEY ?? "";

export interface ClovaOcrResponse {
  images: Array<{
    fields: Array<{ inferText: string }>;
  }>;
}

export async function callClovaOcr(file: File): Promise<string> {
  if (!CLOVA_API_URL || !CLOVA_SECRET) {
    throw new Error("CLOVA OCR API 키가 설정되지 않았습니다");
  }

  const fileBytes = await file.arrayBuffer();
  if (fileBytes.byteLength === 0) {
    throw new Error("파일 내용이 비어있습니다");
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
  const format = ext === "pdf" ? "pdf" : "jpg";

  const uint8 = new Uint8Array(fileBytes);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    binary += String.fromCharCode(...uint8.subarray(i, i + chunkSize));
  }
  const base64Data = btoa(binary);

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

  const ocrData: ClovaOcrResponse = await ocrRes.json();

  const fullText: string = (ocrData.images ?? [])
    .flatMap((img) => (img.fields ?? []).map((f) => f.inferText))
    .join(" ");

  return fullText;
}
