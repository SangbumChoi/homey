# Court Auction Crawling

This document describes how Homey collects and publishes daily court-auction
data for properties located in Seoul and Seongnam.

Use this guide when maintaining `scripts/crawl-court-auctions.mjs`, diagnosing a
failed daily crawl, changing the geographic scope, or rebuilding the public
auction-data archive.

## Scope

The crawler intentionally applies only a location filter:

- Seoul: all 25 districts
- Seongnam: Sujeong-gu, Jungwon-gu, and Bundang-gu
- No price limit
- No area limit
- No property-type limit

The auction-date range is a rolling window from the crawl date through 14 days
later. The court website limits the searchable future period, so running the
crawler daily is how the repository discovers newly available dates.

## Source Website

The source is the Korean Court Auction Information website:

<https://www.courtauction.go.kr/pgj/index.on?w2xPath=/pgj/ui/pgj100/PGJ151F00.xml>

The site is a WebSquare application. Its visible form is driven by JavaScript,
and the useful search results arrive as JSON after the user submits the form.
For that reason, the crawler uses Playwright to operate the real website form
and captures the site's own search response. It does not construct an
undocumented direct API request.

Respect the site's availability and policies. Keep searches sequential, retain
delays between districts, and do not add aggressive parallel requests.

## Website Interaction Method

The crawler launches installed Google Chrome in headless mode and opens the
property-detail search page. It runs one independent browser session per
district to reduce stale WebSquare state and make failures easier to isolate.

For each district, it performs these actions:

1. Select `소재지(지번주소)` as the search method.
2. Fill the start and end auction dates.
3. Select the province.
4. Select the district.
5. Leave price, area, and property-category controls untouched.
6. Click the detailed property search button.
7. Capture and parse the JSON search response.
8. Expand the visible page size and visit remaining UI pagination links.

Important WebSquare element IDs:

| Purpose | Element ID |
|---|---|
| Location-search radio | `mf_wfm_mainFrame_rad_rletSrchBtn_input_1` |
| Start date | `mf_wfm_mainFrame_cal_rletPerdStr_input` |
| End date | `mf_wfm_mainFrame_cal_rletPerdEnd_input` |
| Province | `mf_wfm_mainFrame_sbx_rletAdongSdS` |
| District | `mf_wfm_mainFrame_sbx_rletAdongSggS` |
| Search button | `mf_wfm_mainFrame_btn_gdsDtlSrch` |
| Results per page | `mf_wfm_mainFrame_sbx_pageSize` |
| Pagination | `mf_wfm_mainFrame_pgl_gdsDtlSrchPage` |

The location radio uses `force: true` because its label can intercept pointer
events even though the underlying input is valid.

After programmatically filling a WebSquare input, dispatch both `input` and
`change` events. Filling the DOM value alone may not update WebSquare's internal
state.

## Search Response Method

The crawler waits for a response whose URL contains:

```text
/pgj/pgjsearch/searchControllerMain.on
```

The important response fields are:

| JSON path | Meaning |
|---|---|
| `data.dlt_srchResult` | Current page of auction-property rows |
| `data.dma_pageInfo.totalCnt` | Total matching rows |
| `message` | Website result or validation message |

Useful fields inside each auction row include:

| Field | Meaning |
|---|---|
| `docid` | Preferred unique identifier |
| `jiwonNm` | Court name |
| `srnSaNo` | Case number |
| `maemulSer` | Property item number |
| `hjguSido`, `hjguSigu`, `hjguDong` | Jibun-address location |
| `gamevalAmt` | Appraisal amount |
| `minmaePrice` | Minimum sale price |
| `maeGiil` | Auction date |
| `yuchalCnt` | Failed-auction count |
| `areaList`, `pjbBuldList` | Area/building text |
| `mulBigo` | Notes |

Rows are deduplicated by `docid`, falling back to court, case number, and item
number. Pagination is operated through the website UI instead of replaying the
network request directly.

## Geographic Targets

Seoul searches use `서울특별시` plus each district name. Seongnam searches use
`경기도` plus these exact district labels:

```text
성남시 수정구
성남시 중원구
성남시 분당구
```

Searching district by district makes pagination manageable and confirms that
every returned row belongs to the intended geographic boundary. Final
verification must reject rows outside Seoul or Seongnam.

## Running The Crawler

Install dependencies, then run:

```bash
npm install
npm run crawl:auctions
```

Useful environment variables:

| Variable | Example | Purpose |
|---|---|---|
| `CRAWL_TARGET_LIMIT` | `1` | Test only the first N districts |
| `CRAWL_DELAY_MS` | `3500` | Delay between district sessions |
| `CRAWL_RESUME` | `false` | Ignore today's checkpoint and restart |
| `AUCTION_START_DATE` | `2026.06.12` | Override start date |
| `AUCTION_END_DATE` | `2026.06.26` | Override end date |
| `HEADLESS` | `false` | Show Chrome while diagnosing the form |
| `CHROME_PATH` | `/path/to/Chrome` | Override the Chrome executable |

Quick live test:

```bash
CRAWL_TARGET_LIMIT=1 CRAWL_DELAY_MS=0 npm run crawl:auctions
```

## Checkpoint And Resume Behavior

After every completed district, the crawler writes a local checkpoint:

```text
data/auction-crawl/latest.json
```

This file is intentionally ignored by Git because the uncompressed response is
large. If a run is interrupted, rerunning the same date window skips districts
already completed successfully. A new date window automatically starts a fresh
run.

Each browser close has a timeout so a stuck Chrome process does not block the
whole daily crawl.

## Publication Outputs

A complete crawl publishes:

```text
auction-data/
├── latest.xlsx              # this crawl's full set (the app reads this)
├── latest.json.gz           # compressed source response (offline rebuild)
├── latest-metadata.json     # summary for automated verification
└── by-sale-date/
    ├── 2026-06-15.xlsx       # one workbook per auction date (cache unit)
    ├── ...
    └── index.json           # per-date count/region/hash manifest
```

There is **no per-crawl-date folder**. The auction date is the primary key.

- `latest.xlsx`: Homey's current importable workbook (whole crawl).
- `by-sale-date/<date>.xlsx`: cached workbook for one auction date.
- `by-sale-date/index.json`: manifest with each date's row count, Seoul/Seongnam
  subtotals, and a content hash used for cache comparison.

**Cache behavior**: each date's data hash is compared against `index.json`.
Unchanged dates are skipped (cache hit, no rewrite); changed/new dates are
rewritten. Past dates that fall out of the rolling window keep their cached
file, so history accumulates while daily diffs stay small.

The download index in `README.md` is maintained manually (the crawler no longer
rewrites it).

The XLSX detail sheet uses the headers expected by
`src/utils/auctionXlsx.ts`, including `사건번호`, `주소/건물`, `최저가_원`, and
`매각기일`.

## Publication Safety

Never publish partial daily data.

Before writing public archive files, the crawler verifies that no district
result contains an error. If any target fails, it updates only the local
checkpoint and exits with an error. It does not overwrite `latest.xlsx` or
create a misleading date archive.

Before committing a daily crawl, verify:

```bash
cat auction-data/latest-metadata.json
gzip -t auction-data/latest.json.gz
git diff --check
```

Also confirm:

- All 28 locations completed.
- `failedLocations` is empty.
- All raw rows are located in Seoul or Seongnam.
- The Excel row count equals the metadata total.
- The README download index includes the crawl date.

## Daily Automation

`.github/workflows/crawl-auctions.yml` runs daily (21:10 UTC = 06:10 KST) and on
manual dispatch. It installs Playwright Chromium, runs `npm run crawl:auctions`,
and commits only the changed files under `auction-data/` (skipping the commit
entirely when every date is a cache hit).

**Geo-block caveat**: GitHub-hosted runners are not in Korea, so the court site
may return 403 there. If the scheduled job fails for that reason, run the crawl
on a Korean-network machine (your Mac) instead:

```bash
npm run crawl:auctions
git add auction-data && git commit -m "data: auction refresh" && git push
```

You can wire that into a local `crontab`/`launchd` job. Stage only
`auction-data/` — never unrelated workspace changes.

## Common Failures

### A selector no longer exists

The court website may have changed its WebSquare screen. Run with
`HEADLESS=false`, inspect the rendered form, and update the affected element ID.

### A district select has no matching label

Wait longer after selecting the province and inspect the available district
options. WebSquare populates dependent selects asynchronously.

### Search response times out

Check the website manually for maintenance or a security message. Preserve the
checkpoint, wait, and resume later. Do not increase request concurrency.

### Result count exceeds collected rows

Inspect the page-size select and pagination markup. The crawler first attempts
40 rows per page, then clicks remaining page numbers through the UI.

### Raw data is large

Keep the uncompressed checkpoint local. Public archives store `raw.json.gz`,
which substantially reduces repository growth while retaining the full source
response.

## Maintenance Principle

Treat the website UI and response schema as external contracts that can change.
Prefer small selector/schema repairs, retain the sequential district workflow,
and always fail closed rather than publishing an incomplete dataset.

## Shared Mapping & Offline Excel Rebuild

The row→Excel mapping (`toHomeyRow`, `buildAddress`, `areaFromRow`, `buildWorkbook`,
etc.) lives in `scripts/lib/court-rows.mjs` and is shared by both the live crawler
and the offline rebuilder, so the Excel format never drifts.

If you cannot run the live crawl (e.g. no Korean network or no local Chrome), you
can rebuild the exact Excel from a previously captured raw response:

```bash
# raw.json.gz (or latest.json.gz) → Excel in 경매목록 + 요약 format
npm run data:raw-xlsx -- auction-data/2026-06-12/raw.json.gz out.xlsx
```

The live crawl must run where a real Chrome and Korean network are available
(typically your own machine), because the court site blocks datacenter/non-KR
networks and needs a real browser session:

```bash
# on your Mac — uses your installed Google Chrome
npm run crawl:auctions          # HEADLESS=false to watch it
```
