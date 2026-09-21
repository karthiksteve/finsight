# Project Plan

**Status**: Approved
**Created**: 2026-09-17
**Mode**: AUGMENT

---

## 1. Project Overview

**Goal**: Harden and complete FinSight AI, an authenticated financial-document intelligence workspace that uploads documents, extracts text, detects financial entities, analyzes sentiment with FinBERT, extracts clauses, indexes content for local-LLM RAG/chat, stores durable documents and jobs, exports results, and exposes reliable health and error states. The project is designed so that every module is independently testable.

**App Type**: SPA + API

**API Login**: Yes

**Mode**: AUGMENT

**Deployment Plan**: No deployment plan found

---

## 2. Backend — Azure Functions

| Component           | Technology     |
| ------------------- | -------------- |
| **Language**        | Python         |
| **Runtime**         | CPython        |
| **Package Manager** | pip            |
| **Test Runner**     | pytest         |
| **Mocking Library** | unittest.mock  |
| **Test Command**    | pytest         |
| **Orchestration**   | docker-compose |

**Existing implementation**: `backend/app.py`, `backend/routers/`, and `backend/services/` remain the ownership boundary. Preserve FastAPI routes while introducing provider interfaces for local OpenAI-compatible inference, embeddings, vector storage, and durable job/document persistence. Replace permissive CORS and timeout-based access bypasses with validated configuration, request-scoped authentication, structured error responses, upload validation, retention policies, audit records, and observable job status.

**Capabilities**: Document upload and extraction, financial NER, FinBERT sentiment, clause extraction, local-LLM RAG/chat, durable jobs/documents, security controls, observability, and retention.

---

## 3. Frontend — Web App

| Component           | Technology   |
| ------------------- | ------------ |
| **Language**        | JavaScript   |
| **Framework**       | React + Vite |
| **Package Manager** | npm          |
| **Test Runner**     | vitest       |
| **Mocking Library** | vi.mock      |
| **Test Command**    | npm test     |

**Existing implementation**: `frontend/src/App.jsx`, `frontend/src/pages/`, `frontend/src/components/`, and `frontend/src/services/api.js` remain the application surface. Retain Tailwind CSS during the hardening pass, while the scaffold uses Fluent UI v9 primitives for durable controls, message bars, cards, tabs, fields, and action toolbars. Preserve Clerk session handling and route protection, but ensure the API client sends validated tokens and handles 401/403/5xx responses consistently.

---

## 4. Services Required

| Azure Service | Role in App                                                                                         | Environment Variable        | Default Value (Local)                                                        | Classification |
| ------------- | --------------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | -------------- |
| PostgreSQL    | Durable tenants, documents, processing jobs, extracted metadata, audit records, and retention state | `DATABASE_URL`              | `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:5432/finsight` | Essential      |
| Blob Storage  | Private source documents, derived HTML/artifacts, and controlled exports                            | `STORAGE_CONNECTION_STRING` | `UseDevelopmentStorage=true`                                                 | Essential      |

Local LLM inference remains an external provider boundary compatible with LM Studio at `http://localhost:1234/v1`; it is an enhancement and must degrade with an explicit unavailable-provider state rather than preventing document processing. Redis is deferred until measured queue/rate-limit demand requires it.

---

## 5. Prerequisites

### Run

| Tool                       | Service(s)        | Installed | Version                                                               |
| -------------------------- | ----------------- | --------- | --------------------------------------------------------------------- |
| Python                     | backend           | ✅        | 3.14.0                                                                |
| pip                        | backend           | ✅        | 26.1.2                                                                |
| Node.js                    | frontend          | ✅        | 24.11.1                                                               |
| npm                        | frontend          | ✅        | 11.6.2                                                                |
| Docker                     | backend, frontend | ✅        | 29.5.3                                                                |
| Docker Compose             | backend, frontend | ✅        | v5.1.4                                                                |
| Azure Functions Core Tools | backend           | ❓        | Could not be confirmed; double-check before running Functions tooling |

### Debug

| Tool                                  | Service(s) | Installed | Version                                                                 |
| ------------------------------------- | ---------- | --------- | ----------------------------------------------------------------------- |
| Edge                                  | frontend   | ✅        | Installed; version not queried                                          |
| `ms-azuretools.vscode-azurefunctions` | backend    | ❓        | Could not be confirmed; double-check before debugging Functions tooling |

Use Docker Compose for PostgreSQL and Azurite-compatible Blob Storage emulation. Any `❓` prerequisite must be double-checked before proceeding with the corresponding run or debug workflow.

---

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A calm, evidence-first financial operations console: warm paper surfaces, deep ink text, restrained copper actions, and teal analysis signals. Use compact density for repeatable review work, 6px control corners, clear status badges, and strong table hierarchy rather than marketing cards.
**Typography**: Segoe UI Variable, Segoe UI

### Color Palette

| Token     | Hex       | Usage                                                                    |
| --------- | --------- | ------------------------------------------------------------------------ |
| `primary` | `#0F4C5C` | Secure navigation, primary analysis actions, active workspace state      |
| `accent`  | `#C46A3A` | Upload and export actions, attention markers, selected result highlights |
| `surface` | `#F7F3EC` | Workspace background and reading surfaces                                |
| `text`    | `#172126` | Document titles, extracted text, table values, and primary labels        |
| `muted`   | `#68757A` | Metadata, timestamps, helper text, and provider status                   |
| `border`  | `#D9D4CA` | Panel boundaries, table rules, form fields, and document separators      |

### Pages

| Page             | Route      | Purpose                                                                             | Layout                                                                     |
| ---------------- | ---------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| Workspace        | `/`        | See processing health, recent documents, and the next review action.                | `header, nav, hero, main, grid, card-list, footer`                         |
| Upload & Process | `/upload`  | Submit a supported financial document and choose NER, clause, and FinBERT stages.   | `header, nav, main, split(form                                             | card-list), action-bar, footer` |
| Analysis Results | `/results` | Review extracted entities, sentiment, clauses, pipeline status, and export actions. | `header, nav, main, tabs, two-column(table+card-list), action-bar, footer` |
| RAG Assistant    | `/chatbot` | Ask questions against indexed documents and inspect retrieved context.              | `header, nav, main, two-column(card-list                                   | form), footer`                  |

### Sample Content

Workspace — document:
| Document | Pipeline | Updated | Status |
|----------|----------|---------|--------|
| Acme Q4 2025 Earnings Report.pdf | NER · FinBERT · Clauses | Sep 17, 2026 · 10:42 | Ready |
| Northstar Supplier Agreement.docx | NER · Clauses | Sep 16, 2026 · 16:08 | Review needed |
| Meridian Credit Facility.txt | Text extraction · RAG index | Sep 15, 2026 · 09:24 | Processing |

Upload & Process — form: File: Acme Q4 2025 Earnings Report.pdf · NER: Enabled · FinBERT: Enabled · Clause extraction: Enabled

Analysis Results — extracted result:
| Entity | Type | Evidence | Confidence |
|--------|------|----------|------------|
| Acme Corporation | ORGANIZATION | Acme Corporation reported revenue growth | 98% |
| USD 5,000,000 | MONEY | payment obligation of USD 5,000,000 | 96% |
| 30 days | DATE / TERM | payable within 30 days of receipt | 91% |

Analysis Results — clause:
| Clause | Finding | State |
|--------|---------|-------|
| Payment terms | Invoices are payable within 30 days of receipt. | Extracted |
| Termination | Either party may terminate with 60 days notice. | Extracted |
| Sentiment | Positive operating outlook with moderate confidence. | Ready |

RAG Assistant — conversation:
| Question | Answer | Source |
|----------|--------|--------|
| What is the payment term specified in the contract? | Invoices are payable within 30 days of receipt. | Northstar Supplier Agreement.docx |
| What amount is due under the payment obligation? | The document identifies a USD 5,000,000 payment obligation. | Acme Q4 2025 Earnings Report.pdf |
| Which documents are indexed? | 12 documents are available in the current workspace. | RAG index status |

---

## 7. Project Structure

```
nlp_proj/
├── .azure/project-plan.md
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── requirements.txt
│   ├── routers/
│   ├── services/
│   ├── providers/
│   ├── models/
│   ├── migrations/
│   └── tests/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       ├── services/api.js
│       └── lib/
├── sample_data/
├── source_code/
├── test_pipeline.py
├── verify_system.py
└── run_app.py
```

---

## 8. Route Definitions

| #   | Method | Path                                | Description                                                        | Request Body                       | Response Body                                                                              | Status Codes       |
| --- | ------ | ----------------------------------- | ------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ |
| 1   | GET    | `/`                                 | API health check                                                   | —                                  | `{ status, message }`                                                                      | 200, 503           |
| 2   | GET    | `/api/v1/pipeline/pipeline-status`  | Report NER model availability                                      | —                                  | `{ ner: { available, model_path, model_exists } }`                                         | 200, 503           |
| 3   | POST   | `/api/v1/pipeline/process-document` | Upload and run extraction, NER, clauses, FinBERT, and RAG indexing | multipart file plus pipeline flags | `{ success, file_info, text_extraction, ner, langextract, finbert, rag_indexed, summary }` | 200, 400, 422, 500 |
| 4   | POST   | `/api/v1/pipeline/process-text`     | Run pipeline stages on pre-extracted text                          | `{ text, options }`                | `{ success, text_info, pipeline_steps, ner, langextract, finbert }`                        | 200, 400, 422, 500 |
| 5   | POST   | `/api/v1/rag/upload-document`       | Upload and index a document for retrieval                          | multipart file                     | `{ success, message, filename, size_bytes }`                                               | 200, 400, 500      |
| 6   | POST   | `/api/v1/rag/query`                 | Answer a question using indexed document context                   | `{ question, top_k }`              | `{ success, answer, sources, ... }`                                                        | 200, 400, 503      |
| 7   | GET    | `/api/v1/rag/status`                | Report vector backend, provider, and document counts               | —                                  | `{ initialized, backend, total_documents, llm_provider }`                                  | 200, 503           |
| 8   | DELETE | `/api/v1/rag/clear`                 | Clear indexed documents for the current workspace                  | —                                  | `{ success, message }`                                                                     | 200, 403, 500      |
| 9   | POST   | `/api/v1/export/results`            | Export NER, clauses, sentiment, and metadata                       | `{ data, format }`                 | Downloadable JSON, CSV, or TXT stream                                                      | 200, 400, 500      |
| 10  | POST   | `/api/v1/export/generate-report`    | Generate a comprehensive HTML analysis report                      | Analysis result object             | HTML report stream or file                                                                 | 200, 400, 500      |
| 11  | GET    | `/uploads/{filename}`               | Serve an authorized source upload                                  | —                                  | File stream                                                                                | 200, 403, 404      |
| 12  | GET    | `/outputs/{filename}`               | Serve an authorized derived artifact                               | —                                  | File stream                                                                                | 200, 403, 404      |

All new and hardened error responses use `{ error: { code, message, details } }`. Authentication is enforced for document, RAG, export, upload, and output operations; health and model capability checks remain safe to expose without a session.

---

## 9. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification
