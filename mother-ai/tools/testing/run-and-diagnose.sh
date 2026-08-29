cd /home/coogsnation/app
BASE=${1:-HEAD~1}
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=regression/results/mother/$STAMP
mkdir -p "$OUT"
git diff --name-only "$BASE" HEAD > "$OUT/changed-files.txt" 2>/dev/null || true
bash mother-ai/tools/testing/execute-regression.sh "$BASE" > "$OUT/execution.log" 2>&1
RC=$?
cat "$OUT/execution.log"
echo "$RC" > "$OUT/exit-code.txt"
docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile regression --profile reserve ps > "$OUT/services.txt" 2>&1 || true
if test "$RC" -eq 0; then echo "PASS" | tee "$OUT/summary.txt"; echo "ARTIFACTS: $OUT"; exit 0; fi
echo "FAIL" | tee "$OUT/summary.txt"
grep -Ei "error|failed|syntaxerror|pageerror|no such service|not found|status [45][0-9][0-9]" "$OUT/execution.log" > "$OUT/failure-signatures.txt" || true
if test -d regression/playwright/test-results; then cp -a regression/playwright/test-results "$OUT/playwright-test-results"; fi
echo "ARTIFACTS: $OUT"
exit "$RC"
