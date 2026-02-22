#!/usr/bin/env bash
set -euo pipefail

BASE_BACKEND="${1:-http://localhost:8000}"
BASE_FRONTEND="${2:-http://localhost:3000}"
EVIDENCE_DIR=".sisyphus/evidence"

mkdir -p "$EVIDENCE_DIR"

echo "[demo] starting compose services"
docker compose -f DockerCompose/compose.smoke.yml up -d >/dev/null

echo "[demo] backend openapi"
curl -fsS "$BASE_BACKEND/openapi.json" > "$EVIDENCE_DIR/demo-backend-openapi.json"

EXTRACT_FIELD="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const p=(((j.components||{}).schemas||{}).ExtractRequest||{}).properties||{};if(Object.prototype.hasOwnProperty.call(p,"artifact_path"))process.stdout.write("artifact_path");else if(Object.prototype.hasOwnProperty.call(p,"text"))process.stdout.write("text");else if(Object.prototype.hasOwnProperty.call(p,"text_path"))process.stdout.write("text_path");' "$EVIDENCE_DIR/demo-backend-openapi.json")"

if [ -n "$EXTRACT_FIELD" ]; then
  case "$EXTRACT_FIELD" in
    artifact_path)
      PAYLOAD='{"artifact_path":"/tmp/backend-placeholder/uploads/non-existent-artifact.json"}'
      ;;
    text)
      PAYLOAD='{"text":"/tmp/demo-input.txt"}'
      ;;
    text_path)
      PAYLOAD='{"text_path":"/tmp/demo-input.txt"}'
      ;;
  esac
  echo "[demo] backend extract using field=$EXTRACT_FIELD"
  curl -sS -X POST "$BASE_BACKEND/extract" -H "Content-Type: application/json" -d "$PAYLOAD" \
    | tee "$EVIDENCE_DIR/demo-backend-extract.json" >/dev/null
fi

echo "[demo] frontend proxy openapi"
curl -fsS "$BASE_FRONTEND/api/backend/openapi" > "$EVIDENCE_DIR/demo-frontend-openapi.json"

echo "[demo] frontend capabilities"
curl -fsS "$BASE_FRONTEND/api/kg/capabilities" > "$EVIDENCE_DIR/demo-frontend-capabilities.json"

CAN_FULL="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));const c=j.capabilities||{};const ok=j.ok===true&&c.uploadMultipartEndpoint&&c.extractJsonEndpoint&&(c.subgraphBySourceEndpoint||c.relationshipsListEndpoint);process.stdout.write(ok?"1":"0");' "$EVIDENCE_DIR/demo-frontend-capabilities.json")"

if [ "$CAN_FULL" = "1" ]; then
  echo "[demo] full flow available; running generate"
  curl -fsS -X POST "$BASE_FRONTEND/api/kg/generate" -F "files=@scripts/smoke/fixtures/smoke.txt;filename=smoke.txt" \
    > "$EVIDENCE_DIR/demo-frontend-generate.json"
  GRAPH_ID="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j.graphId||""));' "$EVIDENCE_DIR/demo-frontend-generate.json")"
  if [ -n "$GRAPH_ID" ]; then
    curl -fsS "$BASE_FRONTEND/api/kg/graph/$GRAPH_ID" > "$EVIDENCE_DIR/demo-frontend-graph.json"
  fi
  echo "[demo] full demo completed"
else
  echo "[demo] partial demo completed (backend image has limited endpoints)"
fi

echo "[demo] done"
