# 올바른대기열 디자인 가이드

> 올바른정형외과 환자 대기열 관리 시스템 — UI/UX 디자인 기준

---

## 1. 브랜드

| 항목 | 값 |
|------|-----|
| 서비스명 | 올바른대기열 |
| 병원명 | 올바른정형외과 |
| 로고 | `/public/logo.png` (원본: http://www.allrightclinic.co.kr/theme/allright/img/common/logo.png) |
| 로고 사용 | 헤더, 접수 화면, 관리자 사이드바에 표시. 최소 높이 32px, 여백 8px 이상 확보 |

---

## 2. 색상 체계

### Primary — 올바른 티얼 (`#18b1ab`)

| 용도 | HEX | oklch | CSS 변수 |
|------|-----|-------|---------|
| Primary | `#18b1ab` | `oklch(0.688 0.115 190.4)` | `--primary` |
| Primary Foreground (텍스트) | `#ffffff` | `oklch(1 0 0)` | `--primary-foreground` |
| Primary Hover | `#149e99` | 밝기 -5% | — |
| Primary Light (배경) | `#e6f7f6` | 밝기 95%, 채도 20% | — |

### 상태 색상

| 상태 | 배경 | 텍스트 | 용도 |
|------|------|--------|------|
| Pending (신규 접수) | `bg-yellow-100` | `text-yellow-800` | 접수 확인 대기 |
| Confirmed (대기 중) | `bg-primary/10` | `text-primary` | 접수 확인됨 |
| Completed (완료) | `bg-green-100` | `text-green-700` | 진료 완료 |
| Cancelled (취소) | `bg-gray-100` | `text-gray-500` | 접수 취소 |
| Urgent (임박) | `bg-red-100` | `text-red-700` | 5분 이내 호출 |

### 시스템 색상 (shadcn/ui 기반)

| 변수 | 용도 |
|------|------|
| `--background` | 페이지 배경 (`#ffffff`) |
| `--foreground` | 기본 텍스트 |
| `--muted` / `--muted-foreground` | 보조 텍스트, 비활성 영역 |
| `--border` | 카드/입력 테두리 |
| `--destructive` | 삭제/취소 액션 |
| `--accent` | 호버/포커스 하이라이트 |

---

## 3. 타이포그래피

| 항목 | 설정 |
|------|------|
| 기본 폰트 | Geist Sans (Google Fonts) |
| 모노스페이스 | Geist Mono (토큰, 코드 표시용) |
| 기본 크기 | `16px` (1rem) |
| 줄 높이 | 1.5 (본문), 1.2 (제목) |

### 크기 스케일 (태블릿 우선)

| 용도 | 클래스 | 크기 |
|------|--------|------|
| 페이지 제목 | `text-3xl font-bold` | 30px |
| 카드 제목 | `text-xl font-semibold` | 20px |
| 폼 라벨 | `text-base font-medium` | 16px |
| 입력 텍스트 | `text-lg` | 18px |
| 보조 텍스트 | `text-sm text-muted-foreground` | 14px |
| 캡션 | `text-xs text-muted-foreground` | 12px |

---

## 4. 컴포넌트 규격

### 입력 필드 (태블릿 최적화)

```
높이: h-12 (48px) — 터치 타겟 최소 44px 충족
폰트: text-lg (18px)
모서리: rounded-md (기본) 또는 rounded-xl (카드 내부)
```

### 버튼

| 종류 | 클래스 | 높이 |
|------|--------|------|
| Primary CTA | `h-14 text-lg font-semibold bg-primary` | 56px |
| Secondary | `h-12 text-base variant="outline"` | 48px |
| Small (관리자) | `size="sm"` | 32px |
| Icon | `size="icon"` | 40px |

### 카드

```
모서리: rounded-2xl
그림자: shadow-sm
패딩: CardHeader pb-2, CardContent 기본
```

### Badge (상태 표시)

```
모서리: rounded-xl (대기표), rounded-full (작은 상태)
패딩: px-3 py-1.5 (대기표), px-2 py-0.5 (작은)
```

---

## 5. 레이아웃

### 환자용 (접수/대기열/예약)

```
최대 너비: max-w-lg (32rem, 512px)
최소 높이: min-h-[100dvh]
정렬: 수직 중앙
패딩: px-4 py-6 (모바일), sm:px-6 sm:py-8
```

- 태블릿 인포 데스크에 세로 배치 기준
- 한 손 터치 조작 고려, 주요 버튼은 하단 배치
- 스크롤 최소화 — 핵심 정보만 1스크린에

### 관리자용

```
사이드바: w-64 (256px), lg에서 고정
콘텐츠: flex-1 overflow-auto
패딩: p-6
카드 그리드: grid-cols-1 → md:grid-cols-2 → lg:grid-cols-4
```

---

## 6. 아이콘

- 라이브러리: **Lucide React**
- 기본 크기: `h-4 w-4` (inline), `h-5 w-5` (카드 제목)
- 상태 아이콘: `h-8 w-8` ~ `h-12 w-12` (전체 화면 상태 표시)

### 주요 아이콘 매핑

| 용도 | 아이콘 |
|------|--------|
| 접수/대기표 | `ClipboardList` |
| 접수확인 | `ClipboardCheck` |
| 대기 시간 | `Clock` |
| 완료 | `CheckCircle` |
| 취소 | `XCircle` |
| 알림 | `Bell` / `BellOff` |
| 새로고침 | `RefreshCw` |
| 삭제 | `Trash2` |
| 편집 | `Edit` |

---

## 7. 애니메이션

- 라이브러리: **Framer Motion**
- 기본 전환: `opacity 0→1, y 8→0` (300ms)
- 접근성: `useReducedMotion()` 체크, 감소 모션 시 즉시 전환
- 로딩: `RefreshCw` + `animate-spin`
- 폴링 인디케이터: 회전 아이콘 (15초/60초 주기)

---

## 8. 반응형 브레이크포인트

| 이름 | 너비 | 대상 |
|------|------|------|
| xs | 480px | 소형 모바일 |
| sm | 640px | 모바일 |
| md | 768px | 태블릿 세로 |
| lg | 1024px | 태블릿 가로 / 데스크톱 |
| xl | 1280px | 와이드 데스크톱 |

환자용 페이지는 `sm`~`md` 기준 설계, 관리자는 `lg` 이상 기준.

---

## 9. 접근성

- 모든 인터랙티브 요소: 최소 터치 타겟 44x44px
- 색상 대비: WCAG AA 이상 (primary `#18b1ab` on white = 3.4:1 → 대형 텍스트 OK, 소형 텍스트는 `#0e8a85` 사용)
- `aria-label` 필수: 아이콘 전용 버튼
- `aria-live="polite"`: 실시간 업데이트 영역 (대기 시간, 상태)
- 포커스 링: `outline-ring/50` 기본 적용
