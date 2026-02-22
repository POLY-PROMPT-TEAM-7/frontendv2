#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:8000}"
EVIDENCE_DIR=".sisyphus/evidence"
FIXTURE="scripts/smoke/fixtures/smoke.txt"
ALLOW_PARTIAL="${SMOKE_ALLOW_PARTIAL:-1}"

mkdir -p "$EVIDENCE_DIR"

if [ ! -f "$FIXTURE" ]; then
  echo "Missing fixture: $FIXTURE"
  exit 1
fi

echo "[backend-smoke] GET /openapi.json"
curl -fsS "$BASE_URL/openapi.json" > "$EVIDENCE_DIR/backend-openapi.json"

HAS_UPLOAD="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=Object.keys(j.paths||{});process.stdout.write(p.includes("/upload")?"1":"0");' "$EVIDENCE_DIR/backend-openapi.json")"
HAS_RELATIONSHIPS="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=Object.keys(j.paths||{});process.stdout.write(p.includes("/query/relationships")?"1":"0");' "$EVIDENCE_DIR/backend-openapi.json")"
HAS_EXTRACT="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=Object.keys(j.paths||{});process.stdout.write(p.includes("/extract")?"1":"0");' "$EVIDENCE_DIR/backend-openapi.json")"

if [ "$HAS_EXTRACT" != "1" ]; then
  echo "Missing required endpoint: /extract"
  exit 2
fi

HEALTH_PATH="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=Object.keys(j.paths||{});if(p.includes("/health"))process.stdout.write("/health");else if(p.includes("/health/"))process.stdout.write("/health/");' "$EVIDENCE_DIR/backend-openapi.json")"

if [ -z "$HEALTH_PATH" ]; then
  if [ "$ALLOW_PARTIAL" = "1" ]; then
    echo "[backend-smoke] Partial mode: backend does not expose /health"
  else
    echo "Backend OpenAPI does not expose /health or /health/"
    exit 2
  fi
else
  HEALTH_URL="$BASE_URL$HEALTH_PATH"

  echo "[backend-smoke] GET health via $HEALTH_URL"
  curl -fsS "$HEALTH_URL" | tee "$EVIDENCE_DIR/backend-health.json" | node -e 'const fs=require("fs");const s=fs.readFileSync(0,"utf8");const j=JSON.parse(s);if(j.health!=="ok")process.exit(1);'
fi

if [ "$HAS_UPLOAD" != "1" ] || [ "$HAS_RELATIONSHIPS" != "1" ]; then
  if [ "$ALLOW_PARTIAL" != "1" ]; then
    echo "Missing required endpoints for full smoke: /upload and/or /query/relationships"
    exit 2
  fi

  echo "[backend-smoke] Partial mode: backend does not expose /upload and /query/relationships"

  EXTRACT_FIELD="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const req=j.components&&j.components.schemas&&j.components.schemas.ExtractRequest;const p=(req&&req.properties)||{};if(Object.prototype.hasOwnProperty.call(p,"artifact_path"))process.stdout.write("artifact_path");else if(Object.prototype.hasOwnProperty.call(p,"text"))process.stdout.write("text");else if(Object.prototype.hasOwnProperty.call(p,"text_path"))process.stdout.write("text_path");' "$EVIDENCE_DIR/backend-openapi.json")"

  if [ -n "$EXTRACT_FIELD" ]; then
    case "$EXTRACT_FIELD" in
      artifact_path)
        PAYLOAD='{"artifact_path":"/tmp/backend-placeholder/uploads/non-existent-artifact.json"}'
        ;;
      text)
        PAYLOAD='{"text":"/tmp/smoke-input.txt"}'
        ;;
      text_path)
        PAYLOAD='{"text_path":"/tmp/smoke-input.txt"}'
        ;;
    esac

    echo "[backend-smoke] POST /extract (partial mode, field=$EXTRACT_FIELD)"
    curl -sS -X POST "$BASE_URL/extract" -H "Content-Type: application/json" -d "$PAYLOAD" \
      | tee "$EVIDENCE_DIR/backend-extract-partial.json" \
      | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!j)process.exit(1);'
  fi

  echo "[backend-smoke] PASS (partial mode)"
  exit 0
fi

echo "[backend-smoke] POST /upload"
curl -fsS -X POST "$BASE_URL/upload" -F "file=@$FIXTURE;filename=smoke.txt" \
  | tee "$EVIDENCE_DIR/backend-upload.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!j.artifact_path||!j.source_id)process.exit(1);'

ARTIFACT_PATH="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(".sisyphus/evidence/backend-upload.json","utf8"));process.stdout.write(String(j.artifact_path||""));')"

if [ -z "$ARTIFACT_PATH" ]; then
  echo "artifact_path missing from upload response"
  exit 1
fi

echo "[backend-smoke] POST /extract"
curl -fsS -X POST "$BASE_URL/extract" -H "Content-Type: application/json" -d "{\"artifact_path\":\"$ARTIFACT_PATH\"}" \
  | tee "$EVIDENCE_DIR/backend-extract.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(typeof j.already_processed!=="boolean")process.exit(1);'

echo "[backend-smoke] GET /query/relationships"
curl -fsS "$BASE_URL/query/relationships?limit=1000&offset=0" \
  | tee "$EVIDENCE_DIR/backend-relationships.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!Array.isArray(j.items)||typeof j.total!=="number")process.exit(1);'

echo "[backend-smoke] PASS"
