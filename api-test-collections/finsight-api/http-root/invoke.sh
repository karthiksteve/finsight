#!/usr/bin/env bash
set -euo pipefail
BASE_URL="${1:-http://localhost:8001}"

echo "GET ${BASE_URL}/"
curl -fsS "${BASE_URL}/" | python -m json.tool
