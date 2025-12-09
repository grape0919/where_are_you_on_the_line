# PRD 실행 체크리스트

## Phase A — 접수 플로우 (PRD §4.1)
- [x] 이름·나이·진료항목 입력값을 검증하고 명확한 피드백을 제공함 (알림과 필수 필드 확인 `src/app/register/page.tsx:61`)
- [x] 담당의를 선택하면 진료실을 자동으로 채우되 수동 수정이 가능함 (localStorage 조회 `src/app/register/page.tsx:123`)
- [x] `/api/queue` POST 요청이 보안 토큰을 발급하고 대기열 URL을 반환함 (`src/app/api/queue/route.ts:45`)
- [x] 성공 시 폼을 초기화하고 토큰/예상 대기 시간 정보를 노출함 (`src/app/register/page.tsx:86`)
- [x] 진료항목별 기본 대기 시간을 설정 가능하게 유지함 (`src/lib/constants.ts:1`)

## Phase B — 대기열 경험 (PRD §4.2)
- [x] 대기열 페이지가 환자 정보, ETA 카운트다운, “안내/알림” 탭을 렌더링함 (`src/app/queue/page.tsx:110`)
- [x] React Query가 3분마다 폴링하며 수동 새로고침과 “마지막 업데이트” 타임스탬프를 제공함 (`src/lib/useQueue.ts:9`, `src/app/queue/page.tsx:56`)
- [x] 토큰 누락·무효 상황을 우아하게 처리하고 가이던스를 제공함 (`src/app/queue/page.tsx:79`)
- [x] ETA가 5분 이하일 때 경고를 띄우고 ETA ≤ 0이면 “곧 호출됩니다” 상태를 강조함 (`src/app/queue/page.tsx:48`)
- [x] 토큰 형식 `Q-<base36>-<rand>`가 불투명하며 충돌 저항성을 유지함 (`src/app/api/queue/route.ts:113`)

## Phase C — 예약 플로우 (PRD §4.3)
- [x] 환자 ID가 `P`로 시작해야 예약이 가능하도록 방문 이력 규칙을 강제함 (`src/app/reservation/page.tsx:62`)
- [x] 이름·환자 ID·전화번호·진료항목·날짜를 모두 검증함 (`src/app/reservation/page.tsx:84`)
- [x] 예약 정보를 localStorage에 저장하고 충돌 저항 토큰을 생성함 (`src/lib/useReservation.ts:36`)
- [x] 예약 요약에 복사/공유 기능을 제공함 (복사·공유 버튼 및 로직 — `src/app/reservation/page.tsx:411`)
- [x] 과거 날짜를 비활성화하고 가변 슬롯을 지원하는 캘린더 UI를 제공함 (과거 날짜 차단 + 슬롯 선택 UI — `src/app/reservation/page.tsx:292`, `src/lib/constants.ts:12`)
- [x] 시간대·일별 예약 정원을 제어하고 SMS/app push 메시지 포맷을 표준화함 (`src/lib/useReservation.ts:52`, `src/app/reservation/page.tsx:292`)

## Phase D — 관리자 대시보드 (PRD §4.4)
- [x] `PATCH /api/queue?action=list`로 30초 주기 목록을 조회함 (`src/app/admin/page.tsx:57`)
- [ ] 인라인 편집 시 즉시 저장되고 낙관적 UI를 적용함 (현재는 새로고침 요청에 의존, 낙관적 업데이트 없음 — `src/app/admin/page.tsx:147`)
- [x] 삭제·완료 처리 전에 확인을 받고 즉시 반영함 (`src/app/admin/page.tsx:167`)
- [x] 전체/임박/완료 건수 및 경과·잔여 시간 통계를 표기함 (`src/app/admin/page.tsx:210`)
- [ ] 관리자 인증/인가를 UI와 API 전반에 강제함 (보호 로직 부재)

## Phase E — 마스터 & 설정 (PRD §4.5)
- [x] 진료항목 CRUD와 활성/비활성, 대기시간 설정을 지원함 (localStorage 기반 — `src/app/admin/services/page.tsx:20`)
- [x] 의료진 CRUD와 진료실 자동 지정, 전문 분야·연락처·활성 상태를 관리함 (`src/app/admin/doctors/page.tsx:20`)
- [x] 환자 CRUD와 메모, 상태 토글을 지원함 (`src/app/admin/patients/page.tsx:20`)
- [x] 설정 화면에서 자동 새로고침·알림 등 UI 토글을 제공함 (백엔드 연동 전 단계 — `src/app/admin/settings/page.tsx:1`)
- [x] 서비스/요일별 예약 정원을 관리자 화면에서 관리함 (`src/app/admin/reservations/capacity/page.tsx`)
- [ ] localStorage에서 백엔드 저장소로 이전하는 지속화 계획을 수립함 (문서화/로드맵 미비)

## 인프라 & 운영 로드맵 (PRD §2, §6, §8, §9)
- [ ] 실시간 대기열·예약 상태를 위한 Redis 도입 (키 설계, TTL, 조회 로직 전환 필요 — 현재는 InMemory 프록시 `src/lib/queueStore.ts:27`)
- [ ] 마스터/히스토리/계정용 PostgreSQL 스키마 및 마이그레이션 추가
- [ ] 관리자 로그인과 환자 토큰 검증 미들웨어 구축
- [ ] API 서버 분리 시 CORS 정책과 환경 변수 관리 정비
- [ ] 예약 로직 고도화(이력 중복 검사, 시간 슬롯, SMS/카카오 알림 연동)
- [ ] 설정값을 서버 API로 지속화하고 배포 파이프라인·헬스체크·백업·모니터링을 강화함
