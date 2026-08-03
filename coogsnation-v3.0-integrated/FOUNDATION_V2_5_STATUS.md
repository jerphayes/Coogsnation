# CoogsNation Foundation v2.5 — Portable Infrastructure Hardening (superseded by v2.5.1)

Foundation v2.5 combines the provider-neutral AI work from v2.4 with the independently reviewed Docker, CI, network, migration, and backup corrections.

## Corrected from the v2.4 configuration review

- Vite and `vite.config.ts` are development-only runtime imports and are removed from the production static import graph.
- `nanoid` was replaced with Node's built-in `crypto.randomUUID()`.
- The runtime container starts with `node dist/index.js` directly.
- Docker Compose loads `.env`.
- Development source is bind-mounted for live reload.
- `scripts/**/*` is included in TypeScript checking.
- The production Docker build runs TypeScript, security, and production-build gates.
- A dedicated migration runner applies numbered SQL files transactionally and tracks them.
- Obsolete `node-fetch`, mismatched node-fetch types, deprecated Sharp types, and unused WebSocket types were removed from direct dependencies.

## Accepted DeepSeek infrastructure additions

- `restart: unless-stopped`
- `/healthz` container health checks
- JSON log rotation
- `no-new-privileges` and dropped capabilities for the application
- Production CPU and memory limits
- Isolated PostgreSQL backend network
- Non-blocking `npm audit --omit=dev` CI step
- Encrypted database backup and restore tooling

## Amendments applied during reconciliation

- The application joins both a frontend network and the isolated backend network, preserving outbound access to AI, email, OAuth, payment, and other APIs.
- PostgreSQL is not given `cap_drop: ALL` until fresh-volume initialization and restore testing prove that safe.
- Production limits live only in `docker-compose.prod.yml`.
- Backup creation includes checksums, encryption requirements in production, retention, and a documented restore test.

## Validation commands

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
docker compose config
docker compose -f docker-compose.prod.yml config
```

## Important release rule

Do not deploy unless the complete validation gate passes in GitHub Actions or Codespaces. The production Docker target intentionally depends on the validated build stage.

## Validation completed during packaging

Passed without installed project dependencies:

- Existing static security regression scan
- Portable-platform regression scan
- Universal-AI static regression scans
- New infrastructure regression scan
- JSON and YAML parsing
- Backup/restore shell syntax checks
- Package manifest/lock-root synchronization
- Full-tree check for legacy proprietary-platform references

The packaging environment's npm registry returned HTTP 503, so `npm ci`, executable TypeScript checks, the production build, and Docker execution could not be rerun there. Run the required validation gate in GitHub Codespaces. The release Docker target also enforces the same gate.

## Remaining independent review

The provider-neutral AI application source still needs an independent full-source security review. The v2.4 review available during this revision covered configuration and packaging, not all AI request, streaming, budget, moderation, and learned-knowledge code paths.
