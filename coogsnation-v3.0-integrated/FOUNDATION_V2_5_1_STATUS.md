# CoogsNation Foundation v2.5.1 — Development Reliability Correction

Foundation v2.5.1 is a narrow correction to v2.5 based on the independent configuration review. It does not weaken the production validation gate and adds no new product features.

## Corrections

- Removed `cap_drop: ALL` from the development application container so native-Linux and Codespaces bind-mounted source files remain writable.
- Retained `no-new-privileges:true` in development.
- Kept `cap_drop: ALL` on the hardened production application and migration services.
- Guarded development `db:bootstrap` behind `DATABASE_BOOTSTRAP=true`; it no longer runs unconditionally on every container start.
- Changed the production migration service to run the built `npm run db:migrate` release runner after any explicitly requested first-time bootstrap.
- Deferred Compose environment expansion to the container shell with `$${DATABASE_BOOTSTRAP:-false}`, ensuring `env_file` controls the value consistently.
- Clarified Docker, Codespaces, standalone PostgreSQL URL, bootstrap, migration, and backup/offsite-transfer instructions.
- Extended the infrastructure regression scan to prevent the development capability and unconditional-bootstrap defects from returning.
- Added development and production Compose syntax validation to GitHub Actions.
- Updated package/release metadata to 2.5.1 while preserving a lockfile that remains reproducible.

## Intentionally unchanged

- The full TypeScript + security + build gate remains mandatory for production images.
- The known React client TypeScript backlog is not bypassed; it remains the next stabilization task.
- `@types/node` remains on the existing lockfile-pinned version until registry access is available for a proper Node 22 dependency and lockfile regeneration. Runtime and CI still use Node 22.
- The Universal AI source still requires a full independent application-level review.

## Required validation

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
docker compose config
docker compose -f docker-compose.prod.yml config
```

The production Docker image must not be deployed until the complete validation gate passes.
