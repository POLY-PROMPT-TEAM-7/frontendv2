# Deployment + Integration Smoke Plan (frontendv2 + POLY-PROMPT-TEAM-7 backend)

## TL;DR
> **Summary**: Make `frontendv2` correctly proxy the POLY-PROMPT backend contracts (raw file upload + artifact_path extract) and add reproducible smoke tests for local + dockerized deployment.
> **Deliverables**: frontend integration fixes; docker compose (dev + CI) that boots reliably; scripted smoke tests covering `/health`, `/upload`, `/extract`, `/query/relationships`, and the frontend proxy routes; optional GitHub Actions workflow.
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Fix API contract mismatches → Add graph/subgraph adapter → Add smoke scripts + compose → CI wiring

## Context
### Original Request
- Use repos `POLY-PROMPT-TEAM-7/backend` + `POLY-PROMPT-TEAM-7/StudyOntology` with current `frontendv2`.
- Ensure these APIs work (deployment-ready):
  - `GET http://localhost:8000/health`
  - `POST http://localhost:8000/upload` with multipart `file=@...` (raw file; no `.gz`)
  - `POST http://localhost:8000/extract` with JSON `{ "artifact_path": "..." }`
  - `GET http://localhost:8000/query/relationships?limit=1000&offset=0`

### Interview Summary
- Confirmed: **no more `.gz` uploads**; upload the files themselves.

### Metis Review (gaps addressed)
- Add guardrails to avoid capability misclassification of `/upload` as "multipart extract".
- Treat `artifact_path` as opaque; remove brittle heuristics.
- Add a first-class relationships/subgraph capability instead of relying on `graphGetEndpoint` heuristics.
- Provide a minimal-but-sufficient verification matrix with failure-mode coverage.

## Work Objectives
### Core Objective
- Make `frontendv2` compatible with the POLY-PROMPT backend-placeholder API contract and provide an agent-executable deployment verification workflow.

### Deliverables
- Frontend API seam fixes:
  - Correct capability inference for `POST /upload`, `POST /extract`, `GET /query/relationships`, `GET /query/subgraph/source/{source_id}`.
  - `POST /api/kg/generate` uploads raw files (no gzip) and performs `/upload → /extract` orchestration.
  - `GET /api/kg/graph/[graphId]` supports graph retrieval via backend subgraph endpoints (using `source_id` as `graphId`).
- Deployment smoke suite:
  - Scripted smoke tests for backend endpoints and frontend proxy routes.
  - Docker Compose configuration that reliably boots backend + frontend and runs smoke scripts.
- Optional CI workflow (GitHub Actions) to run smoke tests on PRs (with secrets gating for `OPENAI_API_KEY`).

### Definition of Done (verifiable)
- Prereqs (local + CI): Node.js (repo expects Node 20), Docker (for compose path), `curl`. Prefer scripts that parse JSON via `node -e` (no `jq` dependency).
- Secrets: Full `/upload → /extract → subgraph` flow requires backend `OPENAI_API_KEY` to be set; without it, only run the subset smoke checks that do not require extraction.
- Local (host) run: `npm run dev` + backend running at `http://localhost:8000` passes smoke script:
  - Backend endpoints return expected status + JSON fields.
  - Frontend routes `/api/backend/openapi`, `/api/kg/capabilities`, `/api/kg/generate`, `/api/kg/graph/<source_id>` behave per acceptance criteria.
- Docker Compose run: `docker compose -f DockerCompose/compose.smoke.yml up -d --build` passes smoke script against `http://localhost:3000`.

### Must Have
- Raw file upload (no gzip) to backend `/upload`.
- Extract request uses `{ artifact_path }`.
- Relationships query `/query/relationships` reachable and paginated.
- All smoke checks are **agent-executable** (curl + `node -e` JSON parsing) and produce evidence files under `.sisyphus/evidence/`.

### Must NOT Have (guardrails)
- MUST NOT gzip or rename uploads to `.gz`.
- MUST NOT branch on `artifact_path.includes("/")` or treat it as a local filesystem path on the frontend.
- MUST NOT rely on `capabilities` failures surfacing as non-200 HTTP (they return HTTP 200 with `ok:false`).
- MUST NOT introduce browser-direct calls to backend (keep calls through Next routes unless explicitly needed).

## Verification Strategy
- Test decision: **tests-after** (no existing Jest/Vitest/Playwright in repo). Use deterministic smoke scripts + curl + `node -e` JSON parsing.
- QA policy: every task includes (a) happy path and (b) failure path, with captured evidence.
- Evidence directory: `.sisyphus/evidence/task-{N}-{slug}.(log|json|txt)`.

## Execution Strategy
### Parallel Execution Waves
Wave 1 (foundation): capability inference changes, adapter scaffolding decisions, compose fix.
Wave 2 (integration): `/api/kg/generate` orchestration fix, `/api/kg/graph` subgraph support.
Wave 3 (verification): smoke scripts + (optional) GitHub Actions workflow.

### Dependency Matrix
- T1 blocks T4/T5 (capabilities must be correct before orchestration).
- T2 blocks T5 (need adapter to render subgraph responses).
- T3 blocks T6/T7 (compose must boot).
- T4 blocks T6 (smoke script relies on stable endpoints).

## TODOs

- [x] 1. Update capabilities derivation to match POLY-PROMPT backend contracts

  **What to do**:
  - Modify `lib/kg/capabilities.ts` to derive explicit endpoint capabilities from OpenAPI:
    - `uploadMultipartEndpoint`: detect `POST /upload` where requestBody has `multipart/form-data` and includes a binary `file` field.
    - `extractJsonEndpoint`: detect `POST /extract` where JSON request body schema includes `artifact_path`.
    - `relationshipsListEndpoint`: detect `GET /query/relationships`.
    - `subgraphBySourceEndpoint`: detect `GET /query/subgraph/source/{source_id}`.
  - Update the exported `Capabilities` type accordingly and update all call sites that currently rely on `extractMultipartEndpoint`, `extractJsonEndpoint` (old detection), or `graphGetEndpoint`.
  - Remove / deprecate the current inference that treats any multipart endpoint as `extractMultipartEndpoint`.
  - Keep backward-compat fallbacks:
    - If OpenAPI cannot be fetched, return capabilities with `hasOpenAPI:false` and let `/api/kg/generate` error with a clear message.

  **Must NOT do**:
  - Do not hardcode localhost URLs in capabilities.
  - Do not treat `/upload` as returning a graph.

  **Recommended Agent Profile**:
  - Category: `deep` — OpenAPI parsing + backward-compat decisions.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5 | Blocked By: none

  **References**:
  - Pattern: `lib/kg/capabilities.ts` — current OpenAPI parsing logic.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/api.py` — routes.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/models.py` — `UploadResponse`, `ExtractRequest`.

  **Acceptance Criteria**:
  - [ ] Running `bash -lc 'curl -fsS http://localhost:3000/api/kg/capabilities | tee .sisyphus/evidence/task-1-capabilities.json | node -e "const fs=require(\"fs\");const j=JSON.parse(fs.readFileSync(0,\"utf8\")); if(!j.ok||!j.capabilities||!j.capabilities.hasOpenAPI) process.exit(1);"'` succeeds.
  - [ ] Capabilities JSON contains non-null entries for upload+extract+relationships+subgraph when backend OpenAPI provides them.

  **QA Scenarios**:
  ```
  Scenario: Capabilities derived from backend OpenAPI
    Tool: Bash
    Steps:
      1) Start backend at http://localhost:8000
      2) Start frontend at http://localhost:3000 with API_URL=http://localhost:8000
      3) curl /api/kg/capabilities and jq required fields
    Expected: ok:true and endpoints present
    Evidence: .sisyphus/evidence/task-1-capabilities.json

  Scenario: Backend down
    Tool: Bash
    Steps:
      1) Stop backend
      2) curl /api/kg/capabilities
    Expected: HTTP 200 with ok:false and capabilities.hasOpenAPI==false
    Evidence: .sisyphus/evidence/task-1-capabilities-backend-down.json
  ```

  **Commit**: YES | Message: `fix(kg): derive upload/extract/subgraph capabilities` | Files: `lib/kg/capabilities.ts`


- [x] 2. Add adapter: backend subgraph response → renderer graph

  **What to do**:
  - Create new adapter `lib/kg/adapters/backendSubgraphToRenderer.ts` that converts the backend `GET /query/subgraph/source/{source_id}` response (entities + relationships + sources) into the existing `RendererGraph` shape used by `app/graphs/[graphId]/page.tsx`.
  - Update `lib/kg/adapters/studyOntologyToRenderer.ts` to export shared renderer types (or import them from a shared module) so both adapters output identical structures.
  - Ensure link normalization uses:
    - link `source`/`target` from entity ids.
    - `type`/`predicate_name` derived from relationship type.
    - `confidence` preserved when present.
  - Implement deterministic field mapping from backend models (`GraphSubgraphResponse`):
    - Input entities: `EntityRecord { entity_id, entity_name, entity_type, data }`.
      - Output node.id = `entity_id`
      - Output node.name = `entity_name`
      - Output node.type = `entity_type`
      - Output node.description = `String(data.description ?? "")`
      - Output node.sources = derived from `sources` list below.
    - Input relationships: `RelationshipRecord { subject_entity_id, object_entity_id, relationship_type, confidence, data }`.
      - Output link.source = `subject_entity_id`
      - Output link.target = `object_entity_id`
      - Output link.type = `relationship_type` normalized to snake_case (reuse existing normalization helper)
      - Output link.confidence = `confidence ?? null`
      - Output link.content = `data` merged with `{ relationship_type }`
    - Input sources: `SourceRecord { source_id, source_name, data }`.
      - Build a lookup map `source_id -> { documentName: source_name, snippet, pageNumber }` using heuristics:
        - snippet: `data.snippet ?? data.quote ?? data.text ?? ""`
        - pageNumber: `data.page_number ?? data.pageNumber ?? 1`
      - Attach to nodes and/or links when `data.source_id` / `data.source_document_id` is present; otherwise attach an empty sources array.

  **Must NOT do**:
  - Do not change renderer graph requirements expected by `app/graphs/[graphId]/page.tsx`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — careful data-shape conversion.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 5 | Blocked By: none

  **References**:
  - Pattern: `lib/kg/adapters/studyOntologyToRenderer.ts` — renderer types + normalization helpers.
  - Consumer expectations: `app/graphs/[graphId]/page.tsx` — validation of nodes/links.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/api.py` — `/query/subgraph/source/{source_id}`.

  **Acceptance Criteria**:
  - [ ] Given a recorded backend subgraph JSON fixture, adapter produces `{ nodes:[...], links:[...] }` with required fields.
  - [ ] Adapter never throws on missing optional fields (uses safe defaults).

  **QA Scenarios**:
  ```
  Scenario: Convert minimal subgraph
    Tool: Bash
    Steps:
      1) Run a node script or unit harness to load fixture JSON and run adapter
    Expected: nodes/links arrays present; stable ids
    Evidence: .sisyphus/evidence/task-2-subgraph-adapter.json

  Scenario: Relationship references unknown entity
    Tool: Bash
    Steps:
      1) Feed fixture where relationship points to missing entity id
    Expected: adapter drops/ignores that link, does not crash
    Evidence: .sisyphus/evidence/task-2-subgraph-adapter-missing-entity.json
  ```

  **Commit**: YES | Message: `feat(kg): render backend subgraph responses` | Files: `lib/kg/adapters/backendSubgraphToRenderer.ts`, `lib/kg/adapters/studyOntologyToRenderer.ts`


- [x] 3. Fix Docker compose for reliable local deployment smoke

  **What to do**:
  - Fix the quoting bug in `DockerCompose/compose.yml` frontend command (remove trailing `'`).
  - Add a dedicated smoke compose file `DockerCompose/compose.smoke.yml` that:
    - Uses the production `Dockerfile` for frontend (builds image) and runs `node server.js`.
    - Uses backend image `ghcr.io/poly-prompt-team-7/backend-placeholder:latest` OR builds from local checkout (document both options).
    - Sets `API_URL=http://backend:8000` for the frontend container.
    - Adds healthchecks (or a wait script) for backend readiness.
    - Mounts a volume for backend `/tmp` if persistence is desired during test run (optional).

  **Must NOT do**:
  - Do not rely on bind mounts for CI smoke; bind mounts are allowed only in dev compose.

  **Recommended Agent Profile**:
  - Category: `quick` — compose syntax + small fixes.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 6,7 | Blocked By: none

  **References**:
  - Existing: `DockerCompose/compose.yml`.
  - Docs: `DockerCompose/README.md`.
  - Frontend image: `Dockerfile`, `next.config.ts` (`output:"standalone"`).

  **Acceptance Criteria**:
  - [ ] `docker compose -f DockerCompose/compose.smoke.yml up -d --build` starts both services.
  - [ ] `bash -lc 'curl -fsS http://localhost:3000/api/backend/openapi | node -e "const fs=require(\"fs\");const j=JSON.parse(fs.readFileSync(0,\"utf8\")); if(!j.openapi) process.exit(1);"'` succeeds.

  **QA Scenarios**:
  ```
  Scenario: Compose boots and frontend can reach backend
    Tool: Bash
    Steps:
      1) docker compose up -d --build
      2) Poll /api/backend/openapi until success or timeout
    Expected: success within 90s
    Evidence: .sisyphus/evidence/task-3-compose-boot.log

  Scenario: Backend container down
    Tool: Bash
    Steps:
      1) docker compose stop backend
      2) curl /api/backend/openapi
    Expected: 502 BACKEND_UNREACHABLE
    Evidence: .sisyphus/evidence/task-3-backend-down.json
  ```

  **Commit**: YES | Message: `fix(docker): add smoke compose and fix compose.yml` | Files: `DockerCompose/compose.yml`, `DockerCompose/compose.smoke.yml`


- [x] 4. Fix `/api/kg/generate` to upload raw files and follow `/upload → /extract → subgraph` flow

  **What to do**:
  - Modify `app/api/kg/generate/route.ts`:
    - Remove gzip code paths entirely (`gzipSync`, `.gz` renaming, `safeGzName`).
    - Change strategy logic:
      - If `capabilities.uploadMultipartEndpoint` and `capabilities.extractJsonEndpoint` exist:
        1) POST raw file to `${API_URL}/upload` with multipart field name required by capability (`file`).
        2) Parse `UploadResponse` and extract `artifact_path` and `source_id`.
        3) POST `${API_URL}/extract` with JSON `{ artifact_path }`.
        4) GET `${API_URL}/query/subgraph/source/${source_id}`.
        5) Convert subgraph response with new adapter to `rendererGraph`.
        6) Return `{ ok:true, mode:"remote", graphId:String(source_id), rendererGraph }`.
      - If capabilities missing required endpoints: return 400 `BACKEND_MISSING_UPLOAD_SUPPORT` with details of what is missing.
    - Align max file size limit to backend 20 MiB (match backend `MAX_COMPRESSED_BYTES`).
    - If user submits multiple files: choose one of these (pick and implement; do not leave ambiguous):
      - Decision: **Reject for now** with 400 `MULTI_FILE_UNSUPPORTED` and message "Backend accepts one file per upload".
    - Ensure backend errors are mapped to 502 with payload detail.
  - Update `app/page.tsx` client-side validation to match the new 20 MiB limit and to prevent multi-file selection (remove `multiple` on the file input, and show a clear error if more than one file is provided).

  **Must NOT do**:
  - Do not return "local" mode unless you also persist rendererGraph; prefer remote mode with `source_id`.
  - Do not call `/query/relationships` to build a graph; use `/query/subgraph/source/{source_id}` for graph view.

  **Recommended Agent Profile**:
  - Category: `deep` — orchestration + error mapping.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 1,2

  **References**:
  - Existing: `app/api/kg/generate/route.ts`.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/models.py` — `UploadResponse` fields `artifact_path` + `source_id`; `ExtractRequest` uses `artifact_path`.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/api.py` — `/upload`, `/extract`, `/query/subgraph/source/{source_id}`.

  **Acceptance Criteria**:
  - [ ] This passes without relying on repo fixtures:
    - `bash -lc 'tmp=$(mktemp); printf "hello smoke\n" > "$tmp"; curl -fsS -X POST -F "files=@$tmp;filename=smoke.txt" http://localhost:3000/api/kg/generate | tee .sisyphus/evidence/task-4-generate-ok.json | jq -e '.ok==true and .mode=="remote" and (.graphId|length>0) and (.rendererGraph.nodes|type=="array")''`
  - [ ] Upload uses raw file bytes (no `.gz` filename, no gzip content).
  - [ ] Submitting a `.exe` returns HTTP 400 with a stable error code.

  **QA Scenarios**:
  ```
  Scenario: Happy path generate (txt)
    Tool: Bash
    Steps:
      1) Start backend + frontend
      2) POST /api/kg/generate with a small .txt
    Expected: ok:true, mode:remote, graphId set, rendererGraph nodes/links arrays
    Evidence: .sisyphus/evidence/task-4-generate-ok.json

  Scenario: Multi-file upload rejected
    Tool: Bash
    Steps:
      1) POST two files in files=...
    Expected: 400 MULTI_FILE_UNSUPPORTED
    Evidence: .sisyphus/evidence/task-4-generate-multifile.json
  ```

  **Commit**: YES | Message: `fix(kg): upload raw files and extract via artifact_path` | Files: `app/api/kg/generate/route.ts`


- [x] 5. Update `/api/kg/graph/[graphId]` to support backend subgraph endpoint

  **What to do**:
  - Modify `app/api/kg/graph/[graphId]/route.ts` to support a new capability `subgraphBySourceEndpoint`.
  - Behavior:
    - Treat `graphId` as backend `source_id`.
    - Call backend `GET /query/subgraph/source/{source_id}`.
    - Convert response to `rendererGraph` using `backendSubgraphToRendererGraph`.
    - Return `{ ok:true, graphId, graph:null, rendererGraph }`.
  - Keep existing KnowledgeGraph/RendererGraph support as fallback (do not break other backends).

  **Must NOT do**:
  - Do not require a backend path containing "graph".

  **Recommended Agent Profile**:
  - Category: `unspecified-high` — careful backwards compatibility.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 6 | Blocked By: 1,2

  **References**:
  - Existing: `app/api/kg/graph/[graphId]/route.ts`.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/api.py`.
  - Adapter: `lib/kg/adapters/backendSubgraphToRenderer.ts`.

  **Acceptance Criteria**:
  - [ ] After running Task 4, `curl -fsS http://localhost:3000/api/kg/graph/<graphId> | jq -e '.ok==true and (.rendererGraph.nodes|type=="array")'` succeeds.

  **QA Scenarios**:
  ```
  Scenario: Fetch rendered graph by source_id
    Tool: Bash
    Steps:
      1) Obtain graphId from /api/kg/generate
      2) GET /api/kg/graph/<graphId>
    Expected: ok:true and rendererGraph nodes/links arrays
    Evidence: .sisyphus/evidence/task-5-graph-get.json

  Scenario: Invalid graphId
    Tool: Bash
    Steps:
      1) GET /api/kg/graph/not-a-number
    Expected: backend 422/400 mapped to 502 with helpful error code
    Evidence: .sisyphus/evidence/task-5-graph-invalid.json
  ```

  **Commit**: YES | Message: `feat(kg): fetch graphs via backend subgraph endpoint` | Files: `app/api/kg/graph/[graphId]/route.ts`, `lib/kg/capabilities.ts`


- [x] 6. Add scripted smoke tests (local + compose)

  **What to do**:
  - Add `scripts/smoke/` with:
    - `fixtures/smoke.txt` (small deterministic text).
    - `smoke-backend.sh`: hits backend directly: `/health`, `/upload`, `/extract`, `/query/relationships`.
    - `smoke-frontend.sh`: hits frontend proxy routes: `/api/backend/openapi`, `/api/kg/capabilities`, `/api/kg/generate`, `/api/kg/graph/<graphId>`.
    - `wait-http.sh`: helper to poll an endpoint with timeout.
  - Ensure scripts:
    - Fail fast (`set -euo pipefail`).
    - Print key JSON fields.
    - Save responses into `.sisyphus/evidence/`.
    - Parse JSON using Node (e.g., `node -e '...'`) rather than requiring `jq`.

  **Must NOT do**:
  - Do not require `rg` (not present in environment).

  **Recommended Agent Profile**:
  - Category: `quick` — scripting + evidence outputs.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 7 | Blocked By: 3,4,5

  **References**:
  - Frontend routes: `app/api/backend/openapi/route.ts`, `app/api/kg/*`.
  - Backend contract: `POLY-PROMPT-TEAM-7/backend:lib/backend_placeholder/api.py`.

  **Acceptance Criteria**:
  - [ ] `bash scripts/smoke/smoke-backend.sh http://localhost:8000` exits 0 and writes evidence files.
  - [ ] `bash scripts/smoke/smoke-frontend.sh http://localhost:3000` exits 0 and writes evidence files.

  **QA Scenarios**:
  ```
  Scenario: Backend smoke
    Tool: Bash
    Steps:
      1) bash scripts/smoke/smoke-backend.sh http://localhost:8000
    Expected: all curls succeed; extract returns json with already_processed boolean
    Evidence: .sisyphus/evidence/task-6-backend-smoke.log

  Scenario: Frontend smoke
    Tool: Bash
    Steps:
      1) bash scripts/smoke/smoke-frontend.sh http://localhost:3000
    Expected: openapi ok, capabilities ok, generate ok, graph get ok
    Evidence: .sisyphus/evidence/task-6-frontend-smoke.log
  ```

  **Commit**: YES | Message: `test(smoke): add backend/frontend smoke scripts` | Files: `scripts/smoke/*`


- [x] 7. (Optional) Add GitHub Actions workflow to run smoke tests

  **What to do**:
  - Add `.github/workflows/smoke.yml`:
    - Build frontend docker image.
    - Start backend + frontend using `DockerCompose/compose.smoke.yml`.
    - Run `scripts/smoke/smoke-frontend.sh http://localhost:3000`.
  - Gate extract-dependent steps:
    - If `OPENAI_API_KEY` secret is present, run full flow.
    - If not present, skip `/extract` and only test `/health`, `/openapi`, `/upload` (or skip backend entirely).

  **Must NOT do**:
  - Do not leak secrets into logs.

  **Recommended Agent Profile**:
  - Category: `unspecified-low` — CI YAML.
  - Skills: `[]`.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: 6

  **References**:
  - Compose: `DockerCompose/compose.smoke.yml`.
  - Smoke scripts: `scripts/smoke/*`.

  **Acceptance Criteria**:
  - [ ] Workflow runs on PR and produces smoke logs as artifacts.

  **QA Scenarios**:
  ```
  Scenario: CI run with OPENAI_API_KEY
    Tool: Bash
    Steps:
      1) Trigger workflow on PR
    Expected: job passes, logs uploaded
    Evidence: .sisyphus/evidence/task-7-ci-run.txt

  Scenario: CI run without OPENAI_API_KEY
    Tool: Bash
    Steps:
      1) Remove secret (or simulate)
    Expected: workflow skips extract flow and still validates openapi/capabilities
    Evidence: .sisyphus/evidence/task-7-ci-no-secret.txt
  ```

  **Commit**: YES | Message: `ci: add docker smoke workflow` | Files: `.github/workflows/smoke.yml`


## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA (scripted) — unspecified-high
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Small, atomic commits per TODO.
- Suggested order: 1 → 2 → 4 → 5 → 3 → 6 → 7.

## Success Criteria
- From a clean checkout, an agent can:
  - Start backend + frontend via compose.
  - Run smoke scripts.
  - Upload a raw file, extract via artifact_path, query relationships, and view the rendered graph via `/graphs/<source_id>`.
