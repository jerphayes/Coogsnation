#!/usr/bin/env bash
set -euo pipefail

OLMO_ROOT=${OLMO_ROOT:-/home/coogsnation/NGF-OLMo-core}
RECIPE=${1:-src/scripts/official/OLMo3/OLMo-3-1025-7B-pretrain-1.py}

echo "NGF MOTHER AI TRAINING PREFLIGHT"
echo "OLMo root: $OLMO_ROOT"
echo "Recipe: $RECIPE"

test -d "$OLMO_ROOT/.git" || { echo "FAIL: OLMo repository missing"; exit 1; }
test -f "$OLMO_ROOT/$RECIPE" || { echo "FAIL: training recipe missing"; exit 1; }

echo "PASS: NGF OLMo repository detected"
echo "PASS: official training recipe detected"

if command -v nvidia-smi >/dev/null 2>&1; then
  echo "GPU DETECTED:"
  nvidia-smi --query-gpu=name,memory.total --format=csv,noheader
else
  echo "GPU NOT DETECTED: training execution remains disabled on this machine"
fi

echo "DRY RUN ONLY"
echo "No model training has been started."
