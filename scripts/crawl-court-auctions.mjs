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

async function waitForSearchResponse(page, action, timeout = 30000) {
	const responsePromise = page.waitForResponse(
		(response) => response.url().includes("/pgj/pgjsearch/searchControllerMain.on"),
		{ timeout },
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

const pagerSel = "#mf_wfm_mainFrame_pgl_gdsDtlSrchPage";
// 페이지 번호 줄(1~10) 아래의 '다음(그룹/페이지)' 버튼. 끝(control_last)은 안 써요.
const nextBtnSel =
	"a.w2pageList_control_next, a[class*='control_next'], a[title*='다음'], a[aria-label*='다음']";

/** 페이지 크기를 옵션 최댓값으로 키워요(클릭 수↓). { size, result } */
async function maximizePageSize(page) {
	const sel = page.locator("#mf_wfm_mainFrame_sbx_pageSize");
	if (!(await sel.count())) return { size: 0, result: null };
	const labels = await sel.locator("option").allInnerTexts().catch(() => []);
	const nums = labels
		.map((t) => Number(String(t).replace(/\D/g, "")))
		.filter((n) => n > 0);
	if (!nums.length) return { size: 0, result: null };
	const max = Math.max(...nums);
	const result = await waitForSearchResponse(page, () =>
		sel.selectOption(String(max)),
	).catch(() => null);
	await page.waitForTimeout(500);
	return { size: max, result };
}

/** 현재 검색조건으로 1페이지 검색 */
async function searchOnce(page) {
	const res = await waitForSearchResponse(page, () =>
		page.locator("#mf_wfm_mainFrame_btn_gdsDtlSrch").click(),
	);
	await page.waitForTimeout(700);
	return res;
}

async function setDateRange(page, start, end) {
	await fillInput(page, "mf_wfm_mainFrame_cal_rletPerdStr_input", start);
	await fillInput(page, "mf_wfm_mainFrame_cal_rletPerdEnd_input", end);
}

/**
 * 보이는 페이지 번호(1~10)를 모두 누른 뒤 '다음' 버튼으로 다음 묶음을 펼치고,
 * 끝(다음 버튼 비활성/소멸 또는 진전 없음)까지 반복해 전부 모아요.
 */
async function paginateAll(page, initial, size) {
	const unique = new Map(initial.rows.map((row) => [rowKey(row), row]));
	const total = Number(initial.pageInfo?.totalCnt || initial.rows.length);
	const per = size || initial.rows.length || 40;
	const pager = page.locator(pagerSel);
	const visited = new Set();
	const maxGuard = Math.ceil(total / per) + 30;

	for (let guard = 0; unique.size < total && guard < maxGuard; guard += 1) {
		const before = unique.size;

		// 현재 묶음의 숫자 페이지를 모두 눌러서 수집 (이미 방문한 번호/현재 페이지는 건너뜀)
		const numbers = await pager
			.locator("a")
			.filter({ hasText: /^\s*\d+\s*$/ })
			.allInnerTexts()
			.catch(() => []);
		for (const raw of numbers) {
			const label = raw.trim();
			if (visited.has(label)) continue;
			visited.add(label);
			// 현재 페이지를 다시 누르면 응답이 없을 수 있어 짧게 기다리고 넘어가요.
			const res = await waitForSearchResponse(
				page,
				() => pager.getByText(label, { exact: true }).first().click(),
				7000,
			).catch(() => null);
			if (res) for (const row of res.rows) unique.set(rowKey(row), row);
			await page.waitForTimeout(150);
		}

		// 다음 묶음으로
		const next = page.locator(nextBtnSel).first();
		if (!(await next.count())) break;
		const disabled = await next
			.evaluate(
				(el) =>
					el.getAttribute("aria-disabled") === "true" ||
					/disabled/i.test(el.className) ||
					el.getAttribute("disabled") != null,
			)
			.catch(() => false);
		if (disabled) break;
		const moved = await waitForSearchResponse(page, () => next.click(), 12000).catch(
			() => null,
		);
		if (moved) for (const row of moved.rows) unique.set(rowKey(row), row);
		if (unique.size === before) break; // 더 이상 진전 없음
	}

	if (unique.size < total) {
		console.warn(`  ⚠ 페이지네이션 누락 가능 — ${unique.size}/${total}`);
	}
	return { rows: [...unique.values()], total };
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
		await setDateRange(page, startDate, endDate);
		await selectLabel(page, "mf_wfm_mainFrame_sbx_rletAdongSdS", target.sido, 1400);
		if (target.sigungu) {
			await selectLabel(page, "mf_wfm_mainFrame_sbx_rletAdongSggS", target.sigungu);
		} else {
			await selectSigunguAll(page);
		}

		// 전체 기간을 검색하고, 페이지 크기를 최대로 키운 뒤 '다음' 버튼으로 끝까지 모아요.
		const first = await searchOnce(page);
		let size = 0;
		let base = first;
		if (Number(first.pageInfo?.totalCnt || 0) > first.rows.length) {
			const enlarged = await maximizePageSize(page);
			if (enlarged.result) {
				base = enlarged.result;
				size = enlarged.size;
			}
		}
		const collected = await paginateAll(page, base, size);

		const rows = collected.rows;
		const short = rows.length < collected.total ? ` (기대 ${collected.total})` : "";
		console.log(`done ${target.sido} ${where} rows=${rows.length}${short}`);
		return { ...target, rows };
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
