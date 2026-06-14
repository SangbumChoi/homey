// 캡처된 법원경매 원본 응답(raw.json[.gz]) → auction-data/ 캐시 구조 재생성.
//
// 라이브 크롤(크롬+한국망)을 돌릴 수 없는 환경에서도, 수집해 둔 raw 응답으로
// 매각기일별 캐시 + latest.xlsx를 그대로 만들 수 있어요. 크롤러와 같은
// 발행 로직(lib/publish)을 써서 형식·캐시 동작이 동일해요.
//
// 사용법:
//   node scripts/raw-to-xlsx.mjs [raw.json(.gz)] [outDir]
//   예) node scripts/raw-to-xlsx.mjs auction-data/latest.json.gz auction-data
import fs from "node:fs";
import zlib from "node:zlib";
import { dedupeRows, publishAuctionData } from "./lib/publish.mjs";

const input = process.argv[2] || "auction-data/latest.json.gz";
const outDir = process.argv[3] || "auction-data";

const buf = fs.readFileSync(input);
const text = input.endsWith(".gz")
	? zlib.gunzipSync(buf).toString("utf8")
	: buf.toString("utf8");
const payload = JSON.parse(text);

const rawRows =
	payload.rows ?? (payload.results || []).flatMap((r) => r.rows || []);
const rows = dedupeRows(rawRows);

const report = publishAuctionData(rows, {
	outDir,
	collectedAt: payload.collectedAt,
	query: payload.query,
	rawPayload: payload,
});

console.log(`✓ ${report.total}건 발행 → ${outDir}/`);
console.log(`  새로 쓴 매각기일: ${report.written.length}개`);
console.log(`  캐시 히트(건너뜀): ${report.cached.length}개`);
if (report.written.length) console.log(`   · ${report.written.join(", ")}`);
