set -e
cd /home/coogsnation/app
BASE=${1:-HEAD~1}
git diff --name-only "$BASE" HEAD > /tmp/ngf-mother-changed.txt
echo "===== CHANGED FILES ====="
cat /tmp/ngf-mother-changed.txt
echo "===== MOTHER REGRESSION EXECUTOR ====="
if grep -qE "client/|regression/playwright/" /tmp/ngf-mother-changed.txt; then echo "RUN PLAYWRIGHT"; docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile regression run --rm playwright npx playwright test routes.spec.js --project=chromium; else echo "SKIP PLAYWRIGHT"; fi
if grep -qE "server/|docker-compose|package" /tmp/ngf-mother-changed.txt; then echo "RUN HEALTH"; curl -fsS http://127.0.0.1:5000/healthz; echo; else echo "SKIP HEALTH"; fi
if grep -qE "regression/appium/|android/" /tmp/ngf-mother-changed.txt; then echo "RUN APPIUM INFRASTRUCTURE"; curl -fsS http://127.0.0.1:4723/status; echo; else echo "SKIP ANDROID"; fi
if grep -qE "ios/|xcodeproj|xcworkspace|ios-regression.yml" /tmp/ngf-mother-changed.txt; then echo "DEFER IOS TO MACOS CI"; else echo "SKIP IOS"; fi
echo "===== MOTHER EXECUTION COMPLETE ====="
