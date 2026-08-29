cd /home/coogsnation/app
LAST=$(ls -1dt regression/results/mother/* 2>/dev/null | head -1)
test -n "$LAST" || { echo "NO REGRESSION RESULTS"; exit 1; }
echo "===== MOTHER DIAGNOSIS ====="
echo "RESULT: $LAST"
if grep -Eiq "error|failed|syntaxerror|pageerror|no such service|not found" "$LAST/execution.log"; then grep -Ei "error|failed|syntaxerror|pageerror|no such service|not found" "$LAST/execution.log" | sort | uniq -c | sort -nr | head -20; else echo "NO FAILURE SIGNATURES - PASS"; fi
