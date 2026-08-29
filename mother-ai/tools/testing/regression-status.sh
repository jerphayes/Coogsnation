set -e
cd /home/coogsnation/app
echo "===== NGF MOTHER REGRESSION CONTROL ====="
docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile regression --profile reserve config --services
echo "===== APPIUM ====="
docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile regression ps appium
echo "===== SELENIUM ====="
docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile reserve ps selenium
echo "===== PLAYWRIGHT ====="
docker compose -f docker-compose.yml -f docker-compose.regression.yml --profile regression run --rm playwright npx playwright --version
