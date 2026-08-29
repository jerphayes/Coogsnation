set -e
cd /home/coogsnation/app
BASE=${1:-HEAD~1}
CHANGED=$(git diff --name-only "$BASE" HEAD)
echo "===== CHANGED FILES ====="
printf "%s\n" "$CHANGED"
echo "===== MOTHER REGRESSION PLAN ====="
if printf "%s\n" "$CHANGED" | grep -qE "client/|regression/playwright/"; then echo "RUN: Playwright web regression"; else echo "SKIP: Playwright web regression"; fi
if printf "%s\n" "$CHANGED" | grep -qE "server/|docker-compose|package"; then echo "RUN: API and health regression"; else echo "SKIP: API and health regression"; fi
if printf "%s\n" "$CHANGED" | grep -qE "regression/appium/|android/"; then echo "RUN: Android Appium infrastructure"; else echo "SKIP: Android native regression"; fi
if printf "%s\n" "$CHANGED" | grep -qE "ios/|xcodeproj|xcworkspace|ios-regression.yml"; then echo "RUN: iOS macOS/XCUITest CI"; else echo "SKIP: iOS native regression"; fi
