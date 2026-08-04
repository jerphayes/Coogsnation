#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

echo "========================================"
echo " CoogsNation Codespaces Startup"
echo "========================================"

# Load NVM and enforce the tested Node version.
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

# GitHub Codespaces sets these globally, which conflicts with NVM.
unset npm_config_prefix
unset NPM_CONFIG_PREFIX

if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
else
  echo "ERROR: NVM was not found."
  exit 1
fi

nvm install 22.22.2 >/dev/null
nvm use 22.22.2 >/dev/null

echo "Node: $(node -v)"
echo "npm:  $(npm -v)"

# Create the private environment file when a Codespace is new.
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example"
else
  echo "Existing .env preserved"
fi

# The API key must come from GitHub Codespaces secrets.
if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo
  echo "ERROR: OPENAI_API_KEY is unavailable."
  echo "Add it under GitHub repository Settings:"
  echo "Secrets and variables → Codespaces."
  exit 1
fi

# Generate a private development session secret when GitHub does not provide one.
if [ -n "${SESSION_SECRET:-}" ]; then
  COOG_SESSION_SECRET="$SESSION_SECRET"
else
  COOG_SESSION_SECRET="$(
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  )"
fi

export COOG_SESSION_SECRET

# Safely update .env without displaying secret values.
python3 <<'PY'
from pathlib import Path
import os

path = Path(".env")
raw = path.read_text()

def parse_values(text: str) -> dict[str, str]:
    values = {}
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values

existing = parse_values(raw)

openai_key = os.environ["OPENAI_API_KEY"].strip()
session_secret = os.environ["COOG_SESSION_SECRET"].strip()

model = existing.get("AI_MODEL") or "gpt-5.4-nano"

updates = {
    "SESSION_SECRET": session_secret,

    "AI_ENABLED": "true",
    "AI_PROVIDER": "openai",
    "AI_MODEL": model,
    "AI_BASE_URL": "https://api.openai.com/v1",
    "AI_API_KEY": openai_key,

    "ADMIN_AI_ENABLED": "true",
    "ADMIN_AI_PROVIDER": "openai",
    "ADMIN_AI_MODEL": model,
    "ADMIN_AI_BASE_URL": "https://api.openai.com/v1",
    "ADMIN_AI_API_KEY": openai_key,
}

output = []
written = set()

for line in raw.splitlines():
    if (
        "=" in line
        and not line.lstrip().startswith("#")
    ):
        key = line.split("=", 1)[0].strip()
        if key in updates:
            output.append(f"{key}={updates[key]}")
            written.add(key)
            continue

    output.append(line)

for key, value in updates.items():
    if key not in written:
        output.append(f"{key}={value}")

path.write_text("\n".join(output).rstrip() + "\n")
print("Environment and AI configuration loaded securely.")
print(f"AI model: {model}")
PY

unset COOG_SESSION_SECRET
chmod 600 .env

# Install packages only when node_modules does not match package-lock.json.
LOCK_HASH="$(sha256sum package-lock.json | awk '{print $1}')"
INSTALLED_HASH="$(cat node_modules/.coogsnation-lock-hash 2>/dev/null || true)"

if [ "$LOCK_HASH" != "$INSTALLED_HASH" ]; then
  echo "Installing project dependencies..."
  npm ci --no-audit --no-fund
  printf '%s\n' "$LOCK_HASH" > node_modules/.coogsnation-lock-hash
else
  echo "Dependencies already current"
fi

echo "Starting PostgreSQL..."
docker compose up -d database

echo "Waiting for PostgreSQL..."
DATABASE_CONTAINER="coogsnation-database-1"

for attempt in $(seq 1 30); do
  STATUS="$(
    docker inspect \
      --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
      "$DATABASE_CONTAINER" 2>/dev/null || true
  )"

  if [ "$STATUS" = "healthy" ]; then
    break
  fi

  sleep 2
done

STATUS="$(
  docker inspect \
    --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' \
    "$DATABASE_CONTAINER" 2>/dev/null || true
)"

if [ "$STATUS" != "healthy" ]; then
  echo "ERROR: PostgreSQL did not become healthy."
  docker compose logs --tail=100 database
  exit 1
fi

echo "PostgreSQL is healthy"

# Bootstrap only a genuinely new database.
USERS_TABLE="$(
  docker compose exec -T database \
    psql -U coogs -d coogsnation -Atc \
    "SELECT COALESCE(to_regclass('public.users')::text, '');"
)"

if [ -z "$USERS_TABLE" ]; then
  echo "New database detected — creating CoogsNation schema..."
  npm run db:bootstrap
else
  echo "Existing CoogsNation schema detected"
fi

echo "Applying pending migrations..."
npm run db:migrate:dev

echo "Checking authentication/database connectivity..."
npm run auth:doctor

# Permanently synchronize the registered Codespaces owner.
if [ -n "${COOGSNATION_OWNER_EMAIL:-}" ]; then
  OWNER_ID="$(
    docker compose exec -T \
      -e PGOPTIONS="-c app.owner_email=$COOGSNATION_OWNER_EMAIL" \
      database \
      psql -U coogs -d coogsnation -v ON_ERROR_STOP=1 -Atc "
        WITH owner_row AS (
          UPDATE users
          SET role = 'admin',
              session_version =
                CASE
                  WHEN role IS DISTINCT FROM 'admin'
                  THEN session_version + 1
                  ELSE session_version
                END
          WHERE lower(email) =
                lower(current_setting('app.owner_email', true))
          RETURNING id
        )
        SELECT id FROM owner_row LIMIT 1;
      "
  )"

  if [ -n "$OWNER_ID" ]; then
    export OWNER_ID

    python3 <<'PY_OWNER'
from pathlib import Path
import os

path = Path(".env")
owner_id = os.environ["OWNER_ID"].strip()
lines = path.read_text().splitlines()

output = []
updated = False

for line in lines:
    if line.startswith("OWNER_USER_ID="):
        output.append(f"OWNER_USER_ID={owner_id}")
        updated = True
    else:
        output.append(line)

if not updated:
    output.append(f"OWNER_USER_ID={owner_id}")

path.write_text("\n".join(output).rstrip() + "\n")
print("Owner administrator access synchronized.")
PY_OWNER

    unset OWNER_ID
  else
    echo "Owner account is not registered in this database yet."
    echo "Register it once, then rerun npm run codespace:start."
  fi
else
  echo "WARNING: COOGSNATION_OWNER_EMAIL is unavailable."
fi

# Avoid starting a duplicate server.
if curl -fsS http://127.0.0.1:5000/healthz >/dev/null 2>&1; then
  echo
  echo "CoogsNation is already running on port 5000."
  exit 0
fi

echo
echo "========================================"
echo " Starting CoogsNation on port 5000"
echo "========================================"

exec npm run dev
