#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <url> [timeout_seconds]"
  exit 2
fi

URL="$1"
TIMEOUT="${2:-90}"
START_TS="$(date +%s)"

while true; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    exit 0
  fi

  NOW="$(date +%s)"
  ELAPSED=$((NOW - START_TS))
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "Timed out waiting for $URL after ${TIMEOUT}s"
    exit 1
  fi

  sleep 2
done
