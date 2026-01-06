# Admin Password Auth

This project protects the admin UI using a **password stored in `ADMIN_SECRET`** (server-only env).

## What to set

- Set `ADMIN_SECRET` in your runtime environment (recommended: `.env.local`).
- Do **not** use `NEXT_PUBLIC_` prefix.

## How it works

### 1) Guard `/admin/*` with middleware

- `middleware.ts` intercepts `/admin/:path*`.
- `/admin/login` is excluded.
- If the user does not have a valid admin session cookie, they are redirected to:
  - `/admin/login?next=/admin/...`

### 2) Login API issues a signed HttpOnly session cookie (12h)

- `POST /api/admin/auth`:
  - Validates the submitted password against `ADMIN_SECRET`.
  - Issues `admin_session` cookie (HttpOnly, 12 hours).
- `DELETE /api/admin/auth`:
  - Clears the cookie (logout).

The cookie value is **stateless** and signed (HMAC-SHA256) so it can be verified by both:
- middleware (UI access)
- admin-only API endpoints (data access)

### 3) Admin-only queue APIs are protected

`src/app/api/queue/route.ts` rejects admin mutations/queries without a valid cookie:
- `PUT /api/queue` (admin update)
- `DELETE /api/queue` (admin delete)
- `PATCH /api/queue?action=list` (admin list)

## Notes

- If `ADMIN_SECRET` is missing, the login screen will show a configuration error.
- In production, the cookie is set with `secure: true`.


