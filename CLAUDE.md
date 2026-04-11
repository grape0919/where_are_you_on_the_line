# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hospital (올바른정형외과) patient queue management system — handles patient registration, queue tracking, reservations, and admin dashboard. Built as a single Next.js 15 App Router application.

**Current storage**: queue data lives in server-side in-memory `Map`; reservations/master data use browser `localStorage`. Redis/PostgreSQL integration is planned but not yet implemented.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server with Turbopack (localhost:3000)
pnpm build            # production build (uses Turbopack)
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm test             # vitest run (all tests)
pnpm test:watch       # vitest in watch mode
pnpm -s tsc --noEmit  # typecheck (used in CI)
```

Run a single test file: `pnpm vitest run src/lib/__tests__/eta.test.ts`

CI runs lint, typecheck, and test on PRs to `main`.

## Architecture

### Route structure

- **Patient pages**: `/` (home), `/register` (check-in), `/queue?token=...` (wait status), `/reservation` (booking)
- **Admin pages**: `/admin/login`, `/admin` (dashboard), `/admin/services`, `/admin/doctors`, `/admin/patients`, `/admin/reservations`, `/admin/reservations/capacity`, `/admin/settings`
- **API routes**: `/api/queue` (CRUD + list via PATCH), `/api/admin/auth` (login/logout)

### Key modules in `src/lib/`

- `queueStore.ts` — `QueueStore` interface with `InMemoryQueueStore` implementation + `computeRemainingWait` helper. `RedisQueueStore` is a placeholder extending `InMemoryQueueStore`.
- `useQueue.ts` — React Query hook for patient queue polling
- `useReservation.ts` — reservation CRUD hook (localStorage-backed)
- `adminAuth.ts` — admin session cookie creation/verification
- `constants.ts` — default service items and wait times
- `waitTimeImport.ts` — CSV upload parsing for service wait time data
- `storage.ts` — localStorage abstraction for master data
- `env.ts` — environment variable access helpers

### Auth flow

Admin routes (`/admin/*` except `/admin/login`) are protected by `middleware.ts` which checks an admin session cookie against `ADMIN_SECRET`. The cookie is set via `/api/admin/auth` POST with HMAC-based verification in `src/lib/adminAuth.ts`.

### Types

- `src/types/queue.ts` — `QueueData`, `QueueState`
- `src/types/domain.ts` — `ServiceItem`, `DoctorItem`, `PatientItem`, `ReservationData`, `ReservationCapacityRule`

### Data flow

Queue API (`/api/queue/route.ts`) is the only server-side data endpoint. Admin-authenticated requests use `Authorization: Bearer <token>` header verified against the admin cookie. Master data (services, doctors, patients, capacity rules) is managed entirely client-side in localStorage via hooks.

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

Copy `.env.example` to `.env`. Key variables: `ADMIN_SECRET` (required for admin auth), `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_DEV_PREFILL` (enables demo data prefill in forms). Feature flags `USE_REDIS` and `USE_DB` exist but are not yet functional.
