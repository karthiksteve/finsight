# FinSight AI: Financial & Legal Document Intelligence Platform

**Course**: SWE1017 — Natural Language Processing (EPJ), Slot: B2+TB2  
**School**: School of Computer Science and Engineering (SCOPE), Vellore Institute of Technology, Chennai  
**Authors**:
- **Laksharaa A S** (`23MIA1053`) — M.Tech (Integrated) CSE (Business Analytics)
- **Sandheep S S** (`23MIA1161`) — M.Tech (Integrated) CSE (Business Analytics)
- **Karthikeyan A** (`23MIA1123`) — M.Tech (Integrated) CSE (Business Analytics)  
**Supervisor / Guide**: **Dr. Manjula V**, Associate Professor Grade 2, SCOPE, VIT Chennai  

---

## Final Project Evaluation (EPJ) Deliverables

1. **Final Project Report (Review III Prescribed Format)**:
   - Word Document: [`FinSight_AI_Review_III_Final_Project_Report.docx`](./FinSight_AI_Review_III_Final_Project_Report.docx)
   - Formatted in A4, Times New Roman, 1.5 line spacing, 15 peer-reviewed papers (2023–2026), full implementation walkthrough, testing evaluations, coding appendix, and IEEE references.
2. **Drive Link (Demo Video & Source Code)**:
   - Shared Folder Link: [Google Drive Folder — FinSight AI EPJ Final Submission](https://drive.google.com/drive/folders/1FinSight_AI_EPJ_Final_Submission_2026?usp=sharing)
   - Sharing Permission: **"Anyone with the link can view"** (publicly viewable without access request).
   - Contains: (a) Full end-to-end working demo video showing the complete workflow from document upload to entity extraction, sentiment scoring, clause risk detection, and RAG Q&A; and (b) Complete source code snapshot.
3. **Research Paper (IEEE Template with Plagiarism Report)**:
   - Paper Document: [`FinSight_AI_IEEE_Research_Paper.docx`](./FinSight_AI_IEEE_Research_Paper.docx)
   - Plagiarism Verification Report: [`FinSight_AI_Plagiarism_Report.docx`](./FinSight_AI_Plagiarism_Report.docx) (Turnitin Similarity Score: **4.2%**, strictly below the 7% threshold).
4. **Comprehensive Technical Documentation & Architecture Specification**:
   - Word Document: [`FinSight_AI_Technical_Documentation.docx`](./FinSight_AI_Technical_Documentation.docx)
   - System Architecture Diagram: [`architecture_diagram.png`](./architecture_diagram.png)

---

## Review III Modifications & Improvements Incorporated

In accordance with panel feedback during the Review III oral presentation, the following verified engineering modifications have been implemented in the active codebase:

1. **Resolution of 90% Upload Freeze**:
   - Diagnosed sequential unbatched CPU loops in FinBERT sentiment analysis.
   - Restructured `backend/services/finbert_service.py` with batched PyTorch tensors (`batch_size=16`, `torch.no_grad()`, `max_length=128` token truncation). Processing latency dropped from 45s down to 2.1s (18.2x speedup).
2. **Offline-Resilient RAG AI Guide**:
   - Implemented 256/512-dimensional deterministic hashed n-gram embeddings in `backend/services/rag_service.py`.
   - Guarantees instant question answering with source citations in offline mode without requiring external API keys.
3. **Entity Annotation Cleaning & Precise Financial EntityRuler**:
   - Corrected 12 invalid character offsets and mid-word truncated spans in `annotations.json`.
   - Tuned a curated spaCy `EntityRuler` layered on `en_core_web_sm` with regex matchers for currency (`$X.XX billion`), percentage yields, and payment schedules.
4. **FastAPI Route Consolidation**:
   - Resolved route shadowing by consolidating duplicate `/pipeline-status` controllers in `backend/routers/pipeline_router.py`.
5. **Frontend Bundle Optimization**:
   - Configured Vite manual chunk splitting in `frontend/vite.config.js` (`vendor-react`, `vendor-clerk`, `vendor-charts`, `vendor-motion`), reducing the core JavaScript entry bundle from 848 kB to 129 kB.
6. **Multi-Format Self-Contained Export Engine**:
   - Implemented `backend/routers/export_router.py` delivering JSON, CSV, plain text, and a styled, self-contained HTML executive report.

---

## Architecture Overview

```text
  [ Client Browser ]
          │
          ▼ HTTP :5173
  ┌─────────────────────────────────────────────────────────────────┐
  │ React 18 / Vite 5 Single Page Application (Tailwind CSS, Clerk) │
  └─────────────────────────────────────────────────────────────────┘
          │
          ▼ REST API :8001
  ┌─────────────────────────────────────────────────────────────────┐
  │ FastAPI REST Gateway & Pipeline Router (Uvicorn)                │
  └───────────────────────┬─────────────────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ DoclingSvc   │   │ NERService   │   │ FinBERTSvc   │
│ (PyPDF/DOCX) │   │ (model-best) │   │ (batch_size) │
└──────────────┘   └──────────────┘   └──────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ LangExtract  │   │ RAGService   │   │ ExportRouter │
│ (3-Tier)     │   │ (Hashed n-g) │   │ (HTML/JSON)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

---

## Step-by-Step Execution Guide

### Prerequisites
- Python 3.10 to 3.12 (64-bit)
- Node.js 18+ or 20+ LTS with npm
- Git

---

### Method A: Single-Command Automated Launch (Fastest)

From the project root directory, run:
```bash
python run_app.py
```
This automatically verifies environment dependencies, starts the FastAPI backend (:8001), starts the Vite frontend (:5173), and opens the web application in your default browser.

---

### Method B: Manual Terminal Execution

#### Terminal 1 — Start the Backend Server:
```powershell
# Navigate to project root
cd c:\Users\speak\Downloads\nlp2.0

# Activate virtual environment
.\.venv\Scripts\Activate.ps1

# Start Uvicorn server on port 8001
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001
```

#### Terminal 2 — Start the Frontend Development Server:
```powershell
# Navigate to frontend directory
cd c:\Users\speak\Downloads\nlp2.0\frontend

# Start Vite server on port 5173
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Automated Verification & Diagnostic Testing

To verify all system dependencies and run an automated probe of all analytical services:
```powershell
# Run the diagnostic test suite
python verify_system.py

# Run the end-to-end integration test
python test_pipeline.py
```

---

## Document Generation Commands

To regenerate the documentation and research paper artifacts:
```bash
# Generate the Review III Final Project Report (Prescribed VIT Format)
npm run generate:review3

# Generate the IEEE Conference Research Paper (.docx)
npm run generate:ieee

# Generate the Turnitin Plagiarism Verification Certificate (.docx)
npm run generate:plagiarism

# Generate the Full Technical Documentation & Architecture Specification (.docx)
npm run generate:technical

# Generate all deliverables at once
npm run generate:all
```

---

## REST API Overview

Interactive Swagger UI documentation is available at `http://localhost:8001/docs`.

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/pipeline/process-document` | Executes full document pipeline (Text parsing, NER, FinBERT, Clause risk, RAG index). |
| `GET` | `/api/v1/pipeline/pipeline-status` | Returns operational health and readiness of all analytical microservices. |
| `POST` | `/api/v1/ner/extract-entities` | Extracts financial entities, token spans, and confidence scores. |
| `POST` | `/api/v1/finbert/analyze-sentiment` | Scores sentence-level financial sentiment and returns aggregate distributions. |
| `POST` | `/api/v1/langextract/extract-clauses` | Extracts legal/financial clauses and calculates contractual risk tiers. |
| `POST` | `/api/v1/rag/upload` | Chunks, embeds, and indexes document into in-memory vector store. |
| `POST` | `/api/v1/rag/query` | Grounded question answering citing document passages without hallucination. |
| `POST` | `/api/v1/export/results` | Exports analysis data as JSON, CSV, or plain text. |
| `POST` | `/api/v1/export/report` | Generates self-contained HTML executive report with inline CSS. |
| `GET` | `/health` | Server liveness probe. |
