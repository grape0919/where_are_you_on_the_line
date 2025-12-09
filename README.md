# 올바른정형외과 대기열 관리 시스템

> English version: [README.en.md](./README.en.md)

올바른정형외과의 환자 대기열을 실시간으로 관리하는 웹 애플리케이션입니다. 환자 접수부터 대기 현황 확인, 관리자 대시보드까지 모든 기능을 제공합니다.

## 🚀 주요 기능

### 환자 접수 시스템

- **환자 정보 입력**: 이름, 나이, 진료실, 담당의 정보 등록
- **진료 항목 선택**: 일반진료(10분), 재진(5분), 검사(15분), 처방(3분)
- **고유 링크 생성**: 각 환자마다 개인별 대기열 확인 링크 발급
- **링크 공유**: 복사 및 바로가기 기능으로 환자에게 쉽게 전달

### 실시간 대기열 조회

- **3분 자동 업데이트**: 실시간으로 대기 시간 갱신
- **진행률 표시**: 시각적 진행률 바로 대기 상황 확인
- **모바일 최적화**: 반응형 디자인으로 모든 기기에서 사용 가능
- **접근성 지원**: 모션 감소 설정, ARIA 라벨 등 접근성 고려

### 관리자 대시보드

- **실시간 모니터링**: 현재 대기 중인 모든 환자 현황
- **환자 정보 관리**: 이름, 나이, 진료실, 담당의, 진료항목, 대기시간 수정
- **대기열 삭제**: 완료된 환자 대기열 제거
- **통계 정보**: 전체 대기, 임박 환자(5분 이내), 완료 환자 수 표시
- **30초 자동 새로고침**: 실시간 데이터 업데이트

## 🛠 기술 스택

### Frontend

- **Next.js 15.5.0** - App Router 기반 React 프레임워크
- **TypeScript 5** - 타입 안전성 보장
- **Tailwind CSS 4** - 유틸리티 기반 CSS 프레임워크
- **shadcn/ui** - Radix UI 기반 컴포넌트 라이브러리
- **Framer Motion** - 부드러운 애니메이션 효과

### State Management & Data Fetching

- **TanStack React Query** - 서버 상태 관리 및 폴링
- **React Hooks** - 로컬 상태 관리

### Development Tools

- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포맷팅
- **pnpm** - 패키지 매니저

## 📁 프로젝트 구조

```
allright-queue/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # 루트 레이아웃
│   │   ├── page.tsx              # 홈페이지 (메인 대시보드)
│   │   ├── globals.css           # 전역 스타일
│   │   ├── providers.tsx         # React Query Provider
│   │   ├── register/
│   │   │   └── page.tsx          # 환자 접수 페이지
│   │   ├── queue/
│   │   │   └── page.tsx          # 대기열 조회 페이지
│   │   ├── admin/                # 관리자 섹션
│   │   │   ├── layout.tsx        # 관리자 레이아웃
│   │   │   ├── page.tsx          # 관리자 대시보드
│   │   │   ├── doctors/
│   │   │   │   └── page.tsx      # 의사 관리 페이지
│   │   │   ├── patients/
│   │   │   │   └── page.tsx      # 환자 관리 페이지
│   │   │   ├── services/
│   │   │   │   └── page.tsx      # 서비스 관리 페이지
│   │   │   └── settings/
│   │   │       └── page.tsx      # 설정 페이지
│   │   └── api/
│   │       └── queue/
│   │           └── route.ts      # 대기열 API 엔드포인트
│   ├── components/
│   │   └── ui/                   # shadcn/ui 컴포넌트들
│   │       ├── alert.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── select.tsx
│   │       ├── separator.tsx
│   │       ├── switch.tsx
│   │       └── tabs.tsx
│   └── lib/
│       ├── useQueue.ts           # 대기열 관련 커스텀 훅
│       └── utils.ts              # 유틸리티 함수들
├── public/                       # 정적 파일들
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── .cursor/                      # Cursor IDE 설정
├── .cursorrules                  # Cursor IDE 규칙
├── components.json               # shadcn/ui 설정
├── eslint.config.mjs             # ESLint 설정
├── next.config.ts                # Next.js 설정
├── postcss.config.mjs            # PostCSS 설정
├── tailwind.config.ts            # Tailwind CSS 설정
├── tsconfig.json                 # TypeScript 설정
└── package.json                  # 프로젝트 의존성 및 스크립트
```

## 🚀 시작하기

### 환경 요구사항

- Node.js v22.18.0 이상
- pnpm 패키지 매니저

### 설치 및 실행

1. **의존성 설치**

   ```bash
   pnpm install
   ```

2. **개발 서버 실행**

   ```bash
   pnpm dev
   ```

3. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

### 빌드 및 배포

```bash
# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start
```

## 📖 사용 방법

### 1. 환자 접수

1. 홈페이지에서 "접수 시작" 클릭
2. 환자 정보 입력 (이름, 나이, 진료실, 담당의)
3. 진료 항목 선택
4. "접수 완료" 클릭
5. 생성된 고유 링크를 환자에게 전달

### 2. 대기열 확인 (환자용)

1. 접수 시 받은 링크로 접속
2. 실시간 대기 시간 및 진행률 확인
3. 3분마다 자동으로 정보 업데이트

### 3. 관리자 대시보드

1. 홈페이지에서 "대시보드 열기" 클릭
2. 현재 대기 중인 모든 환자 현황 확인
3. 환자 정보 수정 또는 삭제
4. 통계 정보 모니터링

## 🔧 API 엔드포인트

### 대기열 관리 API (`/api/queue`)

- **GET** `?token={token}` - 대기열 상태 조회
- **POST** - 새로운 대기열 등록
- **PUT** - 대기열 정보 업데이트
- **DELETE** `?token={token}` - 대기열 삭제
- **PATCH** `?action=list` - 관리자용 전체 대기열 목록

## 🎨 UI/UX 특징

- **한국어 인터페이스**: 의료 환경에 최적화된 한국어 UI
- **모바일 우선**: 모바일 기기에서 최적의 사용자 경험
- **접근성**: 키보드 네비게이션, 스크린 리더 지원
- **애니메이션**: 부드러운 전환 효과 (모션 감소 설정 지원)
- **실시간 피드백**: 로딩 상태, 에러 처리, 성공 메시지

## 🔒 보안 및 데이터

- **고유 토큰**: 각 환자마다 고유한 대기열 토큰 생성
- **URL 인코딩**: 안전한 URL 파라미터 처리
- **에러 처리**: 적절한 에러 메시지 및 복구 방법 제공
- **데이터 검증**: 입력 데이터 유효성 검사

## 🚧 개발 환경

### 스크립트

```bash
pnpm dev          # 개발 서버 실행 (Turbopack)
pnpm build        # 프로덕션 빌드
pnpm start        # 프로덕션 서버 실행
pnpm lint         # ESLint 실행
pnpm format       # Prettier 포맷팅
pnpm add-component # shadcn/ui 컴포넌트 추가
```

### 환경 변수

현재는 기본 설정으로 동작하며, 필요시 다음 환경 변수를 추가할 수 있습니다:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vitest를 실행할 때는 `.env.test` 파일이 자동으로 로드되므로, 테스트 전용 값이 필요하면 이 파일을 수정하세요.

## 🤝 기여하기

1. 이슈 생성 또는 기존 이슈 확인
2. 기능 브랜치 생성 (`feature/기능명`)
3. 코드 작성 및 테스트
4. Pull Request 생성

## 📄 라이선스

### 프로젝트 라이선스

이 프로젝트는 **MIT 라이선스** 하에 배포됩니다.

### 의존성 라이선스 검토

상업용 배포 시 라이선스 호환성 검토 결과:

#### ✅ 상업용 배포 가능한 라이선스

- **MIT 라이선스**: Next.js, React, React DOM, Radix UI 컴포넌트들, Framer Motion, TanStack React Query, clsx, tailwind-merge, Tailwind CSS, TypeScript, ESLint, Prettier
  - 상업용 사용 가능
  - 라이선스 및 저작권 고지 필요
  - 수정 및 배포 자유

- **ISC 라이선스**: Lucide React
  - MIT 라이선스와 유사
  - 상업용 사용 가능
  - 라이선스 고지 필요

- **Apache-2.0 라이선스**: class-variance-authority
  - 상업용 사용 가능
  - 라이선스 및 저작권 고지 필요
  - 수정 및 배포 자유

#### 📋 라이선스 준수 사항

상업용 배포 시 다음 사항을 준수해야 합니다:

1. **라이선스 고지**: 각 라이브러리의 라이선스 텍스트를 프로젝트에 포함
2. **저작권 고지**: 원본 저작권자 정보 유지
3. **라이선스 파일**: `LICENSE` 파일에 프로젝트 라이선스 명시
4. **의존성 라이선스**: `package.json`에 각 패키지의 라이선스 정보 포함

#### 🚨 주의사항

- 모든 주요 의존성이 상업용 배포에 적합한 라이선스를 사용
- 라이선스 위반 위험은 **낮음**
- 단, 라이선스 고지 의무는 반드시 준수해야 함

---

**개발**: Jeongjibsa  
**버전**: 1.0.0  
**최종 업데이트**: 2025.08.25
