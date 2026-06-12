import fs from "node:fs/promises";
import path from "node:path";
import { gzip } from "node:zlib";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { chromium } from "playwright";
import * as XLSX from "xlsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gzipAsync = promisify(gzip);
const courtAuctionUrl =
	"https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml";
const chromePath =
	process.env.CHROME_PATH ||
	"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const targetLimit = Number(process.env.CRAWL_TARGET_LIMIT || 0);
const waitBetweenTargets = Number(process.env.CRAWL_DELAY_MS || 3500);

const seoulDistricts = [
	"종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
	"성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
	"양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
	"서초구", "강남구", "송파구", "강동구",
];

const targets = [
	...seoulDistricts.map((district) => ({
		region: "서울",
		sido: "서울특별시",
		sigungu: district,
	})),
	...["성남시 수정구", "성남시 중원구", "성남시 분당구"].map((district) => ({
		region: district.replace("시 ", " "),
		sido: "경기도",
		sigungu: district,
	})),
].slice(0, targetLimit || undefined);

const nowInSeoul = new Date(
	new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
);
const endInSeoul = new Date(nowInSeoul);
endInSeoul.setDate(endInSeoul.getDate() + 14);

function dotDate(date) {
	return [
		date.getFullYear(),
		String(date.getMonth() + 1).padStart(2, "0"),
		String(date.getDate()).padStart(2, "0"),
	].join(".");
}

function isoDate(value) {
	const digits = String(value || "").replace(/\D/g, "");
	if (digits.length !== 8) return String(value || "");
	return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

function dateRange(start, end) {
	const dates = [];
	const [startYear, startMonth, startDay] = isoDate(start).split("-").map(Number);
	const [endYear, endMonth, endDay] = isoDate(end).split("-").map(Number);
	const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay));
	const last = new Date(Date.UTC(endYear, endMonth - 1, endDay));
	while (cursor <= last) {
		dates.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return dates;
}

const startDate = process.env.AUCTION_START_DATE || dotDate(nowInSeoul);
const endDate = process.env.AUCTION_END_DATE || dotDate(endInSeoul);
const crawlDate = isoDate(dotDate(nowInSeoul));
const outputDir = path.join(root, "data", "auction-crawl");
const rawOutputPath = path.join(outputDir, "latest.json");
const publicDataDir = path.join(root, "auction-data");
const archiveDir = path.join(publicDataDir, crawlDate);
const xlsxOutputPath = path.join(publicDataDir, "latest.xlsx");
const archiveXlsxPath = path.join(archiveDir, "seoul-seongnam-auctions.xlsx");
const archiveRawPath = path.join(archiveDir, "raw.json.gz");
const archiveMetadataPath = path.join(archiveDir, "metadata.json");
const latestRawPath = path.join(publicDataDir, "latest.json.gz");
const latestMetadataPath = path.join(publicDataDir, "latest-metadata.json");
const saleDateDir = path.join(archiveDir, "by-sale-date");
const saleDateIndexPath = path.join(archiveDir, "sale-date-index.json");

function parseJson(text) {
	try {
		return JSON.parse(String(text || "").trim());
	} catch {
		return null;
	}
}

async function selectLabel(page, id, label, settleMs = 900) {
	await page.locator(`#${id}`).selectOption({ label, timeout: 20000 });
	await page.waitForTimeout(settleMs);
}

async function fillInput(page, id, value) {
	const locator = page.locator(`#${id}`);
	await locator.fill(String(value), { timeout: 20000 });
	await locator.evaluate((element) => {
		element.dispatchEvent(new Event("input", { bubbles: true }));
		element.dispatchEvent(new Event("change", { bubbles: true }));
	});
}

function rowKey(row) {
	return row.docid || `${row.jiwonNm}|${row.srnSaNo}|${row.maemulSer}`;
}

async function waitForSearchResponse(page, action) {
	const responsePromise = page.waitForResponse(
		(response) => response.url().includes("/pgj/pgjsearch/searchControllerMain.on"),
		{ timeout: 30000 },
	);
	await action();
	const response = await responsePromise;
	const parsed = parseJson(await response.text());
	return {
		message: parsed?.message || "",
		pageInfo: parsed?.data?.dma_pageInfo || null,
		rows: parsed?.data?.dlt_srchResult || [],
	};
}

async function collectExtraPages(page, initial) {
	const unique = new Map(initial.rows.map((row) => [rowKey(row), row]));
	const total = Number(initial.pageInfo?.totalCnt || initial.rows.length);
	if (total <= initial.rows.length) return [...unique.values()];

	const pageSize = page.locator("#mf_wfm_mainFrame_sbx_pageSize");
	if (await pageSize.count()) {
		const enlarged = await waitForSearchResponse(page, () =>
			pageSize.selectOption("40"),
		).catch(() => null);
		for (const row of enlarged?.rows || []) unique.set(rowKey(row), row);
	}

	const pageCount = Math.ceil(total / 40);
	for (let pageNo = 2; pageNo <= pageCount; pageNo += 1) {
		const link = page
			.locator("#mf_wfm_mainFrame_pgl_gdsDtlSrchPage")
			.getByText(String(pageNo), { exact: true });
		if (!(await link.count())) break;
		const next = await waitForSearchResponse(page, () => link.first().click()).catch(
			() => null,
		);
		for (const row of next?.rows || []) unique.set(rowKey(row), row);
		await page.waitForTimeout(1000);
	}
	return [...unique.values()];
}

async function crawlTarget(target) {
	console.log(`start ${target.sido} ${target.sigungu}`);
	const browser = await chromium.launch({
		headless: process.env.HEADLESS !== "false",
		executablePath: chromePath,
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });

	try {
		await page.goto(courtAuctionUrl, {
			waitUntil: "domcontentloaded",
			timeout: 45000,
		});
		await page.waitForTimeout(4500);
		await page
			.locator("#mf_wfm_mainFrame_rad_rletSrchBtn_input_1")
			.check({ timeout: 20000, force: true });
		await fillInput(page, "mf_wfm_mainFrame_cal_rletPerdStr_input", startDate);
		await fillInput(page, "mf_wfm_mainFrame_cal_rletPerdEnd_input", endDate);
		await selectLabel(page, "mf_wfm_mainFrame_sbx_rletAdongSdS", target.sido, 1400);
		await selectLabel(page, "mf_wfm_mainFrame_sbx_rletAdongSggS", target.sigungu);

		const initial = await waitForSearchResponse(page, () =>
			page.locator("#mf_wfm_mainFrame_btn_gdsDtlSrch").click(),
		);
		await page.waitForTimeout(2000);
		const rows = await collectExtraPages(page, initial);
		console.log(
			`done ${target.sigungu} total=${initial.pageInfo?.totalCnt || rows.length} rows=${rows.length}`,
		);
		return { ...target, ...initial, rows };
	} catch (error) {
		console.error(`error ${target.sigungu}: ${error.message}`);
		return { ...target, error: error.message, rows: [] };
	} finally {
		await Promise.race([
			browser.close().catch(() => {}),
			new Promise((resolve) => setTimeout(resolve, 10000)),
		]);
	}
}

function areaFromRow(row) {
	const text = [row.areaList, row.pjbBuldList, row.convAddr].filter(Boolean).join(" ");
	const match = text.replaceAll(",", "").match(/(\d+(?:\.\d+)?)\s*㎡/);
	return match ? Number(match[1]) : 0;
}

function buildAddress(row) {
	const lot = [row.hjguSido, row.hjguSigu, row.hjguDong, row.srchHjguLotno]
		.filter(Boolean)
		.join(" ");
	const road = [row.rd1Nm, row.rd2Nm, row.rdNm, row.buldNo]
		.filter(Boolean)
		.join(" ");
	const base =
		row.addrGbncd === "R" && road
			? `${road} ${row.rdAddrSub || ""}`.trim()
			: [lot, row.buldNm].filter(Boolean).join(" ");
	return [base, row.buldList].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

function regionFor(row) {
	if (row.hjguSido === "서울특별시") return "서울";
	const district = String(row.hjguSigu || "").replace("성남시 ", "");
	return district ? `성남 ${district}` : "성남";
}

function toHomeyRow(row) {
	const area = areaFromRow(row);
	const appraisal = Number(row.gamevalAmt || 0);
	const minPrice = Number(row.minmaePrice || 0);
	const failCount = Number(row.yuchalCnt || 0);
	return {
		지역: regionFor(row),
		법원: row.jiwonNm || "",
		사건번호: `${row.jiwonNm || ""} ${row.srnSaNo || ""}`.trim(),
		물건번호: String(row.maemulSer || "1"),
		"주소/건물": buildAddress(row),
		"면적㎡": area,
		평: area ? Math.round((area / 3.305785) * 10) / 10 : 0,
		감정가_원: appraisal,
		최저가_원: minPrice,
		최저가율: appraisal ? Math.round((minPrice / appraisal) * 1000) / 10 : 0,
		유찰: failCount ? `유찰 ${failCount}회` : "신건",
		매각기일: isoDate(row.maeGiil),
		비고: row.mulBigo || "",
	};
}

function countRegions(rows) {
	const counts = { seoul: 0, seongnam: 0, seongnamDistricts: {} };
	for (const row of rows) {
		if (row.hjguSido === "서울특별시") counts.seoul += 1;
		if (row.hjguSido === "경기도" && String(row.hjguSigu).startsWith("성남시")) {
			counts.seongnam += 1;
			counts.seongnamDistricts[row.hjguSigu] =
				(counts.seongnamDistricts[row.hjguSigu] || 0) + 1;
		}
	}
	return counts;
}

async function updateReadme(metadata) {
	const readmePath = path.join(root, "README.md");
	const startMarker = "<!-- AUCTION-DOWNLOADS:START -->";
	const endMarker = "<!-- AUCTION-DOWNLOADS:END -->";
	const readme = await fs.readFile(readmePath, "utf8");
	const existingDates = await fs
		.readdir(publicDataDir, { withFileTypes: true })
		.catch(() => []);
	const dates = existingDates
		.filter((entry) => entry.isDirectory() && /^20\d{2}-\d{2}-\d{2}$/.test(entry.name))
		.map((entry) => entry.name)
		.sort()
		.reverse();
	const rows = dates.map(
		(date) =>
			`| ${date} | [Excel](auction-data/${date}/seoul-seongnam-auctions.xlsx) | [Raw JSON.gz](auction-data/${date}/raw.json.gz) | [Metadata](auction-data/${date}/metadata.json) |`,
	);
	const saleDateRows = metadata.saleDates.map(
		(item) =>
			`| ${item.saleDate} | ${item.total.toLocaleString("en-US")} | [Excel](auction-data/${metadata.crawlDate}/by-sale-date/${item.saleDate}.xlsx) |`,
	);
	const section = [
		startMarker,
		"### Public Auction Data Downloads",
		"",
		`Latest crawl: **${metadata.crawlDate}**, **${metadata.total.toLocaleString("en-US")} properties**`,
		"",
		"[Download latest Excel](auction-data/latest.xlsx) | [Download latest raw JSON.gz](auction-data/latest.json.gz) | [View latest metadata](auction-data/latest-metadata.json)",
		"",
		"| Crawl date | Excel | Full raw data | Metadata |",
		"|---|---|---|---|",
		...rows,
		"",
		"#### Latest Two-Week Window By Auction Date",
		"",
		"| Auction date | Properties | Excel |",
		"|---|---:|---|",
		...saleDateRows,
		endMarker,
	].join("\n");
	const markerPattern = new RegExp(
		`${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
	);
	const next = markerPattern.test(readme)
		? readme.replace(markerPattern, section)
		: `${readme.trimEnd()}\n\n---\n\n${section}\n`;
	await fs.writeFile(readmePath, next);
}

const detailHeaders = [
	"지역", "법원", "사건번호", "물건번호", "주소/건물", "면적㎡", "평",
	"감정가_원", "최저가_원", "최저가율", "유찰", "매각기일", "비고",
];

function buildWorkbook(rows, summaryRows) {
	const detail = XLSX.utils.json_to_sheet(rows.map(toHomeyRow), {
		header: detailHeaders,
	});
	detail["!autofilter"] = { ref: detail["!ref"] };
	detail["!cols"] = [
		{ wch: 12 }, { wch: 20 }, { wch: 32 }, { wch: 10 }, { wch: 70 },
		{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 12 },
		{ wch: 12 }, { wch: 14 }, { wch: 45 },
	];
	const summary = XLSX.utils.aoa_to_sheet([
		["항목", "값", "비고", "작성일"],
		...summaryRows,
	]);
	summary["!cols"] = [{ wch: 16 }, { wch: 28 }, { wch: 48 }, { wch: 14 }];
	const workbook = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(workbook, detail, "경매목록");
	XLSX.utils.book_append_sheet(workbook, summary, "요약");
	return workbook;
}

async function writeOutputs(results, publish = false) {
	const uniqueRows = new Map();
	for (const result of results) {
		for (const row of result.rows || []) uniqueRows.set(rowKey(row), row);
	}
	const rows = [...uniqueRows.values()].sort(
		(a, b) =>
			String(a.maeGiil).localeCompare(String(b.maeGiil)) ||
			rowKey(a).localeCompare(rowKey(b)),
	);
	const payload = {
		collectedAt: new Date().toISOString(),
		query: {
			startDate,
			endDate,
			locations: targets,
			filters: "location only; no price, area, or property-type limit",
		},
		total: rows.length,
		results,
		rows,
	};
	await fs.mkdir(outputDir, { recursive: true });
	await fs.writeFile(rawOutputPath, JSON.stringify(payload, null, 2));

	const workbook = buildWorkbook(rows, [
		["조회 지역", "서울특별시 + 성남시", "서울 25개 구, 성남 3개 구", isoDate(dotDate(nowInSeoul))],
		["조회 기간", `${startDate} ~ ${endDate}`, "법원 사이트가 허용하는 rolling window", ""],
		["필터", "지역만 적용", "가격·면적·물건종류 제한 없음", ""],
		["총 물건 수", rows.length, "중복 제거 후", ""],
	]);
	if (publish) {
		const saleDates = dateRange(startDate, endDate).map((saleDate) => {
			const saleRows = rows.filter((row) => isoDate(row.maeGiil) === saleDate);
			return {
				saleDate,
				total: saleRows.length,
				...countRegions(saleRows),
				rows: saleRows,
			};
		});
		const metadata = {
			crawlDate,
			collectedAt: payload.collectedAt,
			queryStartDate: startDate,
			queryEndDate: endDate,
			total: rows.length,
			...countRegions(rows),
			saleDates: saleDates.map(({ rows: _rows, ...item }) => item),
			failedLocations: results
				.filter((result) => result.error)
				.map((result) => ({ location: result.sigungu, error: result.error })),
		};
		const rawJson = JSON.stringify(payload);
		const compressedRaw = await gzipAsync(rawJson, { level: 9 });
		await fs.mkdir(archiveDir, { recursive: true });
		await fs.mkdir(publicDataDir, { recursive: true });
		await fs.rm(saleDateDir, { recursive: true, force: true });
		await fs.mkdir(saleDateDir, { recursive: true });
		XLSX.writeFile(workbook, archiveXlsxPath);
		XLSX.writeFile(workbook, xlsxOutputPath);
		for (const item of saleDates) {
			const saleWorkbook = buildWorkbook(item.rows, [
				["매각기일", item.saleDate, "해당 날짜에 예정된 물건", crawlDate],
				["조회 지역", "서울특별시 + 성남시", "서울 25개 구, 성남 3개 구", ""],
				["필터", "지역만 적용", "가격·면적·물건종류 제한 없음", ""],
				["총 물건 수", item.total, "중복 제거 후", ""],
			]);
			XLSX.writeFile(saleWorkbook, path.join(saleDateDir, `${item.saleDate}.xlsx`));
		}
		await fs.writeFile(archiveRawPath, compressedRaw);
		await fs.writeFile(latestRawPath, compressedRaw);
		await fs.writeFile(archiveMetadataPath, JSON.stringify(metadata, null, 2));
		await fs.writeFile(latestMetadataPath, JSON.stringify(metadata, null, 2));
		await fs.writeFile(saleDateIndexPath, JSON.stringify(metadata.saleDates, null, 2));
		await updateReadme(metadata);
	}
	return rows.length;
}

async function loadCheckpoint() {
	if (process.env.CRAWL_RESUME === "false") return [];
	try {
		const checkpoint = JSON.parse(await fs.readFile(rawOutputPath, "utf8"));
		if (
			checkpoint.query?.startDate !== startDate ||
			checkpoint.query?.endDate !== endDate
		) {
			return [];
		}
		return checkpoint.results || [];
	} catch {
		return [];
	}
}

const results = await loadCheckpoint();
const completed = new Set(
	results.filter((result) => !result.error).map((result) => `${result.sido}|${result.sigungu}`),
);
for (const target of targets) {
	if (completed.has(`${target.sido}|${target.sigungu}`)) {
		console.log(`skip ${target.sido} ${target.sigungu} (checkpoint)`);
		continue;
	}
	results.push(await crawlTarget(target));
	await writeOutputs(results, false);
	await new Promise((resolve) => setTimeout(resolve, waitBetweenTargets));
}

const failures = results.filter((result) => result.error);
if (failures.length) {
	await writeOutputs(results, false);
	throw new Error(
		`Crawl incomplete; not publishing. Failed locations: ${failures
			.map((result) => result.sigungu)
			.join(", ")}`,
	);
}

const total = await writeOutputs(results, true);
console.log(
	JSON.stringify(
		{
			rawOutputPath,
			xlsxOutputPath,
			archiveDir,
			total,
		},
		null,
		2,
	),
);
