# 호미 (Homey) — 전세 안전 진단 미니앱

> 토스 앱 내에서 실행되는 전세 보증금 안전 진단 서비스

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
│   ├── HomePage.tsx          # 메인 (진단 / 내 집 / 기록 탭)
│   ├── DiagnosisResultPage   # A~F 등급 결과 + 회수 예상액 + 행동 가이드
│   ├── ChecklistPage         # 계약 전 체크리스트 (10개 항목)
│   ├── MyhomeDepositPage     # 내 집 등록 - 보증금 입력
│   ├── MyhomePeriodPage      # 내 집 등록 - 계약 기간 입력
│   └── OnboardingPage        # 사용자 유형 선택
├── store/useAppStore.ts      # Zustand 전역 상태
├── types/index.ts            # TypeScript 타입 정의
├── utils/
│   ├── diagnosis.ts          # 4지표 가중평균 진단 알고리즘
│   └── grades.ts             # A~F 등급 정의
└── services/
    ├── addressSearch.ts      # 주소 검색 (mock)
    ├── realEstateApi.ts      # 실거래가 조회 (mock)
    └── mockData.ts           # 시드 데이터
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

### Homey 브랜드 디자인

| 속성 | 값 |
|------|------|
| 브랜드 컬러 | `#1B3D35` (다크 그린) |
| 보조 배경 | `#E7EFEC` (라이트 그린), `#FAF8F4` (웜 그레이) |
| 위험 색상 | `#F44336` (빨강), `#FF9800` (주황), `#FFC107` (노랑) |
| 안전 색상 | `#00B274` (A등급), `#4CAF50` (B등급) |
| 텍스트 | `#1B3D35` (주요), `#5C6B66` (보조), `#9BA6A2` (비활성) |
| 테두리 | `#E5E7E3` |

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
