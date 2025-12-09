# Allright Orthopedics Queue Management System

A web app to manage patient queues and reservations in real time. Patients can register and monitor ETA; staff can view and edit the queue from an admin dashboard.

## Features

- Patient registration: name, age, service; generates a unique queue link
- Real-time queue view: ETA, progress, last updated, mobile-friendly
- Admin dashboard: list, edit, delete, complete, and quick stats (30s refresh)
- Masters: services, doctors, patients (stored in localStorage for now)
- Reservation (returning patients): basic visit check and calendar input

## Tech Stack

- Next.js 15 (App Router), React 19, TypeScript
- Tailwind CSS 4, shadcn/ui (Radix)
- React Query for polling and cache
- ESLint + Prettier

## Project Structure

- `src/app/` routes (register, queue, reservation, admin) and API (`api/queue`)
- `src/components/ui/` shared UI components
- `src/lib/` hooks, utils, constants, storage helpers
- `src/types/` shared domain and API types

## Development

- Install: `pnpm install`
- Dev: `pnpm dev` (Turbopack)
- Lint: `pnpm lint`
- Format: `pnpm format`
- Build: `pnpm build`
- Test: `pnpm test`

## Environment

- `NEXT_PUBLIC_APP_URL` for app URL

Vitest automatically loads `.env.test`, so adjust this file if tests require specific values.

- Redis (planned) for real-time queue/reservation
- PostgreSQL (planned) for history/masters/accounts

See `prompt/prd.md` for the English PRD and architecture details.
