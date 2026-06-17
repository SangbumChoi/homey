// 앱 스토어/앱인토스 등록용 스크린샷·썸네일 생성기
// Pretendard(jsDelivr CDN) + Playwright Chromium 으로 정확한 픽셀 크기 PNG 를 렌더해요.
//   세로형 3장 636x1048 / 가로형 1장 1504x741 / 썸네일 1942x828
// 참고: pretendard 는 폰트 전용 패키지(JS 진입점 없음)라 npm 의존성으로 두면
//   AIT(RN) 빌드의 버전 수집 플러그인이 'import pretendard' 해석에 실패해요.
//   그래서 의존성에서 빼고, 이 스크립트만 CDN 으로 폰트를 받아요.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "brand/store");
mkdirSync(OUT, { recursive: true });

const F = (w) =>
	`https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff2/Pretendard-${w}.woff2`;
const LOGO = `file://${ROOT}/brand/logo-base-light.png`;

const fontFace = `
@font-face{font-family:Pretendard;font-weight:400;src:url('${F("Regular")}') format('woff2')}
@font-face{font-family:Pretendard;font-weight:500;src:url('${F("Medium")}') format('woff2')}
@font-face{font-family:Pretendard;font-weight:600;src:url('${F("SemiBold")}') format('woff2')}
@font-face{font-family:Pretendard;font-weight:700;src:url('${F("Bold")}') format('woff2')}
@font-face{font-family:Pretendard;font-weight:800;src:url('${F("ExtraBold")}') format('woff2')}
@font-face{font-family:Pretendard;font-weight:900;src:url('${F("Black")}') format('woff2')}
`;

const base = (w, h, body, extra = "") => `<!doctype html><html><head><meta charset="utf-8"><style>
${fontFace}
*{margin:0;padding:0;box-sizing:border-box;font-family:Pretendard,sans-serif;-webkit-font-smoothing:antialiased}
html,body{width:${w}px;height:${h}px;overflow:hidden}
.ink{color:#111}
.shadow{box-shadow:6px 6px 0 #111}
.shadow-sm{box-shadow:4px 4px 0 #111}
${extra}
</style></head><body>${body}</body></html>`;

/* ── 공통 UI 조각 ─────────────────────────────── */
// 가격 분포 면적 그래프 (대표 분포)
const distChart = () => {
	const pts = [78, 70, 60, 44, 30, 22, 16, 24, 33, 40, 52, 63, 70, 74, 80];
	const W = 300,
		H = 96,
		n = pts.length;
	const coords = pts.map((p, i) => `${((i + 0.5) / n) * W},${p}`);
	const area = `M0,${H} L${coords.join(" L")} L${W},${H} Z`;
	const medX = ((6.1 - 2) / (13 - 2)) * W; // 중앙값 ≈ 6.1억
	const meanX = ((7.2 - 2) / (13 - 2)) * W;
	return `
	<div style="background:#fff;border:2.5px solid #111;border-radius:16px;padding:16px 14px 12px">
		<svg width="100%" height="96" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="display:block;overflow:visible">
			<path d="${area}" fill="#B6F09C"/>
			<polyline points="${coords.join(" ")}" fill="none" stroke="#111" stroke-width="2.5" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
			<line x1="0" y1="${H}" x2="${W}" y2="${H}" stroke="#111" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
			<line x1="${medX}" y1="0" x2="${medX}" y2="${H}" stroke="#F44336" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
			<line x1="${meanX}" y1="0" x2="${meanX}" y2="${H}" stroke="#1E88E5" stroke-width="2.5" stroke-dasharray="4 3" vector-effect="non-scaling-stroke"/>
		</svg>
		<div style="display:flex;justify-content:space-between;margin-top:8px">
			${[2, 4, 7, 10, 13].map((t) => `<span style="font-size:12px;color:#8C8576;font-weight:600">${t}</span>`).join("")}
		</div>
		<div style="font-size:12px;color:#8C8576;margin-top:9px;display:flex;flex-wrap:wrap;gap:3px 9px;align-items:center;font-weight:600">
			<span><span style="display:inline-block;width:14px;border-top:2.5px solid #F44336;vertical-align:middle;margin-right:4px"></span>중앙값 6억 1000만</span>
			<span><span style="display:inline-block;width:14px;border-top:2.5px dashed #1E88E5;vertical-align:middle;margin-right:4px"></span>평균 7억 2000만</span>
		</div>
	</div>`;
};

const statCard = (v, unit, label, bg) => `
	<div style="flex:1;border:2.5px solid #111;border-radius:14px;background:${bg};padding:14px 0;text-align:center">
		<div style="font-size:26px;font-weight:900;color:#111;letter-spacing:-1px">${v}<span style="font-size:14px;font-weight:800;margin-left:2px">${unit}</span></div>
		<div style="font-size:12px;font-weight:700;color:#555;margin-top:4px">${label}</div>
	</div>`;

const tabbar = (active) => {
	const tabs = [
		["홈", "M4 10L12 4l8 6v9a1 1 0 01-1 1H5a1 1 0 01-1-1z M9 20v-6h6v6"],
		["경매", "M14 4l6 6 M11 7l6 6 M12.5 5.5l4-1.5 3.5 3.5-1.5 4z M11.5 9.5L4 17l3 3 7.5-7.5"],
		["관심", "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"],
		["기록", "M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4"],
	];
	return `<div style="display:flex;background:#fff;border-top:2.5px solid #111;margin-top:auto">
		${tabs
			.map(([label, d], i) => {
				const on = label === active;
				const c = on ? "#111" : "#B7B0A0";
				return `<div style="flex:1;padding:11px 0 9px;display:flex;flex-direction:column;align-items:center;gap:3px">
				<svg width="22" height="22" viewBox="0 0 24 24" fill="${label === "관심" && on ? c : "none"}" stroke="${c}" stroke-width="${on ? 2.2 : 1.8}" stroke-linecap="round" stroke-linejoin="round">${d
					.split(" M")
					.map((seg, k) => `<path d="${k ? "M" + seg : seg}"/>`)
					.join("")}</svg>
				<span style="font-size:11px;font-weight:${on ? 900 : 600};color:${c}">${label}</span>
			</div>`;
			})
			.join("")}
	</div>`;
};

// 휴대폰 화면 카드
const phone = (inner, h = 700) => `
	<div style="width:472px;height:${h}px;margin:0 auto;border:3px solid #111;border-radius:30px;background:#FFFBEF;overflow:hidden;display:flex;flex-direction:column" class="shadow">
		${inner}
	</div>`;

// 세로형 공통 (헤더 + 폰)
const portrait = (bg, shapes, tagBg, tag, title, sub, inner) =>
	base(
		636,
		1048,
		`<div style="width:636px;height:1048px;background:${bg};position:relative;overflow:hidden">
			${shapes}
			<div style="position:relative;padding:60px 46px 0">
				<span style="display:inline-block;background:${tagBg};border:2.5px solid #111;border-radius:999px;padding:6px 16px;font-size:16px;font-weight:800;color:#111" class="shadow-sm">${tag}</span>
				<h1 style="font-size:46px;font-weight:900;color:#111;letter-spacing:-1.8px;line-height:1.12;margin-top:20px;white-space:pre-line">${title}</h1>
				<p style="font-size:19px;font-weight:600;color:#3D3A33;margin-top:14px;line-height:1.45">${sub}</p>
			</div>
			<div style="position:relative;margin-top:34px">${phone(inner)}</div>
		</div>`,
	);

/* ── 세로형 1 · 홈 대시보드 ───────────────────── */
const p1 = portrait(
	"#FFD43B",
	`<div style="position:absolute;top:-70px;right:-60px;width:230px;height:230px;border-radius:50%;background:#B6F09C;border:3px solid #111"></div>
	 <div style="position:absolute;bottom:-50px;left:-40px;width:150px;height:150px;border-radius:30px;background:#FF6B6B;border:3px solid #111;transform:rotate(12deg)"></div>`,
	"#fff",
	"홈 · 대시보드",
	"이번 주 경매를\n한눈에 봐요",
	"기일·가격 분포·관심 물건을 홈에서 바로 확인해요.",
	`<div style="padding:20px 18px 0;display:flex;flex-direction:column;height:100%">
		<div style="display:inline-block;background:#B6F09C;border:2.5px solid #111;padding:3px 11px;font-size:12px;font-weight:900;transform:rotate(-2deg);align-self:flex-start" class="shadow-sm">오늘 6월 15일</div>
		<div style="font-size:25px;font-weight:900;letter-spacing:-1px;margin-top:14px">오늘의 경매 ⚡</div>
		<div style="display:flex;gap:10px;margin-top:16px">
			${statCard("1,944", "건", "진행 물건", "#fff")}
			${statCard("553", "건", "이번 주 기일", "#FFD43B")}
			${statCard("12", "건", "관심 물건", "#fff")}
		</div>
		<div style="font-size:15px;font-weight:800;margin:22px 0 10px">가격 분포</div>
		${distChart()}
		<div style="font-size:15px;font-weight:800;margin:18px 0 10px">매각기일 분포</div>
		<div style="display:flex;align-items:flex-end;gap:7px;height:64px;padding:0 2px">
			${[40, 64, 52, 28, 60, 22]
				.map(
					(hh, i) =>
						`<div style="flex:1;height:${hh}px;background:${["#FF6B6B", "#FFD43B", "#FFD43B", "#B6F09C", "#B6F09C", "#B6F09C"][i]};border:2.5px solid #111;border-radius:6px"></div>`,
				)
				.join("")}
		</div>
		${tabbar("홈")}
	</div>`,
);

/* ── 세로형 2 · 경매 탐색/필터 ─────────────────── */
const chip = (t, on) =>
	`<span style="display:inline-flex;align-items:center;padding:8px 14px;border-radius:18px;border:2.5px solid #111;background:${on ? "#FFD43B" : "#fff"};font-size:14px;font-weight:800;white-space:nowrap">${t}</span>`;

const TIER_BG = { danger: "#FF6B6B", warn: "#FFD43B", info: "#E7E3D8" };
const TIER_FG = { danger: "#111", warn: "#111", info: "#5E584A" };
const condBadge = ([label, tier]) =>
	`<span style="font-size:11px;font-weight:900;color:${TIER_FG[tier]};background:${TIER_BG[tier]};border:2px solid #111;border-radius:7px;padding:2px 7px;white-space:nowrap">${label}</span>`;
const auctionRow = (addr, area, price, rate, dday, ddayColor, first, badges = []) => `
	<div style="display:flex;align-items:center;gap:12px;padding:15px 4px;border-top:${first ? "none" : "1.5px solid #EFEce4"}">
		<div style="flex:1;min-width:0">
			<div style="font-size:16px;font-weight:800;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${addr}</div>
			<div style="font-size:13px;color:#6b6657;margin-top:4px">${area} · 최저가율 ${rate}%</div>
			<div style="font-size:16px;font-weight:900;color:#111;margin-top:5px;display:flex;align-items:center;flex-wrap:wrap;gap:7px"><span>${price}</span>${badges.map(condBadge).join("")}</div>
		</div>
		<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px">
			<span style="background:${ddayColor};border:2.5px solid #111;border-radius:999px;padding:3px 10px;font-size:13px;font-weight:900">${dday}</span>
			<svg width="22" height="22" viewBox="0 0 24 24" fill="${first ? "#FFD43B" : "none"}" stroke="#111" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>
		</div>
	</div>`;

const p2 = portrait(
	"#B6F09C",
	`<div style="position:absolute;top:-60px;left:-50px;width:200px;height:200px;border-radius:50%;background:#FFD43B;border:3px solid #111"></div>
	 <div style="position:absolute;bottom:60px;right:-55px;width:160px;height:160px;border-radius:30px;background:#fff;border:3px solid #111;transform:rotate(-10deg)"></div>`,
	"#fff",
	"경매 · 탐색",
	"원하는 물건만\n빠르게 추려요",
	"지역·가격·면적 칩 필터와 정렬로 좁혀봐요.",
	`<div style="padding:20px 18px 0;display:flex;flex-direction:column;height:100%">
		<div style="display:flex;align-items:center;gap:10px;border:2.5px solid #111;border-radius:14px;background:#fff;padding:12px 14px">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
			<span style="font-size:15px;color:#9a9485;font-weight:600">주소·법원으로 검색</span>
		</div>
		<div style="display:flex;gap:8px;margin-top:14px;overflow:hidden">
			${chip("6억 이하", true)}${chip("25~35평", false)}${chip("신건만", false)}${chip("유찰", false)}
		</div>
		<div style="margin-top:8px;border:2.5px solid #111;border-radius:16px;background:#fff;padding:4px 14px">
			${auctionRow("강남구 역삼동 ○○아파트", "84.9㎡ · 25.7평", "최저가 8억 4,800만", 64, "D-3", "#FF6B6B", true, [["일괄매각", "info"]])}
			${auctionRow("송파구 잠실동 △△빌라", "59.8㎡ · 18.1평", "최저가 5억 1,200만", 80, "D-9", "#FFD43B", false, [["지분", "danger"]])}
			${auctionRow("성남 분당구 정자동 □□", "101.2㎡ · 30.6평", "최저가 9억 7,000만", 72, "D-14", "#B6F09C", false, [["제시외 건물", "warn"]])}
		</div>
		<div style="display:flex;justify-content:flex-end;margin-top:12px">
			<span style="border:2.5px solid #111;border-radius:12px;background:#FFD43B;padding:8px 14px;font-size:13px;font-weight:900" class="shadow-sm">최저가율 ↓ 정렬</span>
		</div>
		${tabbar("경매")}
	</div>`,
);

/* ── 세로형 3 · 비교·기록 ─────────────────────── */
const cmpRow = (label, a, b, hl) => `
	<div style="display:flex;border-top:1.5px solid #EFEce4">
		<div style="width:34%;padding:12px 12px;font-size:13px;font-weight:700;color:#6b6657">${label}</div>
		<div style="flex:1;padding:12px 8px;text-align:center;font-size:15px;font-weight:${hl === 0 ? 900 : 700};color:${hl === 0 ? "#111" : "#3D3A33"};background:${hl === 0 ? "#FFF4CC" : "transparent"}">${a}</div>
		<div style="flex:1;padding:12px 8px;text-align:center;font-size:15px;font-weight:${hl === 1 ? 900 : 700};color:${hl === 1 ? "#111" : "#3D3A33"};background:${hl === 1 ? "#E6F8DC" : "transparent"}">${b}</div>
	</div>`;

const p3 = portrait(
	"#FFFBEF",
	`<div style="position:absolute;top:-60px;right:-50px;width:200px;height:200px;border-radius:50%;background:#FFD43B;border:3px solid #111"></div>
	 <div style="position:absolute;bottom:-40px;left:-30px;width:150px;height:150px;border-radius:30px;background:#B6F09C;border:3px solid #111;transform:rotate(-12deg)"></div>`,
	"#FFD43B",
	"관심 · 기록",
	"비교하고\n기록해요",
	"관심 물건을 나란히 보고 임장·입찰 결과를 남겨요.",
	`<div style="padding:20px 18px 0;display:flex;flex-direction:column;height:100%">
		<div style="font-size:15px;font-weight:800;margin-bottom:10px">관심 물건 비교</div>
		<div style="border:2.5px solid #111;border-radius:16px;background:#fff;overflow:hidden">
			<div style="display:flex;background:#111;color:#fff">
				<div style="width:34%;padding:11px 12px;font-size:12px;font-weight:700;color:#cfc9bb">항목</div>
				<div style="flex:1;padding:11px 8px;text-align:center;font-size:13px;font-weight:800">역삼 ○○</div>
				<div style="flex:1;padding:11px 8px;text-align:center;font-size:13px;font-weight:800">분당 □□</div>
			</div>
			${cmpRow("감정가", "13억 2천", "12억 8천", -1)}
			${cmpRow("최저가", "8억 4,800만", "9억 7,000만", 0)}
			${cmpRow("최저가율", "64%", "72%", 0)}
			${cmpRow("전용면적", "25.7평", "30.6평", 1)}
			${cmpRow("매각기일", "6.18 (D-3)", "6.29 (D-14)", -1)}
		</div>
		<div style="font-size:15px;font-weight:800;margin:22px 0 10px">임장·입찰 기록</div>
		<div style="border:2.5px solid #111;border-radius:16px;background:#fff;padding:14px 14px">
			<div style="font-size:14px;color:#3D3A33;line-height:1.5">"역세권, 채광 좋음. 누수 흔적 확인 필요."</div>
			<div style="display:flex;gap:8px;margin-top:12px;align-items:center;flex-wrap:wrap">
				<span style="border:2px solid #111;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:800">입찰가 8억 7,000만</span>
				<span style="border:2px solid #111;border-radius:10px;padding:6px 12px;font-size:13px;font-weight:900;background:#B6F09C">낙찰</span>
			</div>
		</div>
		${tabbar("관심")}
	</div>`,
);

/* ── 가로형 · 오버뷰 ──────────────────────────── */
const miniCard = (rot, top, left, inner) =>
	`<div style="position:absolute;top:${top}px;left:${left}px;transform:rotate(${rot}deg);width:340px;border:3px solid #111;border-radius:22px;background:#FFFBEF;overflow:hidden" class="shadow">${inner}</div>`;

const landscape = base(
	1504,
	741,
	`<div style="width:1504px;height:741px;background:#FFFBEF;position:relative;overflow:hidden">
		<div style="position:absolute;top:-90px;left:-70px;width:260px;height:260px;border-radius:50%;background:#FFD43B;border:3px solid #111"></div>
		<div style="position:absolute;bottom:-80px;left:38%;width:200px;height:200px;border-radius:40px;background:#FF6B6B;border:3px solid #111;transform:rotate(14deg)"></div>
		<!-- 좌측 브랜드 -->
		<div style="position:absolute;left:96px;top:150px;width:560px">
			<div style="display:flex;align-items:center;gap:22px">
				<div style="width:118px;height:118px;border:3.5px solid #111;border-radius:26px;overflow:hidden" class="shadow"><img src="${LOGO}" style="width:100%;height:100%;object-fit:cover"></div>
				<div style="font-size:96px;font-weight:900;letter-spacing:-4px">호미</div>
			</div>
			<div style="display:inline-block;margin-top:26px;background:#111;color:#fff;border-radius:16px;padding:12px 22px;font-size:26px;font-weight:800">법원경매 탐색 · 비교 · 기록</div>
			<p style="font-size:23px;font-weight:600;color:#3D3A33;margin-top:26px;line-height:1.5">서울·성남 법원경매를 매일 업데이트<br>물건을 필터·정렬·비교하고 임장·입찰까지 한곳에서.</p>
		</div>
		<!-- 우측 미니 카드들 -->
		<div style="position:absolute;right:70px;top:0;width:720px;height:741px">
			${miniCard(
				-5,
				90,
				40,
				`<div style="padding:18px 16px">
					<div style="font-size:18px;font-weight:900;margin-bottom:12px">오늘의 경매 ⚡</div>
					<div style="display:flex;gap:9px;margin-bottom:14px">
						${statCard("1,944", "", "진행", "#fff")}
						${statCard("553", "", "이번주", "#FFD43B")}
						${statCard("12", "", "관심", "#fff")}
					</div>
					${distChart()}
				</div>`,
			)}
			${miniCard(
				6,
				340,
				330,
				`<div style="padding:16px 16px">
					<div style="display:flex;gap:7px;margin-bottom:12px">${chip("6억 이하", true)}${chip("25~35평", false)}</div>
					${auctionRow("강남구 역삼동 ○○", "25.7평", "최저가 8억 4,800만", 64, "D-3", "#FF6B6B", true, [["지분", "danger"]])}
					${auctionRow("성남 분당구 정자동 □□", "30.6평", "최저가 9억 7,000만", 72, "D-14", "#B6F09C", false, [["제시외 건물", "warn"]])}
				</div>`,
			)}
		</div>
	</div>`,
);

/* ── 썸네일 1942x828 ──────────────────────────── */
const thumb = base(
	1942,
	828,
	`<div style="width:1942px;height:828px;background:#FFD43B;position:relative;overflow:hidden">
		<div style="position:absolute;top:-150px;right:-120px;width:420px;height:420px;border-radius:50%;background:#B6F09C;border:5px solid #111"></div>
		<div style="position:absolute;bottom:-140px;left:-80px;width:300px;height:300px;border-radius:60px;background:#FF6B6B;border:5px solid #111;transform:rotate(12deg)"></div>
		<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:70px">
			<div style="width:300px;height:300px;border:6px solid #111;border-radius:54px;overflow:hidden;box-shadow:12px 12px 0 #111"><img src="${LOGO}" style="width:100%;height:100%;object-fit:cover"></div>
			<div>
				<div style="font-size:230px;font-weight:900;letter-spacing:-10px;line-height:0.92;color:#111">호미</div>
				<div style="display:inline-block;margin-top:24px;background:#111;color:#fff;border-radius:24px;padding:18px 34px;font-size:42px;font-weight:800">법원경매 탐색 · 비교 · 기록</div>
			</div>
		</div>
	</div>`,
);

/* ── 렌더 ─────────────────────────────────────── */
const specs = [
	{ name: "screenshot-portrait-1-home.png", w: 636, h: 1048, html: p1 },
	{ name: "screenshot-portrait-2-auction.png", w: 636, h: 1048, html: p2 },
	{ name: "screenshot-portrait-3-compare.png", w: 636, h: 1048, html: p3 },
	{ name: "screenshot-landscape-overview.png", w: 1504, h: 741, html: landscape },
	{ name: "thumbnail-1942x828.png", w: 1942, h: 828, html: thumb },
];

import { existsSync } from "node:fs";
const CHROME =
	[
		process.env.CHROME_PATH,
		"/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
		chromium.executablePath(),
	].find((p) => p && existsSync(p)) ?? undefined;
const browser = await chromium.launch({
	executablePath: CHROME,
	args: ["--allow-file-access-from-files", "--disable-web-security"],
});
for (const s of specs) {
	const htmlPath = resolve(OUT, `.tmp-${s.name}.html`);
	writeFileSync(htmlPath, s.html);
	const page = await browser.newPage({
		viewport: { width: s.w, height: s.h },
		deviceScaleFactor: 1,
	});
	await page.goto(`file://${htmlPath}`, { waitUntil: "load" });
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(150);
	await page.screenshot({
		path: resolve(OUT, s.name),
		clip: { x: 0, y: 0, width: s.w, height: s.h },
	});
	await page.close();
	console.log("✓", s.name, `${s.w}x${s.h}`);
}
await browser.close();
console.log("done →", OUT);
