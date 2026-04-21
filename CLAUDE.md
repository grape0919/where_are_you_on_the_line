# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hospital (올바른정형외과) patient queue management system — handles patient registration, queue tracking, reservations, and admin dashboard. Built as a single Next.js 15 App Router application.

**Storage**: `USE_DB=true` → PostgreSQL via Prisma ORM (`PostgresQueueStore`), otherwise in-memory `Map` (`InMemoryQueueStore`). Operating hours settings also persist to PostgreSQL when DB mode is active. Reservations/master data use browser `localStorage`.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server with Turbopack (localhost:4000)
pnpm build            # production build (uses Turbopack)
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm test             # vitest run (all tests)
pnpm test:watch       # vitest in watch mode
pnpm -s tsc --noEmit  # typecheck (used in CI)
```

Run a single test file: `pnpm vitest run src/lib/__tests__/eta.test.ts`

```bash
# Database (Prisma)
npx prisma generate        # regenerate client after schema change
npx prisma migrate dev      # create + apply migration (dev)
npx prisma migrate deploy   # apply pending migrations (prod)
```

```bash
# Docker
docker compose up -d                                  # production (build + PostgreSQL)
docker compose -f docker-compose.dev.yml up -d        # development (hot reload + PostgreSQL)
```

CI runs lint, typecheck, and test on PRs to `main`.

## Architecture

### Route structure

- **Patient pages**: `/` (home), `/queue?token=...` (wait status), `/reservation` (booking)
  - `/register` exists but registration is now staff-initiated from the admin dashboard
- **Admin pages**: `/admin/login`, `/admin` (dashboard — registration form + kanban), `/admin/services`, `/admin/doctors`, `/admin/patients`, `/admin/reservations`, `/admin/reservations/capacity`, `/admin/settings`
- **API routes**: `/api/queue` (CRUD + list + status transitions via PATCH), `/api/settings` (operating hours GET/PUT), `/api/admin/auth` (login/logout)

### Key modules in `src/lib/`

- `prisma.ts` — Prisma client singleton (uses `@prisma/adapter-pg` for Prisma v7). Only instantiated when `USE_DB=true`.
- `postgresQueueStore.ts` — `PostgresQueueStore` implements `QueueStore` with PostgreSQL persistence. Uses write-through cache (in-memory Map + async DB writes). `loadFromDb()` hydrates cache on server start.
- `queueStore.ts` — `QueueStore` interface with `InMemoryQueueStore` implementation. Key helpers: `getActiveQueue` (confirmed + in_progress, sorted by createdAt), `computeQueueMetrics` (per-patient wait metrics within doctor's queue), `recalculateAllMetrics` (bulk recalculate all active patients grouped by doctor). `RedisQueueStore` is a placeholder.
- `autoReset.ts` — operating hours stored server-side in-memory (`OperatingHoursRule[]`). `startAutoResetScheduler` runs a 1-minute interval that calls `store.clear()` when current time ≥ `closeTime + 2h`. Also exposes `getOperatingHours`/`setOperatingHours` used by `/api/settings`.
- `notification.ts` — 알림 발송. `sendNotification(payload)`은 알리고 환경변수 (`ALIGO_API_KEY`/`ALIGO_USER_ID`/`ALIGO_SENDER`)가 설정되면 실제 SMS 발송, 아니면 콘솔 로그만 (개발 모드). `checkAndNotifyApproaching(store)` auto-detects confirmed patients with ETA ≤ 10 min and fires a one-time approaching notification per patient. Called after every `recalculateAllMetrics`. Notification history is in-memory (`Set<token>`) and cleared on patient complete/cancel/queue reset.
- `aligoSms.ts` — 알리고 SMS API 클라이언트 (`https://apis.aligo.in/send/`). `sendAligoSms({receiver, msg, title?})` 단일 엔트리. SMS/LMS는 msg 길이로 자동 분기. `ALIGO_TESTMODE=Y` 로 실제 발송 없이 테스트 가능.
- `useQueue.ts` — React Query hook for patient queue polling
- `useReservation.ts` — reservation CRUD hook (localStorage-backed)
- `adminAuth.ts` — admin session cookie creation/verification
- `constants.ts` — default service items, wait times, `QUEUE_STATUS_LABELS`, `QUEUE_STATUS_COLORS`
- `waitTimeImport.ts` — CSV upload parsing for service wait time data
- `storage.ts` — localStorage abstraction for master data (`getActiveServices`, `getActiveDoctors`, `getJSON`)
- `env.ts` — environment variable access helpers

### Auth flow

Admin routes (`/admin/*` except `/admin/login`) are protected by `middleware.ts` which checks an admin session cookie against `ADMIN_SECRET`. The cookie is set via `/api/admin/auth` POST with HMAC-based verification in `src/lib/adminAuth.ts`.

### Types

- `src/types/queue.ts` — `QueueData`, `QueueState`, `QueueStatus` (`confirmed | in_progress | completed | cancelled`)
- `src/types/domain.ts` — `ServiceItem`, `DoctorItem`, `PatientItem`, `ReservationData`, `ReservationCapacityRule`, `OperatingHoursRule`, `WeekdayToken`

### Data flow

Two server-side data endpoints:
- `/api/queue` — patient queue CRUD (GET by token, POST to register, PUT to edit, DELETE, PATCH for list/status transitions/reset). All mutating ops call `recalculateAllMetrics` after changes.
- `/api/settings` — operating hours CRUD backed by module-level state in `autoReset.ts`.

Admin dashboard requests authenticate via the admin session cookie (verified server-side on each request). Master data (services, doctors, patients, capacity rules) is managed entirely client-side in localStorage via hooks.

### Notification flow (Aligo SMS)

| Trigger | Type | Timing |
|---------|------|--------|
| 환자 접수 (POST /api/queue) | `registration` | 즉시 (순번·예상대기·조회URL 포함) |
| 예상 대기 ≤ 10분 (recalculate 후) | `approaching` | 자동 감지, 환자당 1회 |
| 진료 시작 (startTreatment) | `in_progress` | 현재 비활성 (주석 처리) |

발송 채널: **알리고 SMS** (`aligoSms.ts`). 3개 env (`ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER`) 모두 설정 시 실제 발송, 아니면 `[Notification/dev]` 콘솔 로그만. `ALIGO_TESTMODE=Y`로 과금 없이 테스트 가능.

메시지 템플릿은 `notification.ts:buildMessage()`에 정의. SMS 90자 초과 시 알리고가 LMS로 자동 분기. Notification history (`approachingNotifiedTokens`)는 메모리 `Set<token>`이며 환자 완료/취소/대기열 초기화 시 삭제.

### Queue status machine

```
confirmed → in_progress → completed
    ↓              ↓
 cancelled      cancelled
```

Enforced in `VALID_STATUS_TRANSITIONS` (queueStore.ts) and at the API layer. Additional constraint: **only one `in_progress` patient per doctor** — `startTreatment` is rejected if the same doctor already has a patient in progress.

### Admin dashboard behavior

- Polls `/api/queue?action=list` (PATCH) every 10 seconds
- Staff registers patients directly from the admin dashboard (name, phone, treatment items, doctor)
- Active queue displayed as **kanban grouped by doctor** — each doctor column shows confirmed + in_progress patients sorted by `queuePosition`
- Browser notification + audio (`/notification.mp3`) triggered when active count increases
- `/api/settings` is unauthenticated for GET (operating hours display) but requires admin cookie for PUT

## Coding Conventions

- **Language**: TypeScript, prefer interfaces over types, avoid enums (use const maps)
- **Formatting**: Prettier — 2-space indent, 100 char width, double quotes, trailing commas (es5)
- **Components**: filenames lowercase with dashes (`auth-wizard.tsx`), exports PascalCase
- **Hooks**: `useX` pattern in `src/lib/`
- **Styling**: Tailwind CSS 4 utilities, `cn()` helper from `src/lib/utils.ts` for class merging
- **UI components**: shadcn/ui in `src/components/ui/`, add new ones with `pnpm add-component`
- **Event handlers**: prefix with `handle` (e.g., `handleClick`, `handleSubmit`)
- **State variables**: use auxiliary verbs (`isLoading`, `hasError`)
- **Tests**: Vitest, placed in `__tests__/` directories or `*.test.ts(x)` files. `.env.test` is auto-loaded.

## Git Conventions

- Commit style: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `perf:`, `test:`)
- Branch naming: English, kebab-case with prefixes (`feat/`, `fix/`, `docs/`, etc.)
- Run `pnpm lint && pnpm format` before committing
- Always respond to the user in Korean

## Environment Variables

Copy `.env.example` to `.env`. Key variables: `ADMIN_SECRET` (required for admin auth), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEV_PREFILL` (enables demo data prefill in forms). `USE_DB=true` + `DATABASE_URL` enables PostgreSQL persistence via Prisma. `USE_REDIS` exists but is not yet functional.
