# CoogsNation Portable Foundation 2.5.3

CoogsNation is a portable React, Express, TypeScript, PostgreSQL, Socket.IO, and provider-neutral AI application. It is designed to run in GitHub Codespaces, Docker, a managed Node/PostgreSQL platform, or a conventional Linux host without depending on a proprietary application platform.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Express + TypeScript on Node.js 22
- **Database:** standard PostgreSQL through `pg` and Drizzle ORM
- **Sessions:** PostgreSQL-backed Express sessions
- **Authentication:** built-in email/password; optional Facebook and LinkedIn providers
- **Realtime:** authenticated Socket.IO
- **AI:** OpenAI-compatible providers, Anthropic, DeepSeek, xAI, Ollama, and custom compatible endpoints
- **Packaging:** npm, Docker, Docker Compose, Dev Containers, and GitHub Codespaces

## Required validation gate

Run this before merging or producing a release image:

```bash
npm ci --no-audit --no-fund
npm run security:check
npm run check
npm run build
```

GitHub Actions runs the same gate. The production Docker image is built from the `validated-build` stage, so it cannot be created if TypeScript, security checks, or the production build fail.

## Fast local development with Docker

```bash
cp .env.example .env
# Set a long SESSION_SECRET in .env.
# For the first start against a completely new database only:
# DATABASE_BOOTSTRAP=true
docker compose config
docker compose up --build
```

Open `http://localhost:5000`.

The development Compose file:

- Loads `.env`
- Runs `db:bootstrap` only when `DATABASE_BOOTSTRAP=true`
- Applies numbered migrations on every start
- Mounts the source tree for live editing
- Keeps `node_modules` inside the container
- Runs PostgreSQL on an isolated internal backend network
- Gives the application a separate frontend network for outbound AI/email/API access
- Uses `/healthz`, restart policies, and log rotation

## Manual Codespaces/local start

Requirements: Node.js 22+, npm 10+, and PostgreSQL 16+.

```bash
cp .env.example .env
# Set DATABASE_URL and SESSION_SECRET in .env.
npm ci --no-audit --no-fund
# Run once only when the database has no CoogsNation schema yet:
npm run db:bootstrap
# Run on every revision to apply pending numbered migrations:
npm run db:migrate:dev
npm run security:check
npm run dev
```

`db:bootstrap` is Drizzle schema synchronization for a completely new development database. Do not run it automatically after initialization. `db:migrate:dev` applies only pending numbered SQL migrations from the TypeScript source runner and records them in `coogsnation_migrations`.

## Production Docker deployment

Use the production Compose file, not the development file:

```bash
cp .env.example .env
# Fill every production secret and exact APP_ORIGIN in .env
docker compose -f docker-compose.prod.yml config
```

For the **first** self-hosted database initialization only:

```env
DATABASE_BOOTSTRAP=true
```

Then start:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

After the initial database schema exists, set:

```env
DATABASE_BOOTSTRAP=false
```

The dedicated production `migrate` service uses the built `dist/migrate.js` release runner. Subsequent releases apply only pending numbered SQL migrations. The application starts only after successful migration completion.

The production application container:

- Runs as an unprivileged Node user
- Starts Node directly as PID 1
- Drops Linux capabilities and prevents privilege escalation
- Uses `/healthz`
- Rotates logs
- Has initial limits of 1 CPU and 512 MB RAM
- Keeps PostgreSQL on an isolated backend network
- Retains outbound access for AI and other integrations through the frontend network

The PostgreSQL container intentionally does **not** drop every Linux capability because the official image may need filesystem capabilities during first initialization and restore operations.

## Database migrations

Commands:

```bash
npm run db:generate       # generate Drizzle migration material during development
npm run db:bootstrap      # development/first-install schema synchronization only
npm run db:migrate:dev  # development: apply numbered SQL migrations from TypeScript source
npm run db:migrate      # release/container: apply numbered SQL migrations from dist/migrate.js
```

Migration files are applied alphabetically inside a transaction and recorded in the `coogsnation_migrations` table.

## Database backups and restore tests

The repository includes:

```text
ops/backup/backup-postgres.sh
ops/backup/restore-postgres.sh
```

Start automated encrypted daily backups:

```bash
docker compose -f docker-compose.prod.yml --profile scheduled-backups up -d backup-scheduler
```

Create an immediate one-off encrypted backup:

```bash
docker compose -f docker-compose.prod.yml --profile backup run --rm backup
```

Production backups require `BACKUP_ENCRYPTION_PASSPHRASE`. Each backup receives a SHA-256 checksum. The backup containers intentionally join only the isolated database network and therefore do not upload archives to the internet. Copy or synchronize the encrypted backup and checksum from the host to independent offsite storage; the local Docker volume alone is not an offsite backup.

Restore into a disposable PostgreSQL database at least monthly:

```bash
DATABASE_URL='postgresql://...' \
BACKUP_ENCRYPTION_PASSPHRASE='...' \
./ops/backup/restore-postgres.sh /path/to/backup.dump.enc
```

A backup is not considered proven until a restore test succeeds.

## Universal AI configuration

AI remains disabled unless explicitly enabled:

```env
AI_ENABLED=true
AI_PROVIDER=deepseek
AI_MODEL=your-provider-model-name
AI_API_KEY=your-secret-key
```

Supported provider values:

- `openai`
- `anthropic`
- `deepseek`
- `xai`
- `ollama`
- `custom`

The application keeps provider credentials on the server and includes authentication, rate limits, timeouts, concurrency controls, token limits, budget controls, fail-closed moderation, plain-text output handling, and administrator approval for learned answers by default.

## Security and operations

- Set `APP_ORIGIN` to the exact public HTTPS origin.
- Set `TRUST_PROXY` for the actual proxy chain.
- Store secrets in the deployment provider's secret manager or protected `.env`; never commit them.
- Keep `AI_ENABLED=false` until provider, model, prices, limits, and budget are explicitly configured.
- Run `npm audit --omit=dev` in CI. It is warn-only initially because audit findings require individual evaluation.
- Use managed PostgreSQL point-in-time recovery plus independent encrypted exports for production.


## Node version alignment

Runtime and CI use Node.js 22. The current lockfile still pins the compatible Node 20 declaration package inherited from the original project. Upgrade `@types/node` to the Node 22 line with a normal `npm install --save-dev @types/node@^22` when registry access is available, regenerate the lockfile, and rerun the complete validation gate. This is dependency hygiene, not a runtime blocker.
