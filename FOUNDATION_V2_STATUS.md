# CoogsNation Foundation v2 — Security Stabilization

This revision applies the validated high-impact corrections from the independent original-source review. It is a security-stabilization build, not yet a production release.

## Added or corrected

- Deleted the unauthenticated legacy `/api/upload-avatar` route.
- Removed the duplicate unprotected `/objects/:objectPath(*)` registration.
- Added Express/Passport user typing for the canonical `{ id, provider }` shape.
- Shared the authoritative PostgreSQL session middleware with Socket.IO.
- Restricted Socket.IO origins and required authenticated sessions.
- Required verified UH-community membership for CoogPaws socket connections.
- Stopped trusting client-supplied user IDs in the AI socket namespace.
- Added login and AI endpoint rate limits.
- Required authentication for AI ask, moderation, and voting endpoints.
- Changed moderation-service failures to fail closed.
- Removed SVG from the general image-upload allowlist.
- Added authenticated-request Origin/Referer validation for unsafe API methods.
- Added `/healthz`, graceful SIGTERM/SIGINT handling, and fatal-process handling.
- Added `.env`, key, certificate, upload, and log exclusions to `.gitignore`.
- Added `npm run security:check` source-regression checks.
- Replaced ineffective POD API timeout options with `AbortSignal.timeout()`.
- Removed the stale, schema-incompatible `server/migrate-users.ts` trap.

## Still open before production

- The original TypeScript error backlog must be reduced to zero.
- The remaining `req: any` handlers must be typed systematically.
- Integration tests are still required for forum ownership and all privileged writes.
- Replit-specific OAuth/domain configuration must be replaced or made optional for Render.
- Local/SQLite persistent data must move to PostgreSQL or managed object storage.
- Uploads must be completed against Cloudflare R2 for Render deployment.
- Route modularization remains deferred until typing and tests protect behavior.

## Validation commands

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
```

The archive passed structural source checks and ZIP integrity testing in the preparation environment. A clean dependency installation was not completed there, so TypeScript and runtime validation remain mandatory in GitHub Codespaces.
