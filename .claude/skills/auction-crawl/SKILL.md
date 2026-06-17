---
name: auction-crawl
description: >-
  Crawl Korean court-auction listings (서울+성남) and publish them to
  auction-data/ as a by-sale-date Excel cache. Use when running or maintaining
  the auction crawler, refreshing auction-data, diagnosing a failed daily crawl,
  rebuilding Excel from a captured raw response, or changing the data format.
---

# 법원경매 크롤 & 발행 (by-sale-date 캐시)

호미의 경매 데이터를 수집하고 `auction-data/`에 **매각기일별 엑셀 캐시**로
발행하는 작업이에요.

## 출력 구조 (크롤 날짜 폴더 없음)

```
auction-data/
  by-sale-date/2026-06-15.xlsx   매각기일별 파일 = 캐시 단위
  by-sale-date/index.json        날짜별 건수·지역수·해시 매니페스트
  latest.xlsx                    이번 수집 전체 (앱이 읽는 파일)
  latest-metadata.json
  latest.json.gz                 원본 응답 (오프라인 재생성용)
```

- 매각기일이 1급 키예요. `{크롤날짜}/` 중첩 폴더는 쓰지 않아요.
- 파일명이 `YYYY-MM-DD.xlsx`라 자연 정렬돼요.

## 캐시 동작 (핵심)

각 매각기일 파일의 **데이터 해시**를 `index.json`과 비교해요.

- 해시 같음 → **캐시 히트**, 파일을 다시 쓰지 않아요 (git diff 없음).
- 해시 다름/신규 → 엑셀을 쓰고 매니페스트 갱신.
- 수집 윈도우(오늘~+14일) 밖의 지난 날짜 파일은 그대로 남아 **과거 캐시로
  누적**돼요. 매일 돌려도 변한 날짜만 갱신돼서 가볍게 유지돼요.

## 코드 위치

| 파일 | 역할 |
|---|---|
| `scripts/crawl-court-auctions.mjs` | 라이브 크롤 (Playwright로 법원 사이트 폼 조작) |
| `scripts/lib/court-rows.mjs` | 원본 행 → 13컬럼 엑셀 매핑 (양쪽 공유) |
| `scripts/lib/publish.mjs` | by-sale-date 캐시 발행 + 해시 비교 |
| `scripts/raw-to-xlsx.mjs` | 캡처된 raw → 동일 구조 오프라인 재생성 |

형식·캐시 로직을 바꿀 땐 `lib/`만 고치면 크롤러와 재생성기가 같이 따라와요.

## 실행

### 라이브 크롤 (한국망 + 실제 크롬 필요)
법원 사이트(courtauction.go.kr)는 데이터센터/비-한국 IP를 막고 실제 브라우저
세션을 요구해요. 보통 **본인 맥**에서 돌려요.

```bash
npm run crawl:auctions          # 기본 헤드리스
HEADLESS=false npm run crawl:auctions   # 동작을 보면서
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run crawl:auctions
```

성공하면 `auction-data/`가 갱신돼요. 앱은 `latest.xlsx`를 원격에서 받아 병합해요.

### 수집 범위 (기본 서울+성남 / 전국 opt-in)
`CRAWL_SCOPE`로 범위를 정해요.

```bash
npm run crawl:auctions                       # 기본: 서울 25구 + 성남 3구 (시군구 단위)
CRAWL_SCOPE=nationwide npm run crawl:auctions # 전국: 시도 17개 단위 (시군구 '전체')
CRAWL_SCOPE=nationwide CRAWL_TARGET_LIMIT=2 HEADLESS=false npm run crawl:auctions  # 2개 시도만 눈으로 검증
```

- 시도 단위는 타깃이 250→17로 줄어 시간·실패가 크게 감소해요.
- 시도당 수천 건이라 **결과가 많으면 매각일별로 쪼개서** 전부 모아요
  (`crawlTarget`): 먼저 전체 기간을 한 번에 검색하고, 첫 페이지그룹(≈400개)을
  넘겨 다 못 받으면 `eachDay`로 하루씩 재검색해요. 하루치는 보통 수십~수백 건이라
  페이지그룹 안에 다 들어와서, 깨지기 쉬운 '다음 그룹(»)' 이동이 필요 없어요.
  작은 시도는 전체 기간 한 번으로 끝나요. `CRAWL_PAGE_GROUP`(기본 10)으로 그룹
  크기를 조정할 수 있어요.
- 단일 일자조차 페이지그룹을 넘으면 `⚠ … 단일일자 초과` 경고를 찍어요(거의 없음).
- **전국 전환 전 맥에서 검증할 것**(지오차단 때문에 본인 맥에서만 가능):
  1. **시군구 '전체' 검색이 시도 전체를 반환하는지** — `selectSigunguAll`이 첫
     옵션/'전체'를 고르는데, 사이트가 시군구 필수면 시도별로 시군구를 다시
     순회해야 해요(전략 재고).
  2. **`done … rows=N (기대 M)`** 로그에서 N==M인지 — 누락 없이 다 모았는지 확인.
- 검증되면 워크플로(`crawl-auctions.yml`)에 `CRAWL_SCOPE: nationwide`를 넣어 전환해요.
  17타깃이라도 all-or-nothing 발행이라, 전국에서 잦은 실패가 보이면 부분 발행
  허용을 따로 고려하세요.
- 지역 라벨은 `regionFor`가 전국 대응(서울/성남은 상세 유지, 그 외 시도 짧은 라벨)이라
  scope와 무관하게 동작해요.

### 오프라인 재생성 (크롤 불가 환경)
이미 수집한 raw로 동일 구조를 다시 만들어요.

```bash
npm run data:raw-xlsx -- auction-data/latest.json.gz auction-data
```

## 자동화 (cron)

`.github/workflows/crawl-auctions.yml`이 매일 돌며 크롤 → `auction-data/` 변경분
커밋·푸시해요. **단, GitHub 러너가 법원 사이트에 지오 차단되면 실패**하므로,
그 경우 본인 맥에서 로컬 cron(launchd/crontab)으로 `npm run crawl:auctions` 후
`git add auction-data && git commit && git push`를 돌리세요.

## 주의

- 시청·진도 같은 건 없음. 단순 검색 결과 수집이에요.
- 검색은 구별로 순차 진행하고 딜레이를 유지해요 (사이트 부하 배려).
- 직접 비공개 API를 만들지 말고, 사이트 자체 검색 응답을 캡처해서 써요.
