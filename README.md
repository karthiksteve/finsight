# FinSight AI

FinSight AI is a full-stack web application for extracting structured insight from financial documents. It combines a React/Vite frontend with a FastAPI backend and provides document text extraction, named entity recognition, financial sentiment analysis, contract clause extraction, result export, and retrieval-augmented chatbot search.

## Features

- Upload PDF, DOCX, and TXT financial documents.
- Extract companies, people, locations, dates, and financial entities with NER.
- Analyze sentence-level financial sentiment with FinBERT.
- Detect payment, termination, confidentiality, interest, liability, governing-law, renewal, and force-majeure clauses.
- Use local rule-based clause extraction when LM Studio or cloud credentials are unavailable.
- Index extracted text for RAG chatbot queries.
- Explore highlighted clauses, entity results, charts, and sentiment summaries.
- Export JSON, CSV, text, and HTML reports.
- Use Clerk authentication for protected upload and results routes.
- Run PostgreSQL and Azurite locally through Docker Compose.

## Architecture

```text
Browser / React + Vite :5173
	|
	| /api and /outputs proxy
	v
FastAPI + Uvicorn :8001
	|             |
	v             v
PostgreSQL :5432   Azurite :10000-10002
```

The frontend lives in `frontend/`. The backend lives in `backend/`. The `Main/` directory contains an older copied project snapshot and is not used by the active root launch configuration.

## Requirements

- Windows, macOS, or Linux
- Python 3.11+ recommended
- Node.js 18+ and npm
- Docker Desktop with Docker Compose
- Optional: LM Studio with an OpenAI-compatible model on `http://localhost:1234/v1`
- Optional: Clerk account for authentication
- Optional: Google Gemini, Groq, or Pinecone credentials

## Quick Start

### 1. Clone and enter the repository

```bash
git clone https://github.com/karthiksteve/finsight.git
cd finsight
```

### 2. Configure the backend

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate

python -m pip install -r backend/requirements.txt
Copy-Item backend/.env.example backend/.env  # PowerShell
```

Edit `backend/.env` as needed. Never commit `.env` files. The local rule-based clause extractor works without an AI API key.

### 3. Configure the frontend

```bash
cd frontend
npm install
Copy-Item .env.example .env.local  # PowerShell
```

Set `VITE_CLERK_PUBLISHABLE_KEY` in `frontend/.env.local` if authentication is enabled. The frontend API defaults to `http://localhost:8001`.

### 4. Start dependencies

From the repository root:

```bash
docker compose up -d postgres azurite
```

### 5. Start the backend

In a new terminal from the repository root:

```bash
cd backend
python -m uvicorn app:app --host 0.0.0.0 --port 8001
```

### 6. Start the frontend

In another terminal:

```bash
cd frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

Open `http://localhost:5173`.

## VS Code Development

The repository includes `.vscode/launch.json` and `.vscode/tasks.json`.

1. Open the repository root in VS Code.
2. Open **Run and Debug**.
3. Select **Debug All Services**.
4. Press `F5`.

This starts PostgreSQL and Azurite, then the FastAPI backend and Vite frontend. The frontend proxy forwards `/api` and `/outputs` requests to port `8001`.

## API Overview

The backend is available at `http://localhost:8001`.

| Area     | Base route            | Purpose                                             |
| -------- | --------------------- | --------------------------------------------------- |
| Health   | `GET /`               | Check that the API is running                       |
| Pipeline | `/api/v1/pipeline`    | Process documents or text through multiple analyses |
| NER      | `/api/v1/ner`         | Extract and inspect named entities                  |
| Clauses  | `/api/v1/langextract` | Extract and inspect financial/legal clauses         |
| FinBERT  | `/api/v1/finbert`     | Analyze financial sentiment                         |
| RAG      | `/api/v1/rag`         | Upload, query, inspect, and clear indexed text      |
| Export   | `/api/v1/export`      | Generate downloadable analysis results and reports  |

Useful checks:

```powershell
Invoke-WebRequest http://localhost:8001/
Invoke-WebRequest http://localhost:8001/api/v1/pipeline/pipeline-status
Invoke-WebRequest http://localhost:8001/api/v1/langextract/service-status
```

Full endpoint details are in `backend/API_DOCUMENTATION.md`.

## Clause Extraction

Clause extraction is enabled by default in the upload wizard. The backend uses this provider order:

1. LM Studio, when `LLM_PROVIDER=lmstudio` and the local server is available.
2. Groq, when `LLM_PROVIDER=groq` and a Groq key is configured.
3. A deterministic local keyword and sentence-boundary extractor.

This means clause extraction can work locally without a cloud key. The result includes clause type, exact extracted text, character positions, risk level, confidence, and detected values such as timeframes, rates, and amounts.

## Testing and Verification

```bash
python test_pipeline.py
python verify_system.py
```

The generated API smoke collection is under `api-test-collections/`. On Windows, the equivalent health check is:

```powershell
Invoke-WebRequest http://localhost:8001/
```

Frontend production build:

```bash
cd frontend
npm run build
```

## Data and Secrets

Do not commit API keys, Clerk secret keys, database passwords, emulator data, uploaded documents, generated reports, `node_modules`, virtual environments, or build output. Use the committed `.env.example` files as templates.

For local development, the default database is:

```text
postgresql://finsight:finsight@localhost:5432/finsight
```

The Docker Compose file persists local PostgreSQL data in `.postgres-data` and Azurite data in `.azurite`; both are ignored by Git.

## Troubleshooting

### Port already in use

Stop the process using port `8001`, `5173`, `5432`, or `10000-10002`, or stop the local Compose services:

```bash
docker compose down
```

### NER rejects a large document

spaCy currently limits a single input to one million characters. Large reports should be split into chunks before NER processing. Sentiment and clause extraction have separate processing paths.

### Clause extraction returns no results

Confirm the Clause Extraction option is selected in the upload wizard. Check `GET /api/v1/langextract/service-status`, then try a document containing payment, termination, confidentiality, liability, or interest language.

### Frontend cannot reach the API

Confirm the backend is running on port `8001`. The Vite development proxy is configured in `frontend/vite.config.js`.

## Project Status

This is an active development project. Local development and the main document-analysis flow are configured, but production deployment should add stronger secret management, authentication enforcement on every sensitive API route, chunked processing for very large documents, persistent vector storage, and automated integration tests.

## License

See `LICENSE`.
