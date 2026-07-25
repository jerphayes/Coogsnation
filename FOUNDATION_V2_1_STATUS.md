# CoogsNation Foundation v2.1 — Mass-Assignment and Response-Safety Fix

Foundation v2.1 incorporates the independent review of Foundation v1 and retains the broader Foundation v2 security work. It remains a stabilization build, not a production release.

## Release-blocking corrections implemented

- Replaced the users-table-derived `userProfileUpdateSchema` denylist with an explicit `z.object(...).strict()` allowlist.
- Self-service profile requests now reject `role`, password fields, verification/MFA fields, lockout fields, account-type fields, profile-completion flags, and every other unknown key.
- Replaced the original `createSafeUser` denylist with an explicit public-member response allowlist.
- Added separate explicit response allowlists for:
  - public/member-visible data (`createSafeUser`),
  - the authenticated user's own data (`createSelfUser`), and
  - administrator account listings (`createAdminSafeUser`).
- Token hashes, password hashes, backup email, MFA material, and verification internals are excluded from all three response shapes.
- Street address, phone number, date of birth, and private profile notes are excluded from public and admin member listings.
- The profile-completion route no longer returns the raw database user record.
- The Advanced Profile page now calls the secured `/api/auth/upload-avatar` endpoint and no longer submits a client-controlled `userId`.
- Corrected the Advanced Profile update call to use the existing authenticated `PUT /api/users/profile` endpoint.
- Removed the unsupported `addressLine2` field from that form rather than allowing a non-database field through the strict schema.

## Regression tests added

`npm run security:check` now runs:

1. Static route/session/socket/security checks.
2. Executable profile mass-assignment and safe-response tests.
3. Administrator middleware tests proving:
   - unauthenticated request → 401,
   - member → 403,
   - database-authorized admin → next handler,
   - missing database user → 401.

The schema test specifically proves that `{ "role": "admin" }` and other account/security fields are rejected.

## Retained Foundation v2 protections

- One PostgreSQL-backed session system.
- Database-authoritative administrator checks.
- No anonymous admin data dump.
- Legacy unauthenticated avatar route deleted.
- Authenticated and origin-restricted Socket.IO.
- AI endpoint authentication and rate limiting.
- SVG upload rejection.
- Origin/Referer checks for authenticated unsafe API requests.
- Health check, graceful shutdown, and fatal process handling.
- Secret-file exclusions in `.gitignore`.
- External API request timeouts.

## Validation status in the preparation environment

Passed:

- Static security regression checks.
- Source inspection proving the profile schema contains no privileged/security fields.
- ZIP archive integrity validation.

Not executable in the preparation container because package installation/network access was unavailable:

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
```

The executable tests are included and should be run first in GitHub Codespaces or Claude's clean Node environment. The pre-existing TypeScript backlog is still expected and is the next stabilization target.

## Still open

- Reduce the existing TypeScript errors to zero.
- Replace the remaining `req: any` handlers with typed requests.
- Add database-backed integration tests for forum topic/post owner versus non-owner edits and deletion.
- Complete Render/Cloudflare R2 portability work.
- Defer route modularization until typing and tests protect route behavior.
