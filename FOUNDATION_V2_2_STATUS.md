# CoogsNation Foundation v2.2 Status

Foundation v2.2 is the corrected development baseline following independent review of v2.1.

## Corrections in this revision

- Replaced the unsupported `displayName` form field with the persisted `nickname` field.
- Replaced the unsupported `hometown` form field with the persisted `city` field.
- Removed `email` from the editable profile form; it is displayed read-only and reserved for an account-security workflow.
- Disabled legacy privacy switches that had no database-backed settings and incorrectly shared the strict profile schema.
- Updated profile header display logic to use `nickname`/`handle` and `city`/`location`.
- Added an executable test for the exact Advanced Profile form payload.
- Added a static form/schema contract test so registered form fields cannot silently drift outside the strict server allowlist.
- Documented `APP_ORIGIN` as required in production for CSRF and Socket.IO origin enforcement.
- Removed committed upload artifacts from the distributable source tree; `uploads/` remains ignored.

## Required production setting

Set `APP_ORIGIN` to the exact HTTPS public origin, without a trailing slash. Example:

```env
APP_ORIGIN=https://coogsnation.com
```

Do not rely solely on inferred proxy headers behind Cloudflare and Render.

## Remaining stabilization work

- Resolve the pre-existing client TypeScript backlog.
- Type `req.user` and eliminate `req: any` in authenticated routes.
- Add database-backed ownership integration tests.
- Replace Replit-specific deployment assumptions.
- Move uploads to R2 and SQLite learning data to PostgreSQL before Render deployment.
