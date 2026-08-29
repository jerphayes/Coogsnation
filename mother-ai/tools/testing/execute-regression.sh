if printf "%s\n" "$CHANGED" | grep -qE "server/|docker-compose|package"; then echo "RUN HEALTH"; curl -fsS http://127.0.0.1:5000/healthz; echo; else echo "SKIP HEALTH"; fi
if printf "%s\n" "$CHANGED" | grep -qE "regression/appium/|android/"; then echo "RUN APPIUM INFRASTRUCTURE"; curl -fsS http://127.0.0.1:4723/status; echo; else echo "SKIP ANDROID"; fi
if printf "%s\n" "$CHANGED" | grep -qE "ios/|xcodeproj|xcworkspace|ios-regression.yml"; then echo "DEFER IOS TO MACOS CI"; else echo "SKIP IOS"; fi
echo "===== MOTHER EXECUTION COMPLETE ====="
