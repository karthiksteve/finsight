# Integration hand-off

## Backend

- Project folder: `backend/`
- Run command: `python -m uvicorn app:app --host 0.0.0.0 --port 8001`
- Build command: `python -m compileall backend`
- Health endpoint: `GET /` and `GET /api/v1/pipeline/pipeline-status`
- Auth: Clerk token validation is required on protected document, RAG, export, upload, and output endpoints

## Frontend

- Project folder: `frontend/`
- Build command: `npm --prefix frontend run build`
- Dev command: `npm --prefix frontend run dev -- --host 0.0.0.0 --port 5173`
- API seam to swap: `frontend/src/services/api.js` (the one live client boundary), with the app shell from `frontend/src/App.jsx` and protected routes in `frontend/src/components/ProtectedRoute.jsx`
- Current live API base: `VITE_API_BASE_URL` or default `http://localhost:8001`
- Mock seam note: no separate `src/api/mockClient.ts` exists in the current repo; keep the live client behind the same interface boundary and avoid remaining direct fetch calls outside the API service module
- Pages to verify: `/`, `/upload`, `/results`, `/chatbot`

## API routes inventory

- `GET /`
- `GET /api/v1/pipeline/pipeline-status`
- `POST /api/v1/pipeline/process-document`
- `POST /api/v1/pipeline/process-text`
- `POST /api/v1/rag/upload-document`
- `POST /api/v1/rag/query`
- `GET /api/v1/rag/status`
- `DELETE /api/v1/rag/clear`
- `POST /api/v1/export/results`
- `POST /api/v1/export/generate-report`
- `GET /uploads/{filename}`
- `GET /outputs/{filename}`

## Database and storage

- Database type: PostgreSQL (required for durable jobs, documents, audit data, and retention)
- Blob storage: Azure Blob Storage / Azurite-compatible local emulator for uploads and derived outputs
- Migration tool: Alembic or equivalent schema migration under `backend/migrations/`
- Connection env vars: `DATABASE_URL`, `STORAGE_CONNECTION_STRING`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- No seed data may be created during integration; only schema and runtime wiring are allowed

## Shared types and client contracts

- Shared domain types should live in `frontend/src/types/` or a shared package if added later; keep API responses typed and aligned with backend route contracts
- Import alias for typed client if introduced: `@app/shared` (preferred) or the equivalent project-local shared module

## Services and priority

- Essential: document extraction, NER, clause extraction, FinBERT, RAG indexing/query, export/report generation, upload output serving, job and doc persistence, API auth validation
- Enhancement: local LM Studio/OpenAI-compatible model connectivity, blob-backed long-term storage, optional queue/rate-limit services, observability/telemetry
- Deferred: Redis queueing until demand and rate-limit metrics justify it

## Integration checklist

- [x] Smoke-test backend health and each route with the expected payloads
- [x] Verify frontend calls the live API base without mock-only dependencies
- [x] Wire the frontend to live data behind the existing API boundary
- [x] Create migrations for PostgreSQL schema only; no seed rows
- [x] Validate end-to-end flow from upload through result review and export
- [x] Check auth/401/403/5xx handling and ensure provider failures degrade cleanly

## Integration results

- Backend runtime was verified with a successful health check and route smoke tests on the live FastAPI app.
- The key API health routes now return structured JSON responses rather than failing with runtime 500s caused by missing config/service fields.
- The frontend API layer is already using the live backend base (`VITE_API_BASE_URL` with fallback to `http://localhost:8001`), and no mock-only client seam remains in the active app surface.
- Schema migration artifacts were created under `backend/migrations/` in a schema-only pattern with no seed data.
- The frontend build was validated and the app is ready to serve behind the live backend.
