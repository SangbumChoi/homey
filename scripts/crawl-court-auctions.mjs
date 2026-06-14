import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { dotDate, rowKey } from "./lib/court-rows.mjs";
import { dedupeRows, publishAuctionData } from "./lib/publish.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const startDate = process.env.AUCTION_START_DATE || dotDate(nowInSeoul);
const endDate = process.env.AUCTION_END_DATE || dotDate(endInSeoul);
const outputDir = path.join(root, "data", "auction-crawl");
const rawOutputPath = path.join(outputDir, "latest.json");
const publicDataDir = path.join(root, "auction-data");

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

async function writeOutputs(results, publish = false) {
	const allRows = [];
	for (const result of results) {
		for (const row of result.rows || []) allRows.push(row);
	}
	const rows = dedupeRows(allRows);
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

	if (publish) {
		const report = publishAuctionData(rows, {
			outDir: publicDataDir,
			collectedAt: payload.collectedAt,
			query: { startDate, endDate },
			rawPayload: payload,
		});
		console.log(
			`published ${report.total} rows — wrote ${report.written.length} sale-date file(s), ${report.cached.length} cache hit(s)`,
		);
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
			publicDataDir,
			total,
		},
		null,
		2,
	),
);
