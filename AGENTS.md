# Agent Handbook

## Core References

- `prompt/prd.md` captures the product vision, scope, and phased roadmap. Keep features and narratives aligned with it.
- `.cursorrules` outlines the expected analysis, planning, and implementation discipline; follow it for every task.
- This handbook consolidates repo specifics; update it whenever workflows or conventions change.
- State an implementation plan immediately after each task request, then pause for the user’s confirmation before touching code.
- Obtain explicit user approval before creating new files or modifying existing files unless the user instruction says otherwise.
- Share and agree on an implementation plan before making code changes.
- Always respond to the user in Korean.
- Keep this handbook written in English.

## Project Structure & Module Organization

- Source lives in `src/`.
  - `src/app/` — Next.js App Router routes, layouts, and API handlers (e.g., `page.tsx`, `register/page.tsx`, `admin/*`, `api/queue/route.ts`).
  - `src/components/` — shared presentation logic (`ui/*`, charts, and other shared components).
  - `src/lib/` — hooks and utilities (`useQueue.ts`, `useReservation.ts`, helpers).
  - `src/types/` — shared TypeScript types.
  - `public/` — static assets.
- Avoid introducing new top-level folders without prior agreement; colocate new files within the existing hierarchy.

## Build, Test, and Development Commands

- `pnpm dev` — run the local dev server (Turbopack) at `http://localhost:3000`.
- `pnpm build` — create a production build.
- `pnpm start` — boot the production server.
- `pnpm lint` — run ESLint.
- `pnpm format` — apply Prettier formatting.
- `pnpm add-component` — scaffold shadcn/ui components.

## Coding Style & Naming Conventions

- Language: TypeScript + React (Next.js 15, App Router).
- Formatting: Prettier (2-space indent, 100 char width); run `pnpm format` before committing.
- Linting: ESLint with `next/core-web-vitals` and TanStack Query rules; fix warnings where feasible.
- Components: filenames lowercase (`button.tsx`), exported component identifiers PascalCase.
- Hooks: `useX` naming in `src/lib/` (e.g., `useReservation.ts`).
- Styles: Tailwind CSS 4 utilities; keep class names near usage (`cn` helpers when merging).
- Documentation: author Markdown guidance in English. README may remain bilingual with a full English variant.
- Tests: pair new features with Vitest unit tests (`src/**/__tests__` or `*.test.ts(x)`).

## Testing Guidelines

- Preferred stack: Vitest + React Testing Library (configure as needed).
- Focus on unit-level coverage; mock network layers for data fetching logic.
- Ensure `pnpm test` (once configured) is reliable in CI.

## Commit & Pull Request Guidelines

- Commit messages: descriptive; Conventional Commit style encouraged (`feat:`, `fix:`, etc.).
- Branches: English, kebab-case with prefixes (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`, `perf/`, `test/`).
- Scope changes tightly; run `pnpm lint && pnpm format` before pushing.
- PRs must include problem statement, change summary, UI captures when relevant, and follow-up notes.
- Auto-generated PRs: label `auto-generated` and prefix title with `[gen by codex]`.

## Security & Configuration Tips

- Do not commit secrets; store them in `.env.local` (e.g., `NEXT_PUBLIC_APP_URL`).
- Keep server-only logic inside `src/app/api/*`; avoid leaking sensitive data to client components.
- Favour permissive-licence dependencies and update `DEPENDENCIES.md` when adding new packages.
- 예약 정원과 안내 메시지는 `NEXT_PUBLIC_RESERVATION_MAX_PER_SLOT`, `NEXT_PUBLIC_RESERVATION_MAX_PER_DAY`, `NEXT_PUBLIC_HOSPITAL_NAME`, `NEXT_PUBLIC_HOSPITAL_CONTACT`로 조정합니다.

## Cursor Process Snapshot

- **Analysis** — identify the task type, constraints, implicit requirements, and success criteria before coding.
- **Solution Planning** — outline modular steps, dependencies, alternatives, and validation strategy.
- **Implementation Strategy** — select patterns, safeguard performance, handle errors, and meet accessibility best practices.

## PRD Execution Checklists

Keep these checklists in sync with delivery status. Check items (`[x]`) as they are implemented and tested.

### Phase A — Registration Flow (PRD §4.1)

- [x] Validate name, age, and service inputs with clear feedback (alerts + required fields in `src/app/register/page.tsx:61`).
- [x] Auto-select room when a doctor is chosen; allow optional overrides (localStorage lookup in `src/app/register/page.tsx:123`).
- [x] POST `/api/queue` issues secure tokens and returns queue URLs (see `src/app/api/queue/route.ts:45`).
- [x] Success path resets the form and surfaces token/ETA details (`src/app/register/page.tsx:86`).
- [x] Default wait times per service remain configurable (service constants in `src/lib/constants.ts:1`).

### Phase B — Queue Experience (PRD §4.2)

- [x] Queue page renders patient details, ETA countdown, and status tabs (“Info”, “Notify”) (`src/app/queue/page.tsx:110`).
- [x] React Query polls every 3 minutes with manual refresh + “last updated” timestamp (`src/lib/useQueue.ts:9` and `src/app/queue/page.tsx:56`).
- [x] Handle missing/invalid tokens gracefully with remediation guidance (`src/app/queue/page.tsx:79`).
- [x] Display warnings inside the 5-minute window and highlight “about to be called” state at ETA ≤ 0 (`src/app/queue/page.tsx:48`).
- [x] Token format (`Q-<base36>-<rand>`) remains opaque and collision resistant (`src/app/api/queue/route.ts:113`).

### Phase C — Reservation Flow (PRD §4.3)

- [x] Enforce visit eligibility (patientId starting with `P`) before reservation submission (`src/app/reservation/page.tsx:62`).
- [x] Validate name, patientId, phone, service, and date (`src/app/reservation/page.tsx:84`).
- [x] Persist reservations (current: `localStorage`; future: Redis/PostgreSQL) with collision-resistant IDs (`src/lib/useReservation.ts:36`).
- [x] Return reservation summary with copy/share affordances (복사/공유 버튼 및 핸들러 `src/app/reservation/page.tsx:411`).
- [x] Provide calendar UI with blocked past dates and configurable slots (과거 날짜 차단 + 슬롯 선택 UI `src/app/reservation/page.tsx:292`, `src/lib/constants.ts:12`).
- [x] Control of reservation capacity by time slot and day, and provision of standardized notification messages (`src/lib/useReservation.ts:52`, `src/app/reservation/page.tsx:292`).

### Phase D — Admin Dashboard (PRD §4.4)

- [x] List queue entries via `PATCH /api/queue?action=list` with 30s polling (`src/app/admin/page.tsx:57`).
- [ ] Support inline edits with immediate persistence and optimistic UI (edits rely on refetch without optimism in `src/app/admin/page.tsx:147`).
- [x] Confirm destructive actions (delete, complete) and reflect results instantly (`src/app/admin/page.tsx:167`).
- [x] Surface statistics (total, urgent, completed) and aging/ETA insights (`src/app/admin/page.tsx:210`).
- [ ] Enforce admin authentication/authorization across UI and API (no auth guard in `src/app/admin/page.tsx` or related API handlers).

### Phase E — Masters & Settings (PRD §4.5)

- [x] Services CRUD with enable/disable flags and wait time configuration (current storage: `localStorage`) (`src/app/admin/services/page.tsx:20`).
- [x] Doctors CRUD with room auto-fill, specialties, contact details, enable/disable (`src/app/admin/doctors/page.tsx:20`).
- [x] Patients CRUD supporting notes and status toggles (`src/app/admin/patients/page.tsx:20`).
- [x] Settings screen wiring for auto refresh, notifications, and other toggles (UI-only until backend ready) (`src/app/admin/settings/page.tsx:1`).
- [x] Reservation capacity rules manageable via admin UI (`src/app/admin/reservations/capacity/page.tsx`).
- [ ] Plan persistence migration path from `localStorage` to backend stores (no documented migration plan yet).

### Infrastructure & Operations Roadmap (PRD §2, §6, §8, §9)

- [ ] Introduce Redis for real-time queue/reservation state (keys, TTL, list queries) (placeholder store in `src/lib/queueStore.ts:27`).
- [ ] Add PostgreSQL schema for masters, history, accounts, and migrations (schema/migrations absent).
- [ ] Implement admin login and patient token verification middleware (authentication not wired).
- [ ] Split API server when needed, define CORS policy, and manage environment secrets (not started).
- [ ] Enhance reservation logic (history dedup, time slots) with SMS/Kakao notification hooks (current flow uses simple heuristics only).
- [ ] Persist settings via server APIs and harden the deployment pipeline (health checks, backups, monitoring) (UI only, ops automation pending).
