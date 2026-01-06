# Queue Refresh + Service Wait Times

The patient queue page supports:

- Auto refresh every **1 minute**
- Manual refresh via the refresh button
- Display of **remaining wait time per service**

## Auto refresh

- `useQueue(token)` uses React Query polling (`refetchInterval = 60_000`).

## Manual refresh

- The refresh button triggers both:
  - patient queue refetch
  - service wait times refetch

## Service wait times API

- `GET /api/queue?action=serviceWaitTimes`
  - Public endpoint (no admin auth)
  - Returns aggregated wait times per service:
    - `waitingCount`: number of active waiting items
    - `remainingTotalMinutes`: sum of remaining minutes across active items

## UI

- The queue page renders a card under the ticket card:
  - List of services
  - Waiting count
  - Total remaining minutes (formatted as minutes/hours)


