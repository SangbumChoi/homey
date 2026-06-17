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

/**
 * 수집 범위. 기본은 현행 서울+성남(시군구 단위), 검증 후 nationwide로 전환해요.
 *   CRAWL_SCOPE=nationwide → 전국을 시도 단위로 (시군구 전체)
 */
const scope = (process.env.CRAWL_SCOPE || "seoul-seongnam").toLowerCase();

const seoulDistricts = [
	"종로구", "중구", "용산구", "성동구", "광진구", "동대문구", "중랑구",
	"성북구", "강북구", "도봉구", "노원구", "은평구", "서대문구", "마포구",
	"양천구", "강서구", "구로구", "금천구", "영등포구", "동작구", "관악구",
	"서초구", "강남구", "송파구", "강동구",
];

/**
 * 전국 시도 — 드롭다운(sbx_rletAdongSdS) 라벨과 정확히 일치해야 해요.
 * 자치도 명칭(강원/전북/제주)은 사이트 표기에 맞춰 맥 검증 때 조정하세요.
 */
const NATIONWIDE_SIDO = [
	"서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시",
	"대전광역시", "울산광역시", "세종특별자치시", "경기도", "강원특별자치도",
	"충청북도", "충청남도", "전북특별자치도", "전라남도", "경상북도",
	"경상남도", "제주특별자치도",
];

/** scope에 따른 검색 타깃 목록 (sigungu=null이면 시군구 '전체'로 시도 전체 검색) */
function buildTargets() {
	if (scope === "nationwide") {
		return NATIONWIDE_SIDO.map((sido) => ({ sido, sigungu: null }));
	}
	return [
		...seoulDistricts.map((sigungu) => ({ sido: "서울특별시", sigungu })),
		...["성남시 수정구", "성남시 중원구", "성남시 분당구"].map((sigungu) => ({
			sido: "경기도",
			sigungu,
		})),
	];
}

const targets = buildTargets().slice(0, targetLimit || undefined);

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

/** 시군구를 '전체'로 — 시도 전체를 한 번에 검색해요 (없으면 첫 옵션) */
async function selectSigunguAll(page) {
	const sel = page.locator("#mf_wfm_mainFrame_sbx_rletAdongSggS");
	await sel
		.selectOption({ label: "전체" }, { timeout: 8000 })
		.catch(() => sel.selectOption({ index: 0 }));
	await page.waitForTimeout(900);
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

/** 페이지 크기 옵션 중 가장 큰 값으로 키워요 (페이지 수를 줄여 누락 위험 ↓) */
async function maximizePageSize(page) {
	const sel = page.locator("#mf_wfm_mainFrame_sbx_pageSize");
	if (!(await sel.count())) return null;
	const labels = await sel.locator("option").allInnerTexts().catch(() => []);
	const nums = labels
		.map((t) => Number(String(t).replace(/\D/g, "")))
		.filter((n) => n > 0);
	if (!nums.length) return null;
	const max = Math.max(...nums);
	const res = await waitForSearchResponse(page, () =>
		sel.selectOption(String(max)),
	).catch(() => null);
	return res ? { rows: res.rows, size: max } : null;
}

/**
 * pageNo 페이지로 이동해 그 페이지의 행을 반환해요.
 * 번호 링크가 현재 그룹에 없으면 '다음(»)' 버튼으로 다음 그룹을 펼친 뒤 다시 찾아요.
 */
async function goToPage(page, pageNo) {
	const pager = page.locator("#mf_wfm_mainFrame_pgl_gdsDtlSrchPage");
	let link = pager.getByText(String(pageNo), { exact: true });
	if (!(await link.count())) {
		const next = pager.locator("a, button").filter({ hasText: /다음|»|＞|>|next/i });
		if (await next.count()) {
			await waitForSearchResponse(page, () => next.last().click()).catch(() => {});
			await page.waitForTimeout(600);
			link = pager.getByText(String(pageNo), { exact: true });
		}
	}
	if (!(await link.count())) return null;
	const res = await waitForSearchResponse(page, () => link.first().click()).catch(
		() => null,
	);
	return res?.rows ?? null;
}

async function collectExtraPages(page, initial) {
	const unique = new Map(initial.rows.map((row) => [rowKey(row), row]));
	const total = Number(initial.pageInfo?.totalCnt || initial.rows.length);
	if (total <= unique.size) return [...unique.values()];

	let size = initial.rows.length || 40;
	const enlarged = await maximizePageSize(page);
	if (enlarged) {
		for (const row of enlarged.rows) unique.set(rowKey(row), row);
		size = enlarged.size;
	}

	const pageCount = Math.ceil(total / size);
	const maxPages = Number(process.env.CRAWL_MAX_PAGES || pageCount);
	for (let pageNo = 2; pageNo <= Math.min(pageCount, maxPages); pageNo += 1) {
		const before = unique.size;
		const rows = await goToPage(page, pageNo);
		if (rows == null) break; // 다음 그룹 이동 실패 — 더 못 감
		for (const row of rows) unique.set(rowKey(row), row);
		if (unique.size === before) break; // 진전이 없으면 중단
		await page.waitForTimeout(800);
	}

	if (unique.size < total) {
		console.warn(
			`  ⚠ 페이지네이션 누락 가능 — 수집 ${unique.size}/${total} (다음그룹 이동 실패 또는 CRAWL_MAX_PAGES 상한)`,
		);
	}
	return [...unique.values()];
}

async function crawlTarget(target) {
	const where = target.sigungu ?? "전체";
	console.log(`start ${target.sido} ${where}`);
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
		if (target.sigungu) {
			await selectLabel(page, "mf_wfm_mainFrame_sbx_rletAdongSggS", target.sigungu);
		} else {
			await selectSigunguAll(page);
		}

		const initial = await waitForSearchResponse(page, () =>
			page.locator("#mf_wfm_mainFrame_btn_gdsDtlSrch").click(),
		);
		await page.waitForTimeout(2000);
		const rows = await collectExtraPages(page, initial);
		console.log(
			`done ${target.sido} ${where} total=${initial.pageInfo?.totalCnt || rows.length} rows=${rows.length}`,
		);
		return { ...target, ...initial, rows };
	} catch (error) {
		console.error(`error ${target.sido} ${where}: ${error.message}`);
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
		console.log(`skip ${target.sido} ${target.sigungu ?? "전체"} (checkpoint)`);
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
			.map((result) => `${result.sido} ${result.sigungu ?? "전체"}`)
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
