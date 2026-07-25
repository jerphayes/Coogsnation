# CoogsNation Foundation Baseline

This baseline removes known authentication and authorization conflicts before further feature work.

## Changes included

- Removed the hard-coded, in-memory session middleware from `server/index.ts`.
- Retained one PostgreSQL-backed session configuration in `server/replitAuth.ts`.
- Required `SESSION_SECRET` and `DATABASE_URL` at startup.
- Allowed `localhost` as the development-only Replit domain fallback.
- Added a `users.role` field with `member` as the safe default.
- Added `requireAdmin` authorization middleware backed by the current database user.
- Protected every `/api/admin/*` endpoint with `requireAdmin`.
- Protected campus-location create, update, and delete operations with `requireAdmin`.
- Removed duplicate public admin routes and the duplicate handle-check route.
- Replaced legacy `req.user.claims.sub` access with the standardized `req.user.id`.
- Removed response-body API logging.
- Changed the global error handler so it logs safely and does not throw after sending a response.
- Removed fabricated admin activity records; the endpoint now returns an empty baseline until an audit-log table is implemented.

## Required deployment steps

1. Apply `migrations/0001_add_user_role.sql`.
2. Promote the intended owner account to `admin` directly in PostgreSQL.
3. Set strong `SESSION_SECRET`, `DATABASE_URL`, and production OAuth environment variables.
4. Run `npm ci`, `npm run check`, and `npm run build` in a normal network-enabled Node environment.

## Deliberately deferred

- Splitting `server/routes.ts` into domain routers.
- Implementing a persistent admin audit log.
- Completing SMS MFA and secure social-account merging.
- Removing unused alternate pages and legacy UI experiments.
- End-to-end authentication, forum, event, store, and messaging tests.
