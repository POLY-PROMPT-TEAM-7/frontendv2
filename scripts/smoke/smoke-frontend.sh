#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
EVIDENCE_DIR=".sisyphus/evidence"
FIXTURE="scripts/smoke/fixtures/smoke.txt"
ALLOW_PARTIAL="${SMOKE_ALLOW_PARTIAL:-1}"

mkdir -p "$EVIDENCE_DIR"

if [ ! -f "$FIXTURE" ]; then
  echo "Missing fixture: $FIXTURE"
  exit 1
fi

echo "[frontend-smoke] waiting for $BASE_URL/api/backend/openapi"
bash scripts/smoke/wait-http.sh "$BASE_URL/api/backend/openapi" 120

echo "[frontend-smoke] GET /api/backend/openapi"
curl -fsS "$BASE_URL/api/backend/openapi" \
  | tee "$EVIDENCE_DIR/frontend-openapi.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(!j.openapi)process.exit(1);'

echo "[frontend-smoke] GET /api/kg/capabilities"
CAPS_JSON="$(curl -fsS "$BASE_URL/api/kg/capabilities")"
printf "%s" "$CAPS_JSON" \
  | tee "$EVIDENCE_DIR/frontend-capabilities.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(j.ok!==true)process.exit(1);'

FULL_MODE="$(printf "%s" "$CAPS_JSON" | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));const c=j.capabilities||{};const full=!!(c.uploadMultipartEndpoint&&c.extractJsonEndpoint&&(c.subgraphBySourceEndpoint||c.relationshipsListEndpoint));process.stdout.write(full?"1":"0");')"

if [ "$FULL_MODE" != "1" ]; then
  if [ "$ALLOW_PARTIAL" != "1" ]; then
    echo "Capabilities do not support full generate/graph workflow"
    exit 2
  fi

  echo "[frontend-smoke] PASS (partial mode: backend capabilities limited)"
  exit 0
fi

echo "[frontend-smoke] POST /api/kg/generate"
curl -fsS -X POST "$BASE_URL/api/kg/generate" -F "files=@$FIXTURE;filename=smoke.txt" \
  | tee "$EVIDENCE_DIR/frontend-generate.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(j.ok!==true||j.mode!=="remote"||!j.graphId||!j.rendererGraph||!Array.isArray(j.rendererGraph.nodes)||!Array.isArray(j.rendererGraph.links))process.exit(1);'

GRAPH_ID="$(node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(".sisyphus/evidence/frontend-generate.json","utf8"));process.stdout.write(String(j.graphId||""));')"

if [ -z "$GRAPH_ID" ]; then
  echo "graphId missing from generate response"
  exit 1
fi

echo "[frontend-smoke] GET /api/kg/graph/$GRAPH_ID"
curl -fsS "$BASE_URL/api/kg/graph/$GRAPH_ID" \
  | tee "$EVIDENCE_DIR/frontend-graph.json" \
  | node -e 'const fs=require("fs");const j=JSON.parse(fs.readFileSync(0,"utf8"));if(j.ok!==true||!j.rendererGraph||!Array.isArray(j.rendererGraph.nodes)||!Array.isArray(j.rendererGraph.links))process.exit(1);'

echo "[frontend-smoke] PASS"
