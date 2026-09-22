const path = require("path");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, convertInchesToTwip
} = require("docx");

const FONT = "Calibri";
const BODY_SIZE = 22; // 11pt
const bodyFont = { font: FONT, size: BODY_SIZE };

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 200, line: 276 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...bodyFont, bold: opts.bold, italics: opts.italics })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 30, color: "1F3B57" })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 26, color: "2E5B82" })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "main-bullets", level },
    spacing: { after: 120, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    children: [new TextRun({ text, ...bodyFont })],
  });
}

function bulletRuns(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: "main-bullets", level },
    spacing: { after: 120, line: 276 },
    alignment: AlignmentType.JUSTIFIED,
    children: runs,
  });
}

function r(text, opts = {}) {
  return new TextRun({ text, ...bodyFont, bold: opts.bold, italics: opts.italics });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.header ? { type: ShadingType.CLEAR, fill: "1F3B57" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            font: FONT,
            size: 20,
            bold: !!opts.header,
            color: opts.header ? "FFFFFF" : "000000",
          }),
        ],
      }),
    ],
  });
}

function borderedTable(rows, widths) {
  const borderSpec = { style: BorderStyle.SINGLE, size: 4, color: "B8C4CE" };
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    borders: {
      top: borderSpec, bottom: borderSpec, left: borderSpec, right: borderSpec,
      insideHorizontal: borderSpec, insideVertical: borderSpec,
    },
    rows,
  });
}

const doc = new Document({
  numbering: {
    config: [
      {
        reference: "main-bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.2) } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u2013", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.7), hanging: convertInchesToTwip(0.2) } } } },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 },
        },
      },
      children: [
        // ---------------- Title block ----------------
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "FinSight AI", font: FONT, bold: true, size: 44, color: "1F3B57" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 40 },
          children: [new TextRun({ text: "A Financial Document Intelligence Platform", font: FONT, size: 26, italics: true, color: "44576B" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 360 },
          children: [new TextRun({ text: "Project Review II — Implementation Report", font: FONT, bold: true, size: 24 })],
        }),
        borderedTable(
          [
            new TableRow({ children: [cell("Prepared by", { header: true, width: 2600 }), cell("Karthikeyan A (Steve)", { width: 5600 })] }),
            new TableRow({ children: [cell("Programme", { header: true, width: 2600 }), cell("M.Tech (Integrated) Computer Science and Engineering, Business Analytics", { width: 5600 })] }),
            new TableRow({ children: [cell("School", { header: true, width: 2600 }), cell("School of Computer Science and Engineering (SCOPE), VIT Chennai", { width: 5600 })] }),
            new TableRow({ children: [cell("Repository", { header: true, width: 2600 }), cell("github.com/karthiksteve/finsight", { width: 5600 })] }),
          ],
          [2600, 5600]
        ),
        new Paragraph({ text: "", spacing: { after: 300 } }),

        // ---------------- 1. Introduction ----------------
        h1("1. Introduction"),
        p("FinSight AI is a full-stack application that turns unstructured financial and legal documents into structured, queryable information. A user uploads a PDF, DOCX, or TXT file, and the backend runs it through named entity recognition, sentiment scoring, and clause extraction, then indexes the text so a retrieval-augmented chatbot can answer follow-up questions about it. The first review fixed the scope and the system design; this report covers what has actually been built since then, how each module works, and what still separates the current codebase from the hardened version described in the project's own planning documents."),
        p("The evaluation below is based on a direct read of the repository (329 tracked files across a FastAPI backend, a React/Vite frontend, and supporting scripts), not on the README's description of it. Where the implementation falls short of what is documented or planned, that gap is called out explicitly rather than glossed over, since a review panel is likely to probe exactly those points."),

        // ---------------- 2. Objectives ----------------
        h1("2. Objectives"),
        bullet("Extract financial entities (organizations, people, dates, monetary amounts, and domain-specific labels such as interest rate and payment term) from raw document text."),
        bullet("Score sentiment at the sentence level using a finance-tuned transformer model, and roll individual scores into a document-level summary."),
        bullet("Detect and classify contract clauses (payment, termination, confidentiality, liability, governing law, force majeure, renewal) and assign each a risk level."),
        bullet("Let a user ask natural-language questions about an uploaded document and get an answer grounded in its content, rather than a generic response."),
        bullet("Wrap all of this in an authenticated web application with export, reporting, and dashboard visualization."),

        // ---------------- 3. System Architecture ----------------
        h1("3. System Architecture"),
        p("The application follows a conventional client-server split. The React frontend talks to the FastAPI backend over a set of versioned REST routes; in development, Vite proxies /api and /outputs requests to the backend directly rather than the browser calling it cross-origin. Docker Compose provisions the backend, the frontend (built and served by nginx), a PostgreSQL instance, and an Azurite blob-storage emulator, so the full stack can be brought up with one command for a demo."),
        h2("3.1 Request flow"),
        p("Browser (React, port 5173) → Vite dev proxy → FastAPI + Uvicorn (port 8001) → PostgreSQL (port 5432) and Azurite (ports 10000–10002). Document uploads are written to a local uploads/ directory, processed in memory, and the derived artefacts (highlighted HTML, visualizations) are written to outputs/ and served as static files."),
        h2("3.2 Technology stack"),
        borderedTable(
          [
            new TableRow({ children: [cell("Layer", { header: true, width: 2200 }), cell("Technology", { header: true, width: 6000 })] }),
            new TableRow({ children: [cell("Frontend framework", { width: 2200 }), cell("React 18, Vite 5, React Router, Tailwind CSS", { width: 6000 })] }),
            new TableRow({ children: [cell("Frontend libraries", { width: 2200 }), cell("Clerk (auth), Recharts / Chart.js (charts), Framer Motion (animation), Radix UI, Lucide icons", { width: 6000 })] }),
            new TableRow({ children: [cell("Backend framework", { width: 2200 }), cell("FastAPI, Uvicorn, Pydantic / pydantic-settings", { width: 6000 })] }),
            new TableRow({ children: [cell("NLP / ML", { width: 2200 }), cell("spaCy (en_core_web_sm + custom EntityRuler), Hugging Face Transformers (FinBERT), NLTK", { width: 6000 })] }),
            new TableRow({ children: [cell("LLM providers", { width: 2200 }), cell("LM Studio (local, OpenAI-compatible), Groq (llama-3.1-8b-instant), optional Google Gemini", { width: 6000 })] }),
            new TableRow({ children: [cell("Storage (provisioned)", { width: 2200 }), cell("PostgreSQL, Azurite (Azure Blob emulator), Pinecone (optional vector DB)", { width: 6000 })] }),
            new TableRow({ children: [cell("Document processing", { width: 2200 }), cell("pypdf, python-docx, BeautifulSoup", { width: 6000 })] }),
            new TableRow({ children: [cell("Deployment", { width: 2200 }), cell("Docker Compose (postgres, azurite, backend, frontend/nginx)", { width: 6000 })] }),
          ],
          [2200, 6000]
        ),
        new Paragraph({ text: "", spacing: { after: 200 } }),

        // ---------------- 4. Module-Level Implementation ----------------
        h1("4. Module-Level Implementation"),

        h2("4.1 Document ingestion"),
        p("Handled by DoclingService in backend/services/docling_service.py. The class name references Docling, but the actual Docling import is commented out; extraction is done with pypdf for PDFs, python-docx for Word files, and a direct read for plain text. Files of an unsupported type return a placeholder string rather than failing, which keeps the pipeline from crashing on an unexpected upload but can silently mask a format that should have been rejected."),

        h2("4.2 Named entity recognition"),
        p("The NER service loads a custom spaCy pipeline from models/ner_model/model-best, falling back to the stock en_core_web_sm model if the custom one is missing, and attempting to auto-download that model if neither is present. The custom model itself is built by build_financial_ner.py, which does not train a statistical classifier: it reads the 96 labelled examples in annotations.json, extracts every distinct (label, phrase) pair, and loads them into a spaCy EntityRuler layered on top of en_core_web_sm, along with a handful of hand-written token patterns for things like interest rates and payment terms."),
        p("A separate script, ner_training.py, does implement a proper spaCy train loop from the same annotation file, but nothing in app.py or the routers calls it, so it is effectively unused at runtime. This distinction matters for the review: the entity recognizer in production will reliably catch the literal strings it was shown during ruler construction and text that matches its token patterns, but it has no learned generalization to a company name or person it has never seen, in the way a trained statistical model would."),
        p("The training data itself has some quality issues worth fixing before any retraining effort. Of 229 labelled entity spans across the 96 examples, 12 point at the wrong character offset entirely (for example, one MONEY span resolves to the text \"D 75,000.\" instead of a full amount), and a further 166 start or end mid-word rather than on a token boundary. Six of the 24 entity labels (COLLATERAL, TAXES, CONFIDENTIALITY, LEGAL_TERM, INTEREST_PAYMENT, CURRENCY) have exactly one training example each, so those categories are single memorized phrases rather than anything resembling a learned pattern."),

        h2("4.3 Sentiment analysis"),
        p("FinBERTService wraps ProsusAI/finbert through a Hugging Face transformers pipeline, running on GPU when available and CPU otherwise. Text is split into sentences with NLTK, each sentence is scored independently, and analyze_document_sentiment additionally produces an HTML rendering with each sentence background-colored by predicted label. Aggregate statistics (label distribution, per-label average confidence, overall sentiment) are computed in a small internal helper rather than left to the frontend, which keeps that logic in one place and testable."),

        h2("4.4 Clause extraction"),
        p("LangExtractService is the most carefully engineered piece of the backend. It tries three providers in order: a local LM Studio server (LLM_PROVIDER=lmstudio, defaulting to a Qwen3-8B model on port 1234), Groq's llama-3.1-8b-instant if configured, and, if neither responds, a fully local rule engine that matches sentences against eight clause-type keyword lists and pulls out timeframes, rates, and amounts with regular expressions. This is a sound design choice for a project that has to run in front of a review panel without guaranteed internet access or an API key: the rule-based path has no external dependency and, per verify_system.py, is what actually runs in the default configuration. Extracted clauses are rendered into a standalone highlighted HTML file for inspection."),

        h2("4.5 Retrieval-augmented chatbot (RAG)"),
        p("RAGService keeps an in-memory list of text chunks, each with a Google Gemini embedding if GOOGLE_API_KEY is set, or otherwise a deterministic 256-dimensional hashed n-gram vector computed with plain NumPy and no network call. Queries are answered by cosine similarity against that list, then handed to the same LM Studio → Groq fallback chain used by clause extraction; if both are unavailable, the service returns the top matching passages directly instead of a synthesized answer, labelled as \"Offline Mode\" in the response. Pinecone is wired in as an optional persistent vector store, but it is never used unless a Pinecone key is supplied, so by default every indexed document disappears when the backend process restarts."),

        h2("4.6 Export and reporting"),
        p("export_router.py produces JSON, CSV, and plain-text exports of a result set, plus a self-contained HTML report with inline CSS covering entity counts, sentiment distribution, and extracted clauses. Because it depends on nothing external, this is the most demo-safe deliverable in the project and the one most likely to hold up in a live review regardless of network conditions."),

        h2("4.7 Frontend application"),
        p("The React app implements a three-step upload wizard (choose files → select analyses → review and process), a tabbed results dashboard (NER, sentiment, clause extraction, each with its own component and Recharts visualizations, including a \"contract risk profile\" donut chart that buckets clause types into risk tiers by keyword match), and a floating chatbot widget backed by the RAG endpoints. Clerk gates the /upload and /results routes; unauthenticated visitors are redirected to the home page, with a five-second timeout that allows access anyway if Clerk itself fails to load, which is a reasonable degrade-open choice for a review demo but would need reconsidering before any real deployment."),

        // ---------------- 5. Testing ----------------
        h1("5. Testing Performed"),
        p("Two integration-style scripts exercise the running system rather than a conventional unit-test suite with per-function assertions."),
        bullet("test_pipeline.py drives the FastAPI TestClient through a health check, a full /process-document call against the bundled sample_data/test_document.txt, and a RAG query, printing entity counts, overall sentiment, and extracted clauses for manual inspection."),
        bullet("verify_system.py is a standalone diagnostic that checks that every required package imports, that the NER, FinBERT, and clause-extraction services can each run one example, and reports whether an LM Studio server is reachable on port 1234."),
        p("There is no pytest-based unit suite with individual assertions on service logic, and no frontend test runner is wired up (the earlier project plan mentions vitest, but no test files or vitest config exist in frontend/ at present). For a second review, demonstrating the two existing scripts running live is the most direct evidence of working functionality; a short written note on the absence of unit tests is better than letting the panel discover it unprompted."),

        // ---------------- 6. Progress since Review I ----------------
        h1("6. Progress Since the First Review"),
        p("The repository's Main/ directory preserves the snapshot submitted at the first review, which makes it possible to measure what changed rather than take the README's word for it. The comparison shows real but incremental progress: LM Studio support was added as a first-choice local LLM provider (the review-1 backend only called Groq), a formal service-interfaces layer (services/interfaces.py) and structured error classes (errors.py) were introduced, an Alembic migration for a five-table schema was added, and both services gained Dockerfiles. Clause-type metadata was extended with explicit risk levels used by the new risk-profile chart on the frontend."),
        p("In absolute terms, the backend service layer grew by roughly a thousand lines, concentrated almost entirely in langextract_service.py and rag_service.py. The frontend grew by only a handful of net lines across the entire src/ tree; most of the frontend work between reviews was copy changes on the Home and Chatbot pages rather than new functionality. This is worth stating plainly in the review: the backend saw the bulk of the engineering effort since review one, and the frontend is largely the same application with different marketing text."),

        // ---------------- 7. Limitations ----------------
        h1("7. Known Limitations and Gaps"),
        p("These are the points most likely to come up under questioning, listed in rough order of how much they matter for the system's stated goals."),
        bulletRuns([r("No backend authentication. ", { bold: true }), r("Clerk protects the two frontend routes, but every FastAPI endpoint, including document upload, RAG query, and export, accepts requests with no token check, and CORS is configured with allow_origins=[\"*\"]. The project's own planning document lists this as still-needed work, not a design decision.")]),
        bulletRuns([r("Database and blob storage are provisioned but not used. ", { bold: true }), r("docker-compose.yml starts PostgreSQL and Azurite, and config.py reads a DATABASE_URL, but no code path in the FastAPI app ever opens a database connection or writes to blob storage. All documents and RAG chunks live in a Python list in process memory and are lost on restart. The Alembic migration under backend/migrations/ creates five tables that nothing in the codebase currently reads from or writes to.")]),
        bulletRuns([r("The custom NER model is a rule list, not a trained classifier. ", { bold: true }), r("It will reliably match the literal phrases and token patterns it was built from, but has no way to generalize to an entity it has not seen, and six of its 24 labels rest on a single training example each (see Section 4.2).")]),
        bulletRuns([r("Annotation quality issues in the training data. ", { bold: true }), r("12 of 229 labelled spans in annotations.json point at the wrong character offset, and 166 more start or end mid-word. These should be corrected before any attempt at a proper statistical retrain, since they would otherwise teach the model incorrect entity boundaries.")]),
        bulletRuns([r("Hardcoded marketing statistics on the About page. ", { bold: true }), r("The figures 99.5% accuracy, 50K+ documents processed, and 1M+ entities extracted are static strings in About.jsx and do not correspond to any measurement taken by the system. Worth removing, or replacing with real pipeline metrics, before a review panel asks where they came from.")]),
        bulletRuns([r("Development secrets left in place. ", { bold: true }), r("config.py defaults JWT_SECRET_KEY to the literal string \"dev-secret-key-change-in-production\"; it is currently unused since no route issues or verifies a JWT, but it should not ship as a default once authentication is added.")]),
        bulletRuns([r("Inconsistent API base URL usage in the frontend. ", { bold: true }), r("services/api.js correctly reads VITE_API_BASE_URL with a localhost fallback, but SentimentAnalysis.jsx, NERAnalysis.jsx's iframe, and ChatbotWindow.jsx hardcode http://localhost:8001 directly, so pointing the frontend at a different backend host would leave those views broken even though the main API calls would work.")]),
        bulletRuns([r("Minor duplication and dead code. ", { bold: true }), r("The /pipeline-status route is defined twice in pipeline_router.py (FastAPI silently uses the second definition), and package.json carries axios, react-icons, most @radix-ui packages, and class-variance-authority with zero imports anywhere in src/.")]),

        // ---------------- 8. Conclusion ----------------
        h1("8. Conclusion and Next Steps"),
        p("The core pipeline, extraction, sentiment, clause detection, and retrieval-based question answering, works end to end, and the three-tier LLM fallback (local LM Studio, then Groq, then a fully offline rule engine or embedding) is a genuinely good decision for a system that needs to keep working without a guaranteed network connection or a paid API key during a review demo. The gap between what exists now and the \"hardened, production-shaped\" system described in the project's own plan is concentrated in two places: persistence (the database and blob storage are set up in Docker but never touched by the application) and access control (the API has none, despite the frontend enforcing it)."),
        p("For the next iteration, three items would move the project furthest: wiring the existing PostgreSQL schema into the document and job endpoints so results survive a restart, adding token verification to the FastAPI routes to match what the frontend already assumes, and correcting the span errors in the NER training data before attempting a proper statistical retrain in place of the current rule-based entity ruler. None of these are large in scope individually, and all three are already scaffolded in the codebase, which makes them realistic targets for the time remaining before the final review."),
      ],
    },
  ],
});

const outputPath = path.join(__dirname, "FinSight_Review2_Report.docx");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outputPath, buf);
  console.log("Successfully written to:", outputPath);
}).catch((err) => {
  console.error("Error creating docx:", err);
  process.exit(1);
});
