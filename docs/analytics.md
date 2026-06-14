# 사용자 패턴 로깅 (Analytics)

앱인토스 네이티브 Analytics(`@apps-in-toss/web-framework`의 `Analytics.screen/impression/click`)로
사용자 행동을 기록해요. 모든 로깅은 `src/services/analytics.ts` 한 곳을 거쳐요 —
나중에 Amplitude·PostHog 등으로 바꿔도 이 파일만 고치면 화면 코드는 그대로예요.

## 동작 방식

- **https 토스 웹뷰**: 이벤트가 토스 로깅 파이프라인으로 전송돼요 → 앱인토스 콘솔 **분석하기 → 대시보드 / 로그(이벤트)**에서 확인.
- **로컬(http)·일반 웹**: 네이티브는 조용히 no-op이에요. 대신 최근 200개를 `localStorage["homey-events"]`에 남겨서 개발 중 눈으로 확인할 수 있어요.
- 모든 이벤트에 `deployment_id`, `referrer`, `document_title`이 자동으로 붙어요.

## 기록하는 이벤트

| 이벤트 (`log_name`) | 종류 | 주요 속성 | 답하는 질문 |
|---|---|---|---|
| `{screen}::screen` | screen | `screen` | 어느 화면을 보는가 |
| `screen_dwell` | impression | `screen`, `dwell_ms` | 화면별 체류 시간 |
| `filter_apply` | click | `filter`(price/area/region/court/condition), `range`/`value`, `min`, `max` | 어떤 가격·면적·지역을 고르는가 |
| `sort_change` | click | `sort` | 어떤 정렬을 쓰는가 |
| `quickfilter_tap` | click | `label` | 대시보드 빠른 필터 인기 |
| `listing_open` | impression | `price_bucket`, `area_bucket`, `region`, `per_pyeong`, `min_rate`, `fail_count`, `source` | 어떤 물건을 여는가 |
| `listing_dwell` | impression | `region`, `price_bucket`, `dwell_ms` | 물건 상세 체류 시간 |
| `favorite_toggle` | click | `on`, `region`, `price_bucket`, `area_bucket` | 무엇을 찜하는가 |
| `record_save` | click | `result`(낙찰/패찰), `has_bid` | 입찰 성과 |

## 콘솔에서 보는 법

1. 앱인토스 콘솔 → 워크스페이스 → 앱 → **분석하기**
2. **로그(이벤트)**에서 `log_name`별로 필터링
3. 예: `filter_apply`를 `range`로 그룹핑 → "5~7억 38%, 7~9억 24%…" 같은 분포

자세한 가이드: https://developers-apps-in-toss.toss.im/analytics/logging.md

## 다음 단계 — 값으로 앱을 바꾸기 (act on it)

로깅으로 "무엇을 하는가"를 알면, 그 값으로 앱을 조정할 수 있어요. 이미 있는
원격 설정 패턴(GitHub raw)을 그대로 쓰면 **서버 없이** 가능해요:

- "5~7억이 가장 많이 선택됨" → 기본 필터·프리셋 순서를 그쪽으로 조정
- "신건 빠른 필터가 압도적" → 대시보드 상단 고정
- A/B 테스트: 사용자에게 변형을 배정하고 `favorite_toggle` 전환율을 콘솔에서 비교

`config.json`을 `auction-data/latest.xlsx`와 같은 방식으로 받아 프리셋·기본값을
원격 조정하는 구조를 추가하면 재배포 없이 실험할 수 있어요. (원하면 다음에 붙여드려요.)
