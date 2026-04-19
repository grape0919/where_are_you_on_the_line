# 올바른정형외과 대기열 관리 시스템

> English version: [README.en.md](./README.en.md)

올바른정형외과의 환자 대기열과 예약을 관리하는 웹 애플리케이션입니다. 환자 접수, 환자용 대기 현황 조회, 기존 환자 예약, 관리자 대시보드 및 마스터 관리 기능을 제공합니다.

## 2026-03-20 기준 구현 진행상황

### 현재 구현 완료

- 환자 접수: 이름/나이/진료항목 검증, 담당의 선택 시 진료실 자동 반영, 대기열 등록, 고유 링크 생성
- 접수 완료 후 링크 복사, 대기열 바로가기, QR 코드 생성/이미지 복사/다운로드
- 환자용 대기열 조회: ETA, 진행률, 상태 표시, 수동 새로고침, 마지막 업데이트 시간 표시
- 환자용 대기열 자동 폴링: 1분 주기
- 진료항목별 남은 대기시간 집계 표시
- 기존 환자 예약: 방문 이력 확인, 날짜/시간 선택, 정원 제한, 예약 완료 후 복사/공유
- 관리자 로그인: `ADMIN_SECRET` 기반 비밀번호 로그인, 미들웨어 보호, 관리자 API 인증
- 관리자 대시보드: 대기열 목록 조회, 수정, 삭제, 30초 자동 새로고침, 통계 카드
- 관리자 마스터 관리: 진료항목/의료진/환자 CRUD, 활성/비활성 토글
- 관리자 예약 관리: 예약 목록 조회, 날짜 필터, 수정, 삭제
- 관리자 예약 정원 설정: 서비스/요일별 규칙 CRUD 및 활성화 제어
- 진료항목 CSV 업로드 기반 예상 대기시간 자동 산출 및 적용

### 부분 구현

- 관리자 대시보드 인라인 수정은 동작하지만 optimistic update는 없고 저장 후 재조회 방식입니다.
- 진료항목 관리에서 예상 대기시간을 수정할 수 있지만, 현재 환자 접수 API 계산은 여전히 서버 상수값을 사용합니다.
- 예약 화면의 서비스 목록과 예약 생성 로직은 관리자 진료항목 설정과 완전히 연결돼 있지 않습니다.
- 예약 정원 설정은 동작하지만 저장 위치는 서버 DB가 아닌 브라우저 `localStorage`입니다.

### 화면은 있으나 기능적으로는 미완성

- 환자용 대기열의 "알림 설정" 탭은 UI 상태 전환만 있고 실제 문자/푸시 연동은 없습니다.
- 관리자 설정 화면은 UI만 있으며 저장, 백업, 초기화, 서버 연동이 없습니다.
- 관리자 대시보드 차트는 실제 운영 데이터가 아니라 샘플 데이터입니다.
- 관리자 대시보드의 "완료 처리" 기능은 코드 함수는 있으나 현재 화면 버튼이 연결돼 있지 않습니다.

### 아직 미구현

- Redis 기반 실시간 저장소
- PostgreSQL 스키마/마이그레이션
- 설정 서버 영속화
- SMS/Kakao 알림 연동
- 환자 토큰 검증 미들웨어 고도화
- 실제 운영 지표 기반 통계 차트
- 배포/백업/모니터링 파이프라인

### 현재 저장 구조

- 대기열: 서버 메모리 저장소
- 예약/진료항목/의료진/환자/예약 정원 규칙: 브라우저 `localStorage`

### 현재 확인된 품질 상태

- `pnpm test`: 통과
- `pnpm lint`: 경고만 존재
- `pnpm build`: 성공

### 다음 우선순위 권장

1. 관리자에서 수정한 진료항목 대기시간이 실제 접수/예약 계산에 반영되도록 연결
2. UI-only 기능(설정, 알림, 차트, 완료 처리 버튼) 정리
3. 메모리/`localStorage` 저장을 Redis/PostgreSQL로 전환

## 주요 기능

### 환자 접수 시스템

- 환자 정보 입력: 이름, 나이, 진료실, 담당의 정보 등록
- 진료 항목 선택: 기본 진료항목 및 관리자 설정 항목 사용
- 고유 링크 생성: 각 환자마다 개인별 대기열 확인 링크 발급
- 링크/QR 공유: 링크 복사, 바로가기, QR 이미지 복사/다운로드 지원

### 환자용 대기열 조회

- 1분 자동 업데이트: 대기 시간과 상태 자동 갱신
- 진행률 표시: 시각적 진행률로 현재 대기 상황 확인
- 임박 알림: ETA 5분 이하 경고 및 ETA 0분 이하 상태 강조
- 진료항목별 남은 대기시간 집계 표시
- 모바일 최적화 및 접근성 고려

### 예약 시스템

- 기존 환자 확인: 환자 ID/이름/전화번호 기반 방문 이력 검증
- 날짜 및 시간대 선택: 과거 날짜 차단, 시간대별 정원 반영
- 예약 요약 제공: 예약번호, 예상 대기시간, 복사/공유 지원
- 관리자 예약 관리: 수정, 삭제, 날짜 필터링

### 관리자 기능

- 로그인 보호: `/admin/*` 경로 미들웨어 보호
- 실시간 모니터링: 현재 대기열 조회 및 30초 자동 새로고침
- 대기열 관리: 환자 정보 수정 및 삭제
- 마스터 관리: 진료항목, 의료진, 환자 CRUD
- 예약 정원 관리: 서비스/요일별 규칙 설정
- CSV 업로드: 진료항목별 예상 대기시간 자동 산출 및 적용

## 기술 스택

### Frontend

- Next.js 15.5.7
- React 19
- TypeScript 5
- Tailwind CSS 4
- shadcn/ui
- Framer Motion
- Recharts

### State Management & Data Fetching

- TanStack React Query
- React Hooks

### Development Tools

- ESLint
- Prettier
- Vitest
- pnpm

## 현재 아키텍처 요약

- App Router 기반 단일 Next.js 앱
- API Route Handler: [src/app/api/queue/route.ts](/Users/jisung/Projects/allright/allright-queue/src/app/api/queue/route.ts)
- 관리자 인증 API: [src/app/api/admin/auth/route.ts](/Users/jisung/Projects/allright/allright-queue/src/app/api/admin/auth/route.ts)
- 관리자 보호 미들웨어: [middleware.ts](/Users/jisung/Projects/allright/allright-queue/middleware.ts)
- 대기열 저장소: 메모리 기반 `Map`
- 예약/마스터 데이터 저장소: `localStorage`

## 프로젝트 구조

```text
allright-queue/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── register/page.tsx
│   │   ├── queue/page.tsx
│   │   ├── reservation/page.tsx
│   │   ├── admin/
│   │   │   ├── login/page.tsx
│   │   │   ├── page.tsx
│   │   │   ├── services/page.tsx
│   │   │   ├── doctors/page.tsx
│   │   │   ├── patients/page.tsx
│   │   │   ├── reservations/page.tsx
│   │   │   ├── reservations/capacity/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/
│   │       ├── queue/route.ts
│   │       └── admin/auth/route.ts
│   ├── components/
│   │   ├── charts/
│   │   └── ui/
│   ├── lib/
│   └── types/
├── middleware.ts
├── prompt/prd.md
├── AGENTS.md
└── README.md
```

## 시작하기

### 환경 요구사항

- Node.js v22.18.0 이상
- pnpm

### 설치 및 실행

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:4000](http://localhost:4000) 을 열면 됩니다.

### 빌드 및 실행

```bash
pnpm build
pnpm start
```

## 주요 페이지

### 환자용

- `/` 메인 화면
- `/register` 환자 접수
- `/queue?token=...` 환자별 대기열 조회
- `/reservation` 기존 환자 예약

### 관리자용

- `/admin/login` 관리자 로그인
- `/admin` 관리자 대시보드
- `/admin/services` 진료항목 관리
- `/admin/doctors` 의료진 관리
- `/admin/patients` 환자 관리
- `/admin/reservations` 예약 관리
- `/admin/reservations/capacity` 예약 정원 설정
- `/admin/settings` 설정 화면(UI-only)

## API 엔드포인트

### 대기열 API (`/api/queue`)

- `GET ?token={token}`: 환자 대기열 조회
- `GET ?action=serviceWaitTimes`: 진료항목별 남은 대기시간 집계 조회
- `POST`: 새로운 대기열 등록
- `PUT`: 대기열 수정(관리자 인증 필요)
- `DELETE ?token={token}`: 대기열 삭제(관리자 인증 필요)
- `PATCH ?action=list`: 전체 대기열 목록 조회(관리자 인증 필요)

### 관리자 인증 API (`/api/admin/auth`)

- `POST`: 관리자 로그인
- `DELETE`: 관리자 로그아웃

## 환경 변수

```env
NEXT_PUBLIC_APP_URL=http://localhost:4000
ADMIN_SECRET=change-me
NEXT_PUBLIC_RESERVATION_MAX_PER_SLOT=4
NEXT_PUBLIC_RESERVATION_MAX_PER_DAY=40
NEXT_PUBLIC_HOSPITAL_NAME=올바른정형외과
NEXT_PUBLIC_HOSPITAL_CONTACT=문의: 02-0000-0000
USE_REDIS=false
REDIS_URL=
USE_DB=false
DATABASE_URL=
```

Vitest 실행 시 `.env.test` 파일이 자동으로 로드됩니다.

## 개발 명령어

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm test
pnpm add-component
```

## 현재 알려진 제한사항

- 서버 재시작 시 메모리 기반 대기열은 초기화됩니다.
- 브라우저가 바뀌면 `localStorage` 기반 예약/마스터 데이터는 공유되지 않습니다.
- 관리자 설정값 일부는 실제 계산 로직과 아직 완전히 연결되지 않았습니다.
- 통계 차트는 운영 데이터가 아닌 샘플 데이터입니다.
- 설정/알림 일부는 화면만 있고 실제 저장 또는 외부 연동이 없습니다.

## 남은 작업 요약

- CSV 업로드 템플릿 샘플 제공 및 다운로드
- 평균 외 통계 전략(최대값, 표준편차 등) 추가
- 관리자 UI에서 통계 전략 선택
- 관리자 대시보드 unused 코드 및 ESLint warning 정리
- Redis/PostgreSQL 전환
- 설정 저장 API 및 운영용 백업/모니터링 체계 구축

## 참고 문서

- [prompt/prd.md](/Users/jisung/Projects/allright/allright-queue/prompt/prd.md)
- [AGENTS.md](/Users/jisung/Projects/allright/allright-queue/AGENTS.md)
- [README.en.md](/Users/jisung/Projects/allright/allright-queue/README.en.md)

## 라이선스

이 프로젝트는 [MIT License](./LICENSE) 하에 배포됩니다.
