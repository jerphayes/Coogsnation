# CoogsNation v3.0 Authentication Runtime Repair

## Corrected failure chain

The integrated build could serve the frontend while PostgreSQL authentication operations were unusable. Manual Codespaces development used `localhost:5432`, but the development database service did not publish that port. The example `DATABASE_URL` also used `coogs_dev_password` while the example Compose password used a different value. Those conditions caused handle and login database lookups to fail behind generic API errors.

An upgraded database could also lack the `sessions` table used by `connect-pg-simple`. In that state, credentials could validate and `req.logIn()` could still fail when the session was persisted.

## Repairs

- Development PostgreSQL is published only to `127.0.0.1`; production PostgreSQL remains private.
- `.env.example` uses one matching development password for both host Node and Compose.
- Migration `0005_auth_runtime_readiness.sql` creates the session table and expiration index idempotently.
- Server startup verifies PostgreSQL connectivity plus the `users`, `sessions`, `account_status`, and `session_version` requirements before opening the HTTP listener.
- `/healthz` returns `503` when PostgreSQL is unavailable instead of reporting a false healthy application.
- Handle availability now rejects non-2xx/malformed responses, displays the failure, and aborts stale requests so old results cannot overwrite newer input.
- `npm run auth:doctor` checks `.env` credential agreement and PostgreSQL TCP reachability without printing secrets.

## Existing Codespaces `.env`

The archive intentionally does not include or overwrite `.env`. For an existing workspace, the user, password, port, and database name in `DATABASE_URL` must agree with the matching `POSTGRES_*` values. The default for a brand-new development database is:

```env
DATABASE_URL=postgresql://coogs:coogs_dev_password@localhost:5432/coogsnation
POSTGRES_HOST_PORT=5432
POSTGRES_USER=coogs
POSTGRES_PASSWORD=coogs_dev_password
POSTGRES_DB=coogsnation
```

**Existing Docker volume:** PostgreSQL applies `POSTGRES_PASSWORD` only when a new data volume is initialized. Do not blindly replace the password for an existing volume. Instead, put the password that originally initialized that volume into both `DATABASE_URL` and `POSTGRES_PASSWORD`, or deliberately reset/recreate the disposable development database.

Use a long private `SESSION_SECRET`. These are development-only example credentials; production must use unique secrets and the production Compose file.

## Required Codespaces sequence

```bash
docker compose up -d database
npm run auth:doctor
npm run db:migrate:dev
npm run security:check
npm run check
npm run build
npm run dev
```

For a completely new empty database, run `npm run db:bootstrap` once before `npm run db:migrate:dev`.
