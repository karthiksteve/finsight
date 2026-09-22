const path = require("path");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, ImageRun, TableOfContents,
  PageBreak, LevelFormat, convertInchesToTwip, VerticalAlign,
} = require("docx");

// ---------- helpers ----------

const COLORS = {
  heading: "1C2B39",
  accent: "33475B",
  ruleGrey: "B7C0C8",
  tableHeaderBg: "DDE6EE",
  tableAltBg: "F4F6F8",
};

function h1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160 },
  });
}
function h2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
  });
}
function h3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, italics: opts.italics || false })],
    spacing: { after: 160, line: 276 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}
function pRuns(runs, opts = {}) {
  return new Paragraph({ children: runs, spacing: { after: 160, line: 276 } });
}
function bullet(text, level = 0) {
  return new Paragraph({
    text,
    bullet: { level },
    spacing: { after: 100, line: 276 },
  });
}
function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold || false, size: opts.size || 20 })],
        spacing: { after: 0 },
      }),
    ],
  });
}
function dataTable(headerCells, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((t, i) =>
      cell(t, { width: colWidths[i], bold: true, shade: COLORS.tableHeaderBg })
    ),
  });
  const bodyRows = rows.map(
    (r, idx) =>
      new TableRow({
        children: r.map((t, i) =>
          cell(t, { width: colWidths[i], shade: idx % 2 === 1 ? COLORS.tableAltBg : undefined })
        ),
      })
  );
  return new Table({
    width: { size: colWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...bodyRows],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.ruleGrey },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.ruleGrey },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.ruleGrey },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.ruleGrey },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: COLORS.ruleGrey },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: COLORS.ruleGrey },
    },
  });
}
function spacer(h = 160) {
  return new Paragraph({ text: "", spacing: { after: h } });
}
function hr() {
  return new Paragraph({
    border: { bottom: { color: COLORS.ruleGrey, space: 1, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { after: 200 },
  });
}

// ---------- image ----------
const diagramPath = path.join(__dirname, "architecture_diagram.png");
if (!fs.existsSync(diagramPath)) {
  console.error("Missing architecture diagram at:", diagramPath);
  process.exit(1);
}
const diagramBuffer = fs.readFileSync(diagramPath);

// ---------- document body ----------

const children = [];

// Title page
children.push(
  new Paragraph({
    children: [new TextRun({ text: "FinSight AI", bold: true, size: 56, color: COLORS.heading })],
    spacing: { before: 1400, after: 120 },
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "A Financial Document Intelligence Platform", italics: true, size: 28, color: COLORS.accent })],
    spacing: { after: 80 },
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: "Second Implementation Review — Technical Documentation and Implementation Architecture", size: 24 })],
    spacing: { after: 600 },
    alignment: AlignmentType.CENTER,
  })
);

const infoRows = [
  ["Prepared by", "Karthikeyan A (Steve)"],
  ["Programme", "M.Tech (Integrated) Computer Science and Engineering, Business Analytics"],
  ["School", "School of Computer Science and Engineering (SCOPE), VIT Chennai"],
  ["Repository", "github.com/karthiksteve/finsight"],
  ["Sources consolidated", "FinSight AI README, Project Review II Implementation Report, Second Implementation Review"],
];
children.push(dataTable(["Field", "Detail"], infoRows, [2400, 6900]));
children.push(spacer(400));
children.push(new Paragraph({ children: [new PageBreak()] }));

// 1. Purpose and scope
children.push(h1("1. Purpose and scope"));
children.push(p(
  "This document brings together the two deliverables produced for FinSight AI's second review — the implementation report and the accompanying technical review — into a single reference, and adds a dedicated implementation architecture section built from the project's own README and repository structure."
));
children.push(p(
  "It records what has been built, how the parts connect, what has been verified by running the project's own test scripts, and where the system still falls short of the hardened, production-shaped version described in the project's planning documents. The assessment is based on a direct read of the repository — 329 tracked files across a FastAPI backend, a React/Vite frontend, and supporting scripts — rather than on the README's description of it. Where the implementation falls short of what is documented or planned, that gap is stated directly rather than smoothed over, since a review panel is likely to probe exactly those points."
));

// 2. Project overview
children.push(h1("2. Project overview"));
children.push(p(
  "FinSight AI is a full-stack application that turns unstructured financial and legal documents into structured, queryable information. A user uploads a PDF, DOCX, or TXT file. The backend extracts the text and runs it through named entity recognition, sentence-level sentiment scoring, and clause extraction, then indexes the content so a retrieval-augmented chatbot can answer follow-up questions about it. Results can be exported as JSON, CSV, plain text, or a formatted HTML report, and the Upload and Results pages sit behind Clerk authentication."
));
children.push(p(
  "The first review fixed the project's scope and system design. This report covers the second stage: what has actually been implemented, how each module works, and what separates the current codebase from a production-ready system."
));
children.push(h2("2.1 Objectives"));
[
  "Extract financial entities — organisations, people, dates, monetary amounts, and domain-specific labels such as interest rate and payment term — from raw document text.",
  "Score sentiment at the sentence level using a finance-tuned transformer model, and roll individual scores into a document-level summary.",
  "Detect and classify contract clauses (payment, termination, confidentiality, liability, governing law, force majeure, renewal) and assign each a risk level.",
  "Let a user ask natural-language questions about an uploaded document and get an answer grounded in its content rather than a generic response.",
  "Wrap all of this in an authenticated web application with export, reporting, and dashboard visualisation.",
].forEach((t) => children.push(bullet(t)));

// 3. Implementation architecture
children.push(h1("3. Implementation architecture"));
children.push(p(
  "The application follows a conventional client-server split, arranged as a three-tier system with two supporting services for local development. The React frontend talks to the FastAPI backend over a set of versioned REST routes; in development, Vite proxies /api and /outputs requests directly to the backend so the browser never has to make a cross-origin call. Docker Compose can provision the backend, the frontend (built and served by nginx), a PostgreSQL instance, and an Azurite blob-storage emulator together, so the full stack comes up with one command for a demo."
));

children.push(h2("3.1 System diagram"));
children.push(
  new Paragraph({
    children: [
      new ImageRun({
        data: diagramBuffer,
        transformation: { width: 590, height: 425 },
        type: "png",
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  })
);
children.push(p(
  "Solid arrows mark the calls the pipeline router makes into each analysis service on every request. Dashed arrows mark optional, configuration-dependent calls out to a local or cloud model provider and to Pinecone. PostgreSQL and Azurite are shown because Docker Compose provisions them, not because the application code currently writes to either (Section 9 covers this gap).",
  { italics: false }
));

children.push(h2("3.2 Request flow"));
children.push(p("The main document-processing route is POST /api/v1/pipeline/process-document. A single request moves through the system as follows:"));
[
  "The frontend sends the selected file and the chosen analysis options (NER, sentiment, clause extraction — all on by default) as multipart form data.",
  "The backend checks that the file is present, non-empty, within the 50 MB size limit, and has an allowed extension (.pdf, .txt, .html, .docx, .doc).",
  "The file is written to temporary upload storage under a generated filename.",
  "The document service extracts raw text — and, where available, HTML — using pypdf, python-docx, or a direct UTF-8 read.",
  "Each enabled analysis service processes the extracted text: ner_service.py for entities, finbert_service.py for sentiment, langextract_service.py for clauses.",
  "The extracted text is added to the in-memory RAG knowledge base so it can be queried afterwards.",
  "A structured JSON response — file metadata, per-service results, pipeline status, and a summary — is returned to the frontend, which renders it on the Results page.",
  "The temporary uploaded file is deleted as a cleanup step.",
].forEach((t) => children.push(bullet(t)));
children.push(p(
  "From there, a user can separately upload the document to the RAG index and ask questions about it on the Chatbot page, or export the results as JSON, CSV, text, or an HTML report through export_router.py. One unavailable service does not block the others: each analysis failure is represented in the response rather than aborting the whole request."
));

children.push(h2("3.3 Technology stack"));
const stackRows = [
  ["Frontend framework", "React 18, Vite 5, React Router, Tailwind CSS"],
  ["Frontend libraries", "Clerk (auth), Recharts / Chart.js (charts), Framer Motion (animation), Radix UI, Lucide icons"],
  ["Backend framework", "FastAPI, Uvicorn, Pydantic / pydantic-settings"],
  ["NLP / ML", "spaCy (en_core_web_sm + a custom EntityRuler), Hugging Face Transformers (FinBERT), NLTK"],
  ["LLM providers", "LM Studio (local, OpenAI-compatible), Groq (llama-3.1-8b-instant), optional Google Gemini"],
  ["Storage (provisioned)", "PostgreSQL, Azurite (Azure Blob emulator), Pinecone (optional vector database)"],
  ["Document processing", "pypdf, python-docx, BeautifulSoup"],
  ["Deployment", "Docker Compose (postgres, azurite, backend, frontend/nginx)"],
];
children.push(dataTable(["Layer", "Technology"], stackRows, [2600, 6700]));
children.push(spacer(120));
children.push(p(
  "FastAPI defines the backend's routes and what runs when each is called, and it generates the interactive /docs and /redoc pages automatically. Uvicorn is the process that keeps the server listening; FastAPI is the blueprint, Uvicorn is the engine that runs it. Vite plays the equivalent role on the frontend during development — it serves the app locally with fast reloads and bundles it for production with npm run build. Azurite exists solely so the storage code can be developed and tested without a real Azure account; PostgreSQL is the structured store the project intends to use for processed-document records, addressed further in Section 9."
));

// 4. Backend implementation by module
children.push(h1("4. Backend implementation, by module"));

children.push(h2("4.1 Document ingestion"));
children.push(p(
  "Document handling is implemented in DoclingService (backend/services/docling_service.py). The class name references Docling, the general-purpose document reader named in the project plan, but the actual Docling import is commented out. Extraction is done instead with pypdf for PDFs, python-docx for Word files, and a direct read for plain text. An unsupported file type returns a placeholder string rather than failing outright, which keeps the pipeline from crashing on an unexpected upload but can also mask a format that should have been rejected. The service records metadata such as file extension, size, page count where available, and which extraction method ran."
));

children.push(h2("4.2 Named entity recognition"));
children.push(p(
  "The NER service loads a custom spaCy pipeline from models/ner_model/model-best, falls back to the stock en_core_web_sm model if the custom one is missing, and attempts to auto-download that model if neither is present. The custom model is built by build_financial_ner.py, which does not train a statistical classifier: it reads the 96 labelled examples in annotations.json, extracts every distinct label-and-phrase pair, and loads them into a spaCy EntityRuler layered on top of en_core_web_sm, along with a handful of hand-written token patterns for things like interest rates and payment terms."
));
children.push(p(
  "A separate script, ner_training.py, does implement a proper spaCy training loop over the same annotation file, but nothing in app.py or the routers calls it, so it is effectively unused at runtime. The distinction matters: the entity recognizer that actually runs in production will reliably catch the literal strings it was shown during ruler construction and text matching its token patterns, but it has no learned generalisation to a company name or person it has never seen, unlike a trained statistical model."
));
children.push(p(
  "The training data has quality issues worth fixing before any retraining effort. Of 229 labelled entity spans across the 96 examples, 12 point at the wrong character offset entirely — one MONEY span, for example, resolves to the text \u201cD 75,000.\u201d instead of a full amount — and a further 166 start or end mid-word rather than on a token boundary. Six of the 24 entity labels (COLLATERAL, TAXES, CONFIDENTIALITY, LEGAL_TERM, INTEREST_PAYMENT, CURRENCY) have exactly one training example each, so those categories are single memorised phrases rather than anything resembling a learned pattern."
));

children.push(h2("4.3 Sentiment analysis"));
children.push(p(
  "FinBERTService wraps ProsusAI/finbert through a Hugging Face Transformers pipeline, running on GPU when one is available and on CPU otherwise. Text is split into sentences with NLTK, each sentence is scored independently, and analyze_document_sentiment additionally produces an HTML rendering with each sentence background-coloured by its predicted label. Aggregate statistics — label distribution, per-label average confidence, overall sentiment — are computed in one internal helper rather than left to the frontend, which keeps that logic in a single, testable place."
));

children.push(h2("4.4 Clause extraction"));
children.push(p(
  "LangExtractService is the most carefully engineered part of the backend. It tries three providers in order: a local LM Studio server (LLM_PROVIDER=lmstudio, defaulting to a Qwen3-8B model on port 1234), Groq's llama-3.1-8b-instant if configured, and, if neither responds, a fully local rule engine that matches sentences against eight clause-type keyword lists and pulls out timeframes, rates, and amounts with regular expressions. This is a sound design choice for a system that has to run in front of a review panel without guaranteed internet access or an API key — per verify_system.py, the rule-based path is what actually runs in the default configuration, and it has no external dependency. Extracted clauses are also rendered into a standalone highlighted HTML file for inspection."
));

children.push(h2("4.5 Retrieval-augmented generation (RAG)"));
children.push(p(
  "RAGService keeps an in-memory list of text chunks, each with a Google Gemini embedding if GOOGLE_API_KEY is set, or otherwise a deterministic 256-dimensional hashed n-gram vector computed with plain NumPy and no network call. Queries are answered by cosine similarity against that list, then handed to the same LM Studio → Groq fallback chain used by clause extraction; if both are unavailable, the service returns the top matching passages directly instead of a synthesised answer, labelled \u201cOffline Mode\u201d in the response. Pinecone is wired in as an optional persistent vector store, but it is never used unless a Pinecone key is supplied, so by default every indexed document disappears when the backend process restarts."
));

children.push(h2("4.6 Export and reporting"));
children.push(p(
  "export_router.py produces JSON, CSV, and plain-text exports of a result set, plus a self-contained HTML report with inline CSS covering entity counts, sentiment distribution, and extracted clauses. Because it depends on nothing external, this is the most demo-safe deliverable in the project and the one most likely to work regardless of network conditions during a live review."
));

// 5. Frontend implementation
children.push(h1("5. Frontend implementation"));
children.push(p(
  "The frontend is a genuine React application rather than a static presentation layer. It is a single-page app with five routes, defined in frontend/src/App.jsx:"
));
const routeRows = [
  ["/", "Home.jsx", "Public", "Landing page introducing the product"],
  ["/upload", "Upload.jsx", "Protected (sign-in required)", "Choose a file and which analyses to run; starts the pipeline"],
  ["/results", "Results.jsx", "Protected", "Displays the returned analysis: entities, sentiment, clauses, charts"],
  ["/about", "About.jsx", "Public", "Information about the project"],
  ["/chatbot", "Chatbot.jsx", "Public", "Chat interface for asking questions about an indexed document"],
];
children.push(dataTable(["Route", "Component", "Access", "Purpose"], routeRows, [1300, 1700, 2500, 3800]));
children.push(spacer(120));
children.push(p(
  "Protected routes are wrapped in ProtectedRoute, which uses Clerk's SignedIn/SignedOut state to redirect unauthenticated visitors, with a five-second timeout that allows access anyway if Clerk itself fails to load. That degrade-open behaviour is a reasonable choice for a review demo but would need reconsidering before any real deployment."
));
children.push(p(
  "The application implements a three-step upload wizard (choose a file, select analyses, review and process), a tabbed results dashboard (NER, sentiment, and clause extraction, each with its own component and Recharts visualisations, including a contract risk profile donut chart that buckets clause types into risk tiers by keyword match), and a floating chatbot widget backed by the RAG endpoints. All backend calls are made from a single file, src/services/api.js, which exposes functions such as processDocument(), analyzeSentiment(), extractClauses(), uploadRAGDocument(), queryRAG(), exportResults(), generateReport(), checkHealth(), and getPipelineStatus() — each a thin wrapper around a fetch() call to the matching endpoint. The production build (npm run build) completes successfully, though it reports a large JavaScript chunk of roughly 848 kB before gzip and an import-splitting warning; these are build observations, not evidence that the frontend fails."
));
children.push(p(
  "One inconsistency worth noting: services/api.js correctly reads VITE_API_BASE_URL with a localhost fallback, but SentimentAnalysis.jsx, the iframe inside NERAnalysis.jsx, and ChatbotWindow.jsx hardcode http://localhost:8001 directly. Pointing the frontend at a different backend host would leave those views broken even though the main API calls would keep working."
));

// 6. Verification and testing
children.push(h1("6. Verification and testing"));
children.push(p(
  "Two integration-style scripts exercise the running system rather than a conventional unit-test suite with per-function assertions. test_pipeline.py drives the FastAPI TestClient through a health check, a full /process-document call against the bundled sample_data/test_document.txt, and a RAG query, printing entity counts, overall sentiment, and extracted clauses for inspection. verify_system.py is a standalone diagnostic that checks that every required package imports, that the NER, FinBERT, and clause-extraction services can each run one example, and reports whether an LM Studio server is reachable on port 1234."
));
const verifyRows = [
  ["python -m pytest -q", "Passed: 1 test", "The included automated pipeline test completes successfully. Three deprecation warnings remain."],
  ["python test_pipeline.py", "Passed", "The sample document passed through upload, extraction, custom NER, FinBERT, clause extraction, RAG indexing, and the RAG query fallback."],
  ["npm run build (frontend/)", "Passed", "The React/Vite frontend compiles into a production bundle."],
  ["Repository inspection", "Completed", "Backend, frontend, services, configuration, Docker files, tests, documentation, and the legacy snapshot were reviewed directly."],
];
children.push(dataTable(["Check", "Result", "What it confirms"], verifyRows, [2400, 1700, 5200]));
children.push(spacer(120));
children.push(p(
  "During the end-to-end run, the system returned 14 NER entities, sentence-level FinBERT results, three extracted clauses, and a successful offline RAG response for the sample document. These results confirm that the principal components are connected and executable; they do not, by themselves, establish domain accuracy or production readiness. There is no pytest-based unit suite with individual assertions on service logic, and no frontend test runner is wired up — the earlier project plan mentions vitest, but no test files or vitest configuration exist in frontend/ at present. For the second review, running the two existing scripts live is the most direct evidence of working functionality; stating the absence of unit tests plainly is better than letting a panel discover it unprompted."
));

// 7. Progress since first review
children.push(h1("7. Progress since the first review"));
children.push(p(
  "The repository's Main/ directory preserves the snapshot submitted at the first review, which makes it possible to measure what changed rather than take the README's word for it. The comparison shows real but incremental progress: LM Studio support was added as a first-choice local LLM provider (the review-one backend only called Groq), a formal service-interfaces layer (services/interfaces.py) and structured error classes (errors.py) were introduced, an Alembic migration for a five-table schema was added, and both services gained Dockerfiles. Clause-type metadata was extended with explicit risk levels, used by the new risk-profile chart on the frontend."
));
children.push(p(
  "In absolute terms, the backend service layer grew by roughly a thousand lines, concentrated almost entirely in langextract_service.py and rag_service.py. The frontend grew by only a handful of net lines across the entire src/ tree; most of the frontend work between reviews was copy changes on the Home and Chatbot pages rather than new functionality. The backend saw the bulk of the engineering effort since review one, and the frontend is largely the same application with different marketing text."
));

// 8. Known limitations and gaps
children.push(h1("8. Known limitations and gaps"));
children.push(p("These are listed in roughly the order they matter for the system's stated goals, and for how likely they are to come up under questioning."));

children.push(h3("No backend authentication"));
children.push(p("Clerk protects the two frontend routes, but every FastAPI endpoint — including document upload, RAG query, and export — accepts requests with no token check, and CORS is configured with allow_origins=[\"*\"]. The project's own planning document lists this as still-needed work, not a design decision."));

children.push(h3("Database and blob storage are provisioned but not used"));
children.push(p("docker-compose.yml starts PostgreSQL and Azurite, and config.py reads a DATABASE_URL, but no code path in the FastAPI app ever opens a database connection or writes to blob storage. All documents and RAG chunks live in a Python list in process memory and are lost on restart. The Alembic migration under backend/migrations/ creates five tables that nothing in the codebase currently reads from or writes to."));

children.push(h3("The custom NER model is a rule list, not a trained classifier"));
children.push(p("It reliably matches the literal phrases and token patterns it was built from but has no way to generalise to an entity it has not seen, and six of its 24 labels rest on a single training example each (Section 4.2)."));

children.push(h3("Annotation quality issues in the training data"));
children.push(p("12 of 229 labelled spans in annotations.json point at the wrong character offset, and 166 more start or end mid-word. These should be corrected before any attempt at a proper statistical retrain, since they would otherwise teach the model incorrect entity boundaries."));

children.push(h3("No formal NLP evaluation"));
children.push(p("The repository does not include an independent labelled benchmark with precision, recall, F1, or confusion-matrix results, so no accuracy figure for entity extraction, sentiment, or clause detection has been measured against ground truth."));

children.push(h3("Security hardening is minimal"));
children.push(p("CORS is permissive, uploads and outputs are mounted as static paths, and request-controlled model or provider parameters need a stronger server-side trust boundary. config.py also defaults JWT_SECRET_KEY to the literal string \"dev-secret-key-change-in-production\"; it is currently unused since no route issues or verifies a JWT, but it should not ship as a default once authentication is added."));

children.push(h3("Hardcoded marketing statistics on the About page"));
children.push(p("The figures 99.5% accuracy, 50K+ documents processed, and 1M+ entities extracted are static strings in About.jsx and do not correspond to any measurement taken by the system. These should be removed, or replaced with real pipeline metrics, before a review panel asks where they came from."));

children.push(h3("Persistent, multi-user RAG is not yet in place"));
children.push(p("The offline RAG fallback is process-local, so indexed data disappears on restart, and it is not yet a tenant-isolated store suitable for concurrent, multi-user use."));

children.push(h3("Broad automated coverage is missing"));
children.push(p("The current test surface does not comprehensively cover malformed files, oversized inputs, authorization, concurrency, provider failure, export escaping, or cross-user isolation."));

children.push(h3("Documentation alignment and legacy duplication"));
children.push(p("Some older API documentation (backend/API_DOCUMENTATION.md) describes routes that are not registered in the active application, including the commented-out Docling router. The Main/ directory duplicates much of the project and can create confusion about which implementation is current. Separately, the /pipeline-status route is defined twice in pipeline_router.py (FastAPI silently uses the second definition), and package.json still lists axios, react-icons, most @radix-ui packages, and class-variance-authority with zero imports anywhere in src/."));

// 9. Conclusion
children.push(h1("9. Conclusion and next steps"));
children.push(p(
  "The core pipeline — extraction, sentiment, clause detection, and retrieval-based question answering — works end to end, and the three-tier LLM fallback (local LM Studio, then Groq, then a fully offline rule engine or embedding) is a genuinely good decision for a system that needs to keep working without a guaranteed network connection or a paid API key during a review demo. The gap between what exists now and the hardened, production-shaped system described in the project's own plan is concentrated in two places: persistence, since the database and blob storage are set up in Docker but never touched by the application, and access control, since the API has none despite the frontend enforcing it."
));
children.push(p(
  "The appropriate technical description for the current state is an integrated financial-document analysis prototype with a working offline demonstration path. It should not yet be described as a production-secure platform or as a scientifically evaluated NLP system."
));
children.push(p(
  "For the next iteration, three items would move the project furthest: wiring the existing PostgreSQL schema into the document and job endpoints so results survive a restart, adding token verification to the FastAPI routes to match what the frontend already assumes, and correcting the span errors in the NER training data before attempting a proper statistical retrain in place of the current rule-based entity ruler. None of these are large in scope individually, and all three are already scaffolded in the codebase, which makes them realistic targets for the time remaining before the final review."
));

// 10. Glossary
children.push(h1("10. Glossary"));
const glossary = [
  ["NER", "Named Entity Recognition. An NLP technique that scans text and labels words or phrases as belonging to categories such as person, organisation, money, or date."],
  ["FinBERT", "A version of the BERT language model further trained on financial text, so it judges sentiment in financial writing more accurately than a general-purpose model."],
  ["RAG", "Retrieval-Augmented Generation. Instead of answering purely from what a model memorised in training, the system first retrieves the most relevant chunks of a specific document and feeds those to the model as context, so the answer is grounded in the actual document."],
  ["Embedding", "A numeric vector representation of a piece of text that captures its meaning, letting software measure how similar two pieces of text are."],
  ["Vector store", "A database optimised for storing embeddings and quickly finding the most similar ones to a given query. Pinecone is a hosted example; this project also supports a simple in-memory version for local use."],
  ["EntityRuler", "A spaCy component that matches text against a fixed list of phrases and patterns, as opposed to a statistical model that generalises to unseen examples."],
  ["Azurite", "A local, offline emulator that behaves like Azure's real cloud storage service, so storage-related code can be tested without an Azure account."],
  ["Clerk", "A third-party authentication service that this project integrates with on the frontend to protect the Upload and Results pages."],
];
children.push(dataTable(["Term", "Meaning"], glossary, [1800, 7500]));

// ---------- assemble ----------
const doc = new Document({
  creator: "FinSight AI project documentation",
  title: "FinSight AI — Second Implementation Review: Technical Documentation and Implementation Architecture",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 22, color: "222222" },
        paragraph: { spacing: { line: 276 } },
      },
    },
    paragraphStyles: [
      {
        id: "Heading1",
        name: "Heading 1",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 32, bold: true, color: COLORS.heading, font: "Calibri" },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 0 },
      },
      {
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 26, bold: true, color: COLORS.accent, font: "Calibri" },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 },
      },
      {
        id: "Heading3",
        name: "Heading 3",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { size: 23, bold: true, italics: true, color: COLORS.accent, font: "Calibri" },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1080, bottom: 1080, left: 1200, right: 1200 },
        },
      },
      children,
    },
  ],
});

const outputPath = path.join(__dirname, "FinSight_AI_Technical_Documentation.docx");

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(outputPath, buf);
  console.log("Successfully written to:", outputPath);
}).catch((err) => {
  console.error("Error creating docx:", err);
  process.exit(1);
});
