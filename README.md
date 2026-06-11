# 호미 (Homey) — 법원경매 물건 탐색 미니앱

> 토스 앱 내에서 실행되는 아파트 경매 물건 탐색·비교·기록 서비스

매주 받는 법원경매 엑셀 파일을 업로드하면 물건을 필터·정렬·비교하고,
임장 메모와 입찰 결과를 기록할 수 있어요.

| 탭 | 기능 |
|----|------|
| **홈** | 대시보드 — 이번 주 기일, 관심 물건 D-day, 업로드 간 최저가 하락 추적, 빠른 필터 |
| **경매** | 물건 리스트 — 칩 필터(지역/법원/가격/면적/조건) + 정렬, 엑셀 업로드, 상세 바텀시트 |
| **관심** | 별표로 담은 물건 목록 + 지표별 나란히 비교 표 |
| **기록** | 물건별 임장 메모, 입찰가, 낙찰/패찰 결과 기록 |

---

## 시작하기

```bash
npm install
npm run dev          # Vite 개발 서버 (http://localhost:5173)
```

---

## 프로젝트 구조

```
src/
├── App.tsx                   # 라우팅 (Page union type 기반 상태 머신)
├── pages/
│   ├── HomePage.tsx          # 탭 셸 (홈/경매/관심/기록) + 탭바
│   ├── DashboardTab.tsx      # 홈 대시보드 (통계·기일 임박·가격 변동)
│   ├── AuctionPage.tsx       # 경매 리스트 + 필터/정렬 시트 + 상세 시트
│   ├── FavoritesTab.tsx      # 관심 물건 목록 + 비교 표
│   ├── RecordsTab.tsx        # 임장·입찰 기록 목록
│   └── Diagnosis*.tsx        # (구) 전세 진단 플로우 — 라우트만 유지
├── components/
│   └── RecordSheet.tsx       # 임장 메모·입찰 결과 입력 바텀시트
├── store/
│   ├── useAuctionStore.ts    # 물건·관심·기록·가격변동 (zustand persist)
│   └── useAppStore.ts        # (구) 진단 상태
├── utils/auctionXlsx.ts      # 주간 엑셀 파싱 (exceljs) + 가격 포맷
├── data/auctionSeed.json     # 앱과 함께 배포되는 시드 물건 데이터
└── types/index.ts            # AuctionItem, AuctionRecord 등
```

---

## 디자인 가이드

### Toss UX Writing 규칙

앱인토스 미니앱은 토스의 UX Writing 규칙을 따라야 해요.

| 규칙 | 설명 | 예시 |
|------|------|------|
| **해요체 통일** | 모든 문구는 해요체로 작성 | "진단이 완료됐어요" |
| **능동형 표현** | 수동형 대신 능동형 사용 | ❌ "처리됐어요" → ✅ "처리했어요" |
| **긍정형 문장** | 부정형을 줄이고 긍정형으로 | ❌ "없어요" → ✅ "있어요" |
| **캐주얼 경어** | 과도한 경어 제거 | ❌ "~시겠어요?" → ✅ "~할까요?" |
| **닫기 버튼** | 다이얼로그 왼쪽 버튼은 "닫기"로 통일 | ❌ "취소" → ✅ "닫기" |
| **명사+명사 금지** | 한자어 명사 나열 대신 문장형 | ❌ "결제 실패" → ✅ "결제가 실패했어요" |
| **철자 통일** | "되어요" 대신 "돼요" | ❌ "되어요" → ✅ "돼요" |

### Consumer UX 출시 불가 항목 (5가지)

이 항목에 해당하면 **앱 출시가 거부**돼요.

1. **진입 시 바텀시트 차단 금지**
   - 서비스 진입 즉시 광고성 바텀시트를 표시하면 안 돼요
   - 알림 동의, 프로모션 등은 적절한 시점에 노출해야 해요

2. **뒤로가기 가로채기 금지**
   - 뒤로가기 버튼은 반드시 이전 화면으로 이동해야 해요
   - 뒤로가기 시 알림 동의 바텀시트 등을 표시하면 안 돼요

3. **항상 나갈 수 있는 선택지 제공**
   - 사용자가 CTA 외에 다른 선택을 할 수 없는 구조는 안 돼요
   - 모든 화면에서 닫기/뒤로가기가 가능해야 해요

4. **예상치 못한 광고 금지**
   - 자연스러운 사용 흐름 중 전면 광고가 갑자기 나타나면 안 돼요
   - 광고는 사용자 흐름에 자연스럽게 통합해야 해요

5. **CTA 문구 명확화**
   - 버튼은 다음 행동을 명확하게 안내해야 해요
   - 화면 설명을 반복하거나 모호한 문구 사용 금지

### Homey 브랜드 디자인 — 네오브루탈

| 속성 | 값 |
|------|------|
| 캔버스 | `#FFFBEF` (크림) |
| 잉크 (텍스트·테두리) | `#111111` |
| 액션·강조 | `#FFD43B` (옐로), `#B6F09C` (라임) |
| 경고·긴급 | `#FF6B6B` (빨강 배경 + 검정 글자, AA 대비 통과) |
| 보조 텍스트 | `#555555`, `#8C8576` |
| 카드 문법 | 2.5px 검정 테두리 + 4px 오프셋 섀도우 (`.nb`), 누르면 가라앉는 모션 (`.nb-press`) |
| 위계 원칙 | 두꺼운 테두리+섀도우는 히어로 요소(통계 카드·주요 CTA·활성 칩)에만, 리스트는 플랫 행 |

### UI 컴포넌트 (TDS Mobile)

```tsx
// 사용 중인 TDS 컴포넌트
import { Button, TextButton, Top, Text, List, ListRow } from "@toss/tds-mobile";
import { useDialog, useToast } from "@toss/tds-mobile";
import { colors } from "@toss/tds-colors";
```

| 컴포넌트 | 용도 |
|----------|------|
| `Button` | 주요 CTA (`color="dark"`) / 보조 CTA (`variant="weak"`) |
| `TextButton` | 텍스트 링크형 버튼 (뒤로가기, 삭제 등) |
| `Top` | 섹션 헤더 (타이틀 + 서브타이틀) |
| `List` / `ListRow` | 진단 내역 목록 표시 |
| `useDialog` | 확인/경고 다이얼로그 |

---

## 주간 엑셀 데이터 갱신

매주 받는 경매 엑셀을 사용자 기기에 전달하는 방법이에요. **서버 없이** 동작해요.

### 법원경매 자동 수집

서울 25개 구와 성남 3개 구의 물건을 가격·면적·물건종류 제한 없이 수집해
앱이 바로 읽을 수 있는 `latest.xlsx`를 만들어요. 법원 사이트의 검색 범위에 맞춰
실행일로부터 14일 뒤까지의 매각기일을 매번 새로 조회해요.

```bash
npm run crawl:auctions
```

원본 응답과 지역별 조회 결과는 `data/auction-crawl/latest.json`에 남아요.
테스트할 때는 `CRAWL_TARGET_LIMIT=1 npm run crawl:auctions`로 한 지역만 조회할 수 있어요.
법원 사이트의 화면 구조나 접근 정책이 바뀌면 자동 수집도 함께 조정해야 해요.

### 권장: 공개 데이터 저장소 (GitHub)

코드 저장소(비공개)와 별도로, 데이터만 담는 **공개 저장소**를 하나 만들어요.
법원경매 물건은 공개 정보라 공개 저장소에 둬도 문제 없어요.

**1회 설정 (2분):**

1. GitHub에서 **public** 저장소 `homey-data`를 만들어요
2. 이 저장소의 `public/icon.png`를 `icon.png`로 업로드해요 (앱 아이콘)
3. 첫 엑셀 파일을 `latest.xlsx` 이름으로 업로드해요

**매주 할 일 (30초):**

1. github.com/SangbumChoi/homey-data 접속 → `latest.xlsx` 클릭 → 연필(편집) 대신 휴지통 옆 **⋯ → Upload files**로 새 파일을 같은 이름으로 드래그&드롭
2. 끝 — 앱이 실행될 때(6시간에 1번) 자동으로 받아 병합해요.
   경매 탭의 **↻ 새 데이터** 버튼으로 즉시 확인할 수도 있어요

앱은 `https://raw.githubusercontent.com/SangbumChoi/homey-data/main/latest.xlsx`를
읽어요 (URL은 `src/services/remoteAuctionData.ts`에서 변경 가능). raw.githubusercontent.com은
CORS `*`와 HTTPS를 지원해서 토스 미니앱 환경에서 바로 동작해요.

### 다른 방법과 비교

| 방법 | 평가 |
|------|------|
| **GitHub 공개 저장소** | ✅ 무료·버전 관리·CORS 지원·웹에서 업로드 — **권장** |
| 앱 안에서 직접 업로드 | ✅ 이미 구현돼 있어요 (경매 탭 → 엑셀 업로드). 내 기기에만 반영되는 백업 수단 |
| 시드 교체 후 재배포 | 데이터가 번들에 포함돼 오프라인에도 안전하지만, 매주 재배포(+검수 가능성)가 필요해요 |
| AWS S3 | 동작하지만 계정·과금·CORS 설정이 필요해 이 규모에선 과해요 |
| Google Drive | ❌ 공유 링크가 리다이렉트·인터스티셜을 거치고 CORS를 보장하지 않아 앱에서 직접 받기 어려워요 |

> 저장소가 아직 없어도 앱은 조용히 넘어가요 — 기존 시드 데이터와 수동 업로드가 그대로 동작해요.

---

## 앱인토스 배포 & 테스트

### 1단계: 빌드

```bash
npm run build     # dist/ 폴더에 번들 생성 → <serviceName>.ait 파일 생성
```

> 번들 크기 제한: **압축 해제 기준 100MB 이하**

#### 번들 최적화 팁
- 대용량 이미지/폰트는 외부 CDN에 호스팅
- 코드 스플리팅과 lazy loading 적용
- 필수 리소스만 번들에 포함

### 2단계: 업로드 & 테스트

#### 방법 A — 콘솔 업로드 (수동)

1. [앱인토스 콘솔](https://apps-in-toss.toss.im/) 접속
2. 워크스페이스 → 앱 → 좌측 메뉴 → **앱 출시**
3. `.ait` 파일 업로드
4. 자동 생성된 QR 코드를 토스 앱으로 스캔

#### 방법 B — CLI 배포 (CI/CD)

SDK v1.4.0+ 필요.

```bash
# API 키 발급: 콘솔 → 워크스페이스 → 좌측 메뉴 → 키

# 1회성 배포
npx ait deploy --api-key {API_KEY}

# 토큰 등록 후 반복 배포
npx ait token add
npx ait deploy
npx ait deploy -m "출시 메모"
```

### 3단계: 토스 앱에서 테스트

#### 테스트 조건
- 토스 앱에 로그인 되어 있어야 해요
- 워크스페이스 멤버여야 해요
- 만 19세 이상이어야 해요

#### 테스트 스킴

```
# 기본 테스트
intoss-private://appsintoss?_deploymentId={DEPLOYMENT_ID}

# 경로 파라미터 포함
intoss-private://appsintoss/path?_deploymentId={DEPLOYMENT_ID}

# 쿼리 파라미터 포함 (URL 인코딩 필요)
intoss-private://appsintoss?_deploymentId={DEPLOYMENT_ID}&queryParams=%7B%22key%22%3A%22value%22%7D
```

> `intoss://` 스킴은 정식 출시 이후에만 접근 가능해요. 테스트 시에는 `intoss-private://`을 사용하세요.

### 4단계: 검수 요청

- **최소 1회 이상** 테스트를 완료해야 검수 요청이 가능해요
- 콘솔에서 검수 요청 버튼을 클릭

### CORS 설정

서버 API를 사용하는 경우 다음 origin을 허용해야 해요.

| 환경 | Origin |
|------|--------|
| **프로덕션** | `https://<appName>.apps.tossmini.com` |
| **테스트** | `https://<appName>.private-apps.tossmini.com` |

> 라이브 환경에서는 **HTTPS만 허용**돼요 (iOS ATS 정책).
> iOS 13.4+에서는 서드파티 쿠키가 차단되므로 **토큰 기반 인증**을 사용하세요.

---

## 트러블슈팅

| 증상 | 원인 & 해결 |
|------|------------|
| **iOS 흰 화면** | Sentry 모니터링 설정, 리소스 최적화, 코드 스플리팅, 이미지/폰트 크기 축소 |
| **통신 실패** | CORS origin 등록, HTTPS 확인, 토큰 기반 인증 사용 |
| **앱 미실행** | 토스 앱 최신 버전 확인, `granite.config.ts`의 `icon` 값 확인 |
| **번들 업로드 실패** | 100MB 초과 여부 확인, 대용량 리소스 외부 호스팅 |

---

## 설정 파일

### granite.config.ts

```ts
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "homey",
  brand: {
    displayName: "호미",
    primaryColor: "#1B3D35",
    icon: "",              // 출시 전 반드시 아이콘 설정 필요
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite dev",
      build: "vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
```

---

## 유용한 링크

- [앱인토스 콘솔](https://apps-in-toss.toss.im/)
- [앱인토스 개발자센터](https://developers-apps-in-toss.toss.im/)
- [앱인토스 개발자 커뮤니티](https://techchat-apps-in-toss.toss.im/)
- [UX Writing 가이드](https://developers-apps-in-toss.toss.im/design/ux-writing.html)
- [Consumer UX 가이드](https://developers-apps-in-toss.toss.im/design/consumer-ux-guide.html)
- [토스 앱 테스트 가이드](https://developers-apps-in-toss.toss.im/development/test/toss.html)
- [AI 활용 가이드](https://developers-apps-in-toss.toss.im/development/llms.html)
