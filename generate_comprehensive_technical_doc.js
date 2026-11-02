const path = require("path");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, ImageRun, PageBreak,
  Header, Footer, PageNumber, NumberFormat
} = require("docx");

// ============================================================================
// STYLING AND COLOR PALETTE
// ============================================================================
const COLORS = {
  primary: "1A365D",       // Deep Executive Navy
  secondary: "2B6CB0",     // Slate Blue Accent
  darkNeutral: "2D3748",   // Charcoal Body Text
  mutedGrey: "718096",     // Caption / Subtitle Grey
  lightBg: "F7FAFC",       // Off-white Background
  codeBg: "EDF2F7",        // Terminal Code Background
  tableHeaderBg: "E2E8F0", // Slate Table Header
  tableAltBg: "F8FAFC",    // Alternating Row Background
  border: "CBD5E0",        // Border Grey
  accentGreen: "2F855A",   // Forest Green
  accentTeal: "0D9488",    // Teal Accent
  calloutBg: "EBF8FF",     // Soft Blue Callout
  calloutBorder: "3182CE"  // Blue Border
};

// ============================================================================
// FORMATTING HELPER FUNCTIONS
// ============================================================================
function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, color: COLORS.primary, font: "Calibri" })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 420, after: 180 },
  });
}

function h2(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: COLORS.secondary, font: "Calibri" })],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 140 },
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, italics: true, size: 21, color: COLORS.darkNeutral, font: "Calibri" })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 100 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 21, color: opts.color || COLORS.darkNeutral, italics: opts.italics || false, bold: opts.bold || false, font: "Calibri" })],
    spacing: { after: 140, line: 276 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function pRuns(runs, opts = {}) {
  return new Paragraph({
    children: runs.map(r => new TextRun({ size: 21, font: "Calibri", color: COLORS.darkNeutral, ...r })),
    spacing: { after: 140, line: 276 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function bullet(text, level = 0, boldPrefix = "") {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + " ", bold: true, size: 21, color: COLORS.primary, font: "Calibri" }));
  }
  children.push(new TextRun({ text, size: 21, color: COLORS.darkNeutral, font: "Calibri" }));
  return new Paragraph({
    children,
    bullet: { level },
    spacing: { after: 90, line: 260 },
  });
}

function codeBlock(codeLines) {
  const tableRows = codeLines.map(line =>
    new TableRow({
      children: [
        new TableCell({
          width: { size: 9600, type: WidthType.DXA },
          shading: { type: ShadingType.CLEAR, fill: COLORS.codeBg },
          margins: { top: 60, bottom: 60, left: 160, right: 160 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: "Consolas",
                  size: 19,
                  color: "1A202C",
                }),
              ],
              spacing: { after: 0, line: 240 },
            }),
          ],
        }),
      ],
    })
  );

  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    rows: tableRows,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 12, color: COLORS.secondary },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
  });
}

function callout(title, body) {
  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 9600, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: COLORS.calloutBg },
            margins: { top: 120, bottom: 120, left: 180, right: 180 },
            children: [
              new Paragraph({
                children: [new TextRun({ text: title, bold: true, size: 21, color: COLORS.primary, font: "Calibri" })],
                spacing: { after: 60 },
              }),
              new Paragraph({
                children: [new TextRun({ text: body, size: 20, color: COLORS.darkNeutral, font: "Calibri" })],
                spacing: { after: 0, line: 260 },
              }),
            ],
          }),
        ],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 16, color: COLORS.calloutBorder },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
    },
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: opts.bold || false, size: opts.size || 19, color: opts.color || COLORS.darkNeutral, font: "Calibri" })],
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { after: 0, line: 240 },
      }),
    ],
  });
}

function dataTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((t, i) =>
      cell(t, { width: colWidths[i], bold: true, shade: COLORS.tableHeaderBg, color: COLORS.primary })
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
      top: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      left: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      right: { style: BorderStyle.SINGLE, size: 4, color: COLORS.border },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: COLORS.border },
    },
  });
}

function addImage(imagePath, caption, width = 580, height = 330) {
  if (!fs.existsSync(imagePath)) {
    console.warn("Image not found at path:", imagePath);
    return [p(`[Figure Placeholder: ${caption}]`, { italics: true })];
  }
  const imgBuffer = fs.readFileSync(imagePath);
  return [
    new Paragraph({
      children: [
        new ImageRun({
          data: imgBuffer,
          transformation: { width, height },
          type: "png",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 180, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: caption, bold: true, italics: true, size: 19, color: COLORS.secondary, font: "Calibri" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  ];
}

// File paths
const baseDir = __dirname;
const screenshotsDir = path.join(baseDir, "screenshots");
const diagramPath = path.join(baseDir, "architecture_diagram.png");

const children = [];

// ============================================================================
// 1. COVER PAGE & METADATA
// ============================================================================
children.push(
  new Paragraph({
    children: [new TextRun({ text: "FINSIGHT AI", bold: true, size: 48, color: COLORS.primary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 800, after: 120 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "Intelligent Financial & Legal Document Intelligence Engine", italics: true, size: 26, color: COLORS.secondary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "Comprehensive Step-by-Step Technical Documentation, System Architecture Specification & Operational Runbook", bold: true, size: 22, color: COLORS.darkNeutral, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 600 }
  })
);

const docMetadataRows = [
  ["Platform Name", "FinSight AI (Financial & Legal Document Intelligence)"],
  ["Document Version", "v2.0 — Final Optimized Production Release"],
  ["Target Audience", "Systems Architects, Full-Stack Engineers, ML Practitioners, Security Reviewers"],
  ["Primary Repository", "github.com/karthiksteve/finsight (Branch: main)"],
  ["Core Technologies", "FastAPI (Python 3.10+), React 18 / Vite 5, spaCy 3.8, HuggingFace FinBERT, PyTorch, NLTK"],
  ["Documentation Scope", "System Architecture, Step-by-Step Installation, Step-by-Step Terminal Execution, User Workflow Walkthrough, REST API Contracts, Performance Optimizations, Troubleshooting"],
];
children.push(dataTable(["Specification Field", "Details"], docMetadataRows, [2800, 6800]));
children.push(new Paragraph({ text: "", spacing: { after: 400 } }));
children.push(
  callout(
    "Architecture Highlight & Deployment Readiness",
    "FinSight AI delivers an integrated four-stage NLP pipeline featuring custom financial entity extraction, sentence-level FinBERT sentiment scoring, multi-tier contract clause risk evaluation, and an offline-resilient RAG conversational assistant. The platform requires zero cloud dependencies for local execution, featuring automatic fallback cascades from local LLMs to deterministic rule matchers."
  )
);
children.push(new Paragraph({ children: [new PageBreak()] }));

// ============================================================================
// 2. EXECUTIVE SUMMARY & PLATFORM OVERVIEW
// ============================================================================
children.push(
  h1("1. Executive Summary & Platform Overview"),
  p(
    "In corporate finance, private equity, investment banking, and legal compliance, analysts manually pore through hundreds of pages of unstructured documents — including SEC 10-K/10-Q filings, commercial credit agreements, earnings call transcripts, and corporate disclosures. These documents contain mission-critical quantitative covenants, numeric metrics, and legal liability terms embedded within dense, idiosyncratic prose. Generic Natural Language Processing (NLP) models and off-the-shelf generative Large Language Models (LLMs) frequently fail in this domain due to compound financial notations, subtle accounting terminology, and fatal numeric hallucinations (e.g. altering dollar figures or percentage thresholds)."
  ),
  p(
    "FinSight AI is a full-stack, domain-adapted financial document intelligence platform engineered specifically to solve this challenge. It transforms unstructured financial filings into auditable, structured data through an asynchronous, high-throughput processing pipeline. Users upload documents in PDF, Microsoft Word (DOCX), plain text (TXT), or HTML format, and receive an instant, multi-faceted analytical breakdown across four specialized dimensions:"
  ),
  bullet("Domain-Specific Financial Named Entity Recognition (NER): Tags organizations, monetary quantities, percentage yields, payment schedules, dates, and key legal terms with high token-level precision.", 0, "1."),
  bullet("Contextual Financial Sentiment Analysis: Employs a fine-tuned ProsusAI/finbert transformer model to score sentiment sentence-by-sentence, providing granular polarity histograms and visual confidence heatmaps.", 0, "2."),
  bullet("Contract Clause Extraction & Risk Assessment: Employs an adaptive three-tier fallback hierarchy (Local LM Studio Qwen/Gemma → Cloud Groq LLaMA 3.1 → Deterministic local regex rule engine) to isolate covenants and classify risk tiers (Critical, High, Medium, Low).", 0, "3."),
  bullet("Grounded Retrieval-Augmented Generation (RAG) AI Guide: Embeds document passages into an in-memory vector store, enabling users to ask follow-up questions and receive answers cited directly from source text without external hallucination.", 0, "4."),
  bullet("Comprehensive Multi-Format Export Engine: Serializes all analysis results into standardized JSON, spreadsheet-ready CSV, plain text, and self-contained HTML executive reports.", 0, "5.")
);

// ============================================================================
// 3. COMPLETE SYSTEM ARCHITECTURE & FLOWCHART
// ============================================================================
children.push(
  h1("2. Complete System Architecture & Component Design"),
  p(
    "FinSight AI is architected as a decoupled, multi-tier system organized for high modularity, fault tolerance, and offline resilience. Figure 1 illustrates the end-to-end client-server architecture, highlighting the primary execution path, the pipeline router orchestration, and the fallback layers."
  )
);

children.push(...addImage(diagramPath, "Figure 1: FinSight AI System Architecture — Request Flow, NLP Microservices, Fallbacks, and Storage", 590, 415));

children.push(
  h2("2.1 Architectural Tier Breakdown"),
  p("The architecture comprises four core operational tiers:"),
  bullet("Presentation & Client Tier: A modern Single-Page Application (SPA) built with React 18, Vite 5, Tailwind CSS, Framer Motion for micro-animations, Recharts for dynamic visual rendering, and Clerk Authentication for route guarding.", 0, "Client Tier:"),
  bullet("REST Gateway & Router Tier: An asynchronous FastAPI application running on Uvicorn (port 8001). It validates multipart payloads, manages CORS headers, enforces file size ceilings (50 MB), and delegates processing to the Pipeline Router.", 0, "API Gateway:"),
  bullet("NLP Microservices & Pipeline Orchestrator: The core computational layer containing DoclingService, NERService, FinBERTService, LangExtractService, RAGService, and ExportService. Each service operates independently with graceful failure handling.", 0, "Service Tier:"),
  bullet("Storage & Infrastructure Tier: A local filesystem buffer for temporary file ingestion, in-memory numpy-based vector indices, and optional Docker Compose infrastructure providing PostgreSQL (:5432) and Azurite blob storage (:10000-10002).", 0, "Storage Tier:")
);

children.push(
  h2("2.2 Microservice Responsibilities & Interoperability"),
  p("The analytical engine consists of six dedicated services coordinated by pipeline_router.py:")
);

const serviceMatrix = [
  ["Microservice", "Source File", "Primary Engine / Library", "Operational Role & Resilience Mechanism"],
  ["Document Service", "docling_service.py", "pypdf, python-docx, direct UTF-8", "Extracts clean text and structural metadata. Gracefully handles corrupted files with sanitized text fallbacks."],
  ["NER Service", "ner_service.py", "spaCy v3.8, EntityRuler, regex", "Loads custom financial model (model-best). Detects ORG, MONEY, PERCENT, DURATION, PAYMENT_TERM. Falls back to en_core_web_sm."],
  ["FinBERT Sentiment", "finbert_service.py", "HuggingFace ProsusAI/finbert, PyTorch", "Batched sentence evaluation (batch_size=16) with 128 max length truncation. Generates sentence polarity and HTML heatmap."],
  ["Clause Extraction", "langextract_service.py", "LM Studio / Groq / Regex Rules", "3-tier fallback hierarchy: attempts local LM Studio (Qwen/Gemma), then Groq LLaMA 3.1, then deterministic rule matcher."],
  ["RAG Assistant", "rag_service.py", "Hashed n-grams / Gemini, Cosine Sim", "Indexes 300-word passages. Answers natural language queries grounded in source citations. Operates in zero-network offline mode."],
  ["Export Service", "export_router.py", "Native Python, HTML/CSS Templates", "Generates structured JSON payloads, tabular CSV tables, raw text summaries, and self-contained executive HTML reports."]
];
children.push(dataTable(["Service", "File", "Engine", "Role & Fallback Mechanism"], serviceMatrix, [1800, 2000, 2400, 3400]));

// ============================================================================
// 4. STEP-BY-STEP INSTALLATION & ENVIRONMENT SETUP GUIDE
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("3. Step-by-Step Installation & Setup Guide"),
  p(
    "This section provides an exhaustive, step-by-step procedure for preparing the development and production runtime environments on Windows, Linux, or macOS systems."
  ),
  h2("3.1 System Prerequisites & Hardware Specifications")
);

const prereqRows = [
  ["Component", "Minimum Requirement", "Recommended Specification"],
  ["Operating System", "Windows 10/11 64-bit, Ubuntu 20.04+, or macOS 12+", "Windows 11 or Ubuntu 22.04 LTS"],
  ["Python Runtime", "Python 3.10.x - 3.12.x (64-bit)", "Python 3.11.x (CPython)"],
  ["Node.js Runtime", "Node.js v18.x LTS or v20.x LTS", "Node.js v20.12.x LTS with npm v10.x"],
  ["System RAM", "8 GB Physical RAM", "16 GB RAM (allows concurrent FinBERT & LM Studio)"],
  ["Processor / GPU", "Intel Core i5 / AMD Ryzen 5 (4+ Cores)", "8-Core CPU + Optional NVIDIA RTX GPU (CUDA 12.x)"],
  ["Storage Space", "5 GB free disk space", "15 GB free disk space (models + packages)"]
];
children.push(dataTable(["Component", "Minimum", "Recommended"], prereqRows, [2400, 3600, 3600]));

children.push(
  h2("3.2 Step 1: Clone Repository & Verify File Structure"),
  p("Open a terminal (PowerShell on Windows or Bash on Linux/macOS) and clone the repository:"),
  codeBlock([
    "# Clone the repository from GitHub",
    "git clone https://github.com/karthiksteve/finsight.git",
    "cd finsight",
    "",
    "# Verify root directory contents",
    "ls -la"
  ]),
  p("The root directory must contain backend/, frontend/, sample_data/, package.json, and run_app.py.")
);

children.push(
  h2("3.3 Step 2: Configure Backend Python Virtual Environment"),
  p("Create an isolated virtual environment to prevent dependency conflicts with system packages:"),
  codeBlock([
    "# Windows PowerShell / Command Prompt:",
    "python -m venv .venv",
    ".venv\\Scripts\\activate",
    "",
    "# Linux / macOS Bash:",
    "python3 -m venv .venv",
    "source .venv/bin/activate",
    "",
    "# Verify active python path and version:",
    "python --version"
  ])
);

children.push(
  h2("3.4 Step 3: Install Backend Dependencies"),
  p("Upgrade pip and install the complete set of required backend dependencies:"),
  codeBlock([
    "# Upgrade pip, setuptools, and wheel",
    "python -m pip install --upgrade pip setuptools wheel",
    "",
    "# Install all backend requirements",
    "pip install -r backend/requirements.txt"
  ]),
  p("Key dependencies installed include: fastapi (0.115+), uvicorn (0.32+), spacy (3.8+), transformers (4.46+), torch (2.4+), pypdf, python-docx, pydantic-settings, and nltk.")
);

children.push(
  h2("3.5 Step 4: Download NLP Models & Lexicons"),
  p("FinSight AI relies on spaCy's English model and NLTK tokenizers. Execute the following commands:"),
  codeBlock([
    "# Download the standard spaCy English tokenization model",
    "python -m spacy download en_core_web_sm",
    "",
    "# Download required NLTK punkt and stopwords tokenizers",
    'python -c "import nltk; nltk.download(\'punkt\'); nltk.download(\'punkt_tab\'); nltk.download(\'stopwords\')"'
  ]),
  p(
    "Note on FinBERT: The ProsusAI/finbert weights (~438 MB) are automatically cached in ~/.cache/huggingface/hub on the first document analysis execution. Pre-downloading is optional."
  )
);

children.push(
  h2("3.6 Step 5: Configure Frontend Node.js Environment"),
  p("Navigate into the frontend directory and install the required npm dependencies:"),
  codeBlock([
    "# Enter frontend directory",
    "cd frontend",
    "",
    "# Install dependencies with npm",
    "npm install",
    "",
    "# Return to root directory",
    "cd .."
  ]),
  p("This installs React 18, Vite 5, Tailwind CSS, Lucide React, Framer Motion, Recharts, and Clerk SDK.")
);

children.push(
  h2("3.7 Step 6: Configure Environment Variables (.env)"),
  p("FinSight AI provides default configurations for out-of-the-box local execution. Inspect or adjust .env in the root directory:"),
  codeBlock([
    "# Backend Server Settings",
    "HOST=0.0.0.0",
    "PORT=8001",
    "DEBUG=True",
    "",
    "# LLM Provider Options: 'lmstudio' | 'groq' | 'local'",
    "LLM_PROVIDER=lmstudio",
    "LMSTUDIO_BASE_URL=http://localhost:1234/v1",
    "LMSTUDIO_MODEL=qwen2.5-7b-instruct",
    "",
    "# Cloud LLM Keys (Optional for Cloud Mode)",
    "GROQ_API_KEY=",
    "GOOGLE_API_KEY=",
    "",
    "# Frontend API Proxy",
    "VITE_API_BASE_URL=http://localhost:8001"
  ]),
  callout(
    "Zero-Configuration Out-of-the-Box Mode",
    "If no external LLM keys are supplied and LM Studio is not running, FinSight AI automatically activates its internal offline fallback engines: regex-based clause extraction and 256-dim hashed vector RAG. All features remain fully functional without external keys."
  )
);

// ============================================================================
// 5. STEP-BY-STEP TERMINAL EXECUTION & RUNBOOK
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("4. Step-by-Step Terminal Execution & Runbook"),
  p(
    "This section details the exact terminal commands required to launch, monitor, and verify the FinSight AI application."
  ),
  h2("4.1 Method A: Running Backend and Frontend in Separate Terminals (Recommended for Development)")
);

children.push(
  h3("Terminal 1: Launch FastAPI Backend Server"),
  p("Open your first terminal window, activate the virtual environment, and start Uvicorn:"),
  codeBlock([
    "# Navigate to project root",
    "cd c:\\Users\\speak\\Downloads\\nlp2.0",
    "",
    "# Activate Python virtual environment",
    ".\\.venv\\Scripts\\Activate.ps1",
    "",
    "# Start the FastAPI Uvicorn server on port 8001",
    "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8001"
  ]),
  p("Successful startup logs will display:"),
  codeBlock([
    "INFO:     Started server process",
    "INFO:     Waiting for application startup.",
    "INFO:     Initializing FinSight AI Services...",
    "INFO:     NER Service loaded successfully (Custom model-best).",
    "INFO:     FinBERT Service initialized on device: cpu.",
    "INFO:     Application startup complete.",
    "INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)"
  ])
);

children.push(
  h3("Terminal 2: Launch React / Vite Frontend"),
  p("Open a second terminal window, enter the frontend directory, and start the Vite dev server:"),
  codeBlock([
    "# Navigate to frontend directory",
    "cd c:\\Users\\speak\\Downloads\\nlp2.0\\frontend",
    "",
    "# Start Vite development server",
    "npm run dev"
  ]),
  p("Vite will start in milliseconds and print the local URL:"),
  codeBlock([
    "  VITE v5.4.14  ready in 420 ms",
    "",
    "  ➜  Local:   http://localhost:5173/",
    "  ➜  Network: use --host to expose",
    "  ➜  press h + enter to show help"
  ])
);

children.push(
  h2("4.2 Method B: Single-Command Automated Launch Script"),
  p("To launch both servers simultaneously with a single command, execute the bundled run_app.py utility:"),
  codeBlock([
    "# Run the unified launcher script from project root",
    "python run_app.py"
  ]),
  p(
    "The launcher verifies virtual environment status, checks port availability (8001 and 5173), spawns the FastAPI backend, initiates the Vite frontend, and automatically opens your default browser at http://localhost:5173."
  )
);

children.push(
  h2("4.3 Method C: System Verification Script"),
  p("To diagnose dependency integrity and verify model components before a live presentation, execute:"),
  codeBlock([
    "# Run the automated system diagnostic check",
    "python verify_system.py"
  ]),
  p("This script performs an exhaustive probe of:"),
  bullet("Python imports: FastAPI, Uvicorn, spaCy, Transformers, PyTorch, PyPDF, python-docx.", 0),
  bullet("Custom NER Model: Verifies span extraction on sample input Acme Corp and payment terms.", 0),
  bullet("FinBERT Model: Executes an inference test sentence and prints predicted polarity confidence.", 0),
  bullet("LangExtract Engine: Checks connection to LM Studio port 1234 or verifies rule engine fallback.", 0),
  bullet("RAG Vector Index: Tests 256-dimensional hashed embedding generation and cosine retrieval.", 0)
);

// ============================================================================
// 6. STEP-BY-STEP USER WORKFLOW & VISUAL UI WALKTHROUGH
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("5. Step-by-Step User Workflow & Visual Walkthrough"),
  p(
    "This section guides end users and evaluators through the complete analytical workflow using actual high-resolution interface captures from the running application."
  ),
  h2("5.1 Step 1: Navigating to the Home Dashboard")
);

const img1 = path.join(screenshotsDir, "01_landing_page.png");
children.push(...addImage(img1, "Figure 2: FinSight AI Landing Page — Hero Navigation and Architecture Highlights", 580, 285));

children.push(
  p(
    "Upon navigating to http://localhost:5173 in the browser, the user is greeted by the primary landing interface. The navigation header provides one-click access to Home, Upload, Results, About, and Chatbot routes. The hero section highlights the four analytical capabilities (NER, Sentiment, Clause Extraction, RAG) with responsive theme switching (Light / Dark mode) in the upper-right corner."
  ),
  h2("5.2 Step 2: Uploading Financial Documents & Selecting Pipelines")
);

const img2 = path.join(screenshotsDir, "02_upload_wizard.png");
children.push(...addImage(img2, "Figure 3: Multi-Stage Document Upload Wizard with Analysis Toggles", 580, 285));

children.push(
  p(
    "Clicking 'Upload' navigates to the upload wizard (/upload). Users can drag-and-drop a document (PDF, DOCX, or TXT) into the interactive dropzone or click 'Browse Files'. Below the dropzone, three toggle cards allow users to customize execution:"
  ),
  bullet("Named Entity Recognition (NER): Toggles extraction of organizations, amounts, percentages, and terms.", 0),
  bullet("FinBERT Sentiment Analysis: Toggles sentence-level financial polarity scoring and heatmaps.", 0),
  bullet("Clause Extraction: Toggles legal covenant classification and risk evaluation.", 0),
  p("Clicking 'Process Document' initiates the asynchronous pipeline, showing a real-time progress bar.")
);

children.push(
  h2("5.3 Step 3: Inspecting Overall Analysis Results & Executive KPIs")
);

const img3 = path.join(screenshotsDir, "03_results_overview.png");
children.push(...addImage(img3, "Figure 4: Comprehensive Results Dashboard with KPI Metrics and Visual Charts", 580, 285));

children.push(
  p(
    "Upon pipeline completion, the user is automatically redirected to the Results Dashboard (/results). Four executive KPI cards immediately summarize the document profile:"
  ),
  bullet("Processing Duration: Execution turnaround time (e.g. 2.4s for sample corporate filing).", 0),
  bullet("Entities Extracted: Total count of recognized financial entities (e.g. 53 entities).", 0),
  bullet("Document Count: Number of active documents indexed in the session.", 0),
  bullet("Overall Confidence: Model aggregate precision rating (e.g. 94% confidence).", 0),
  p(
    "Below the KPIs, interactive Recharts visualizations illustrate the Entity Distribution pie chart, the Sentiment Distribution bar chart, and the Contract Risk Profile donut chart (displaying clause risk buckets)."
  )
);

children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h2("5.4 Step 4: Reviewing Financial Entities in the NER Module")
);

const img4 = path.join(screenshotsDir, "04_ner_analysis.png");
children.push(...addImage(img4, "Figure 5: Custom Financial Named Entity Recognition Inspection Tab", 580, 285));

children.push(
  p(
    "Switching to the 'Named Entities' tab reveals a structured breakdown of all detected financial tokens. Metrics at the top display total entity counts (14 entities across 7 distinct categories) with 94% precision. The cards below group extracted tokens into color-coded categories: Organization (Apple Inc.), Money ($89.5 billion, $150.25), Date (the quarter, Tuesday), Person (Tim Cook), and Payment Term ('within 30 days')."
  ),
  h2("5.5 Step 5: Analyzing Sentence-Level FinBERT Polarity Heatmaps")
);

const img5 = path.join(screenshotsDir, "05_sentiment_analysis.png");
children.push(...addImage(img5, "Figure 6: FinBERT Sentence-by-Sentence Sentiment Analysis and Polarity Viewer", 580, 285));

children.push(
  p(
    "Selecting the 'Sentiment Analysis' tab presents a line-by-line inspection container. FinSight AI segments the document into individual sentences and evaluates each with ProsusAI/finbert. Sentences are color-coded: light green for Positive ('The stock price rose to $150.25 per share' — 83% confidence), soft grey for Neutral ('Payment shall be made within 30 days' — 94% confidence), and red for Negative."
  )
);

children.push(
  h2("5.6 Step 6: Assessing Contractual Clauses & Legal Risk Tiers")
);

const img6 = path.join(screenshotsDir, "06_clause_risk_analysis.png");
children.push(...addImage(img6, "Figure 7: Contract Clause Extraction, Document Text Highlighter, and Risk Assessment", 580, 285));

children.push(
  p(
    "The 'Clause Extraction' tab presents a dual-pane layout. In the primary document viewer, legal covenants are highlighted in distinct colors (Green for Payment, Orange for Termination, Purple for Confidentiality). The right-hand panel renders structured metadata cards displaying clause type, raw excerpt, and assessed risk level (Critical, High, Medium, Low)."
  )
);

children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h2("5.7 Step 7: Querying Documents with the Grounded RAG Chatbot")
);

const img7 = path.join(screenshotsDir, "07_rag_chatbot.png");
children.push(...addImage(img7, "Figure 8: Grounded RAG Conversational AI Assistant with Source Citations", 580, 285));

children.push(
  p(
    "Navigating to /chatbot connects the user to the RAG Conversational AI Guide. Users can submit natural language inquiries such as: 'What is the payment term specified in the contract?'. The RAG service performs cosine similarity retrieval over indexed chunks and returns a grounded response with direct source passage citations, eliminating AI hallucination."
  ),
  h2("5.8 Step 8: Exporting Multi-Format Analysis Reports")
);

children.push(
  p(
    "From the Results Dashboard, users can export their findings via four dedicated buttons:"
  ),
  bullet("Export JSON: Full structured schema for downstream API pipelines.", 0),
  bullet("Export CSV: Tabular entity and clause listings for Excel analysis.", 0),
  bullet("Export Text: Plain-text executive summary.", 0),
  bullet("Download HTML Report: A self-contained, responsive HTML file with embedded CSS for client presentation.", 0)
);

// ============================================================================
// 7. REST API SPECIFICATIONS & DATA CONTRACTS
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("6. REST API Specifications & Data Contracts"),
  p(
    "The FinSight AI backend exposes an OpenAPI 3.0-compliant RESTful interface under the /api/v1 namespace. Interactive Swagger UI documentation is accessible at http://localhost:8001/docs."
  )
);

const img8 = path.join(screenshotsDir, "08_fastapi_swagger_docs.png");
children.push(...addImage(img8, "Figure 9: FastAPI OpenAPI / Swagger Interactive Documentation Interface (/docs)", 580, 285));

children.push(
  h2("6.1 Core API Endpoint Directory")
);

const apiSpecHeaders = ["Method", "Endpoint Route", "Request Type", "Response Format", "Description"];
const apiSpecRows = [
  ["POST", "/api/v1/pipeline/process-document", "multipart/form-data", "application/json", "Full document processing: extraction, NER, FinBERT, clauses, and RAG indexing."],
  ["GET", "/api/v1/pipeline/pipeline-status", "None", "application/json", "Returns operational health and readiness of all analytical services."],
  ["POST", "/api/v1/ner/extract-entities", "application/json", "application/json", "Extracts financial entities and spans from raw text."],
  ["POST", "/api/v1/finbert/analyze-sentiment", "application/json", "application/json", "Scores sentence-level financial sentiment and aggregates distribution."],
  ["POST", "/api/v1/langextract/extract-clauses", "application/json", "application/json", "Extracts legal clauses and assigns contractual risk tiers."],
  ["POST", "/api/v1/rag/upload", "multipart/form-data", "application/json", "Chunks, embeds, and indexes document into RAG vector store."],
  ["POST", "/api/v1/rag/query", "application/json", "application/json", "Answers query using cosine similarity retrieval over indexed chunks."],
  ["POST", "/api/v1/rag/clear", "None", "application/json", "Resets in-memory RAG index and removes active chunks."],
  ["POST", "/api/v1/export/results", "application/json", "file download", "Exports analysis data as JSON, CSV, or TXT."],
  ["POST", "/api/v1/export/report", "application/json", "text/html", "Generates self-contained HTML executive report."],
  ["GET", "/health", "None", "application/json", "Basic service liveness probe."]
];
children.push(dataTable(apiSpecHeaders, apiSpecRows, [1200, 2600, 1800, 1600, 2400]));

children.push(
  h2("6.2 Pipeline Request & Response Schema"),
  p("Example request using cURL to process a financial filing:"),
  codeBlock([
    'curl -X POST "http://localhost:8001/api/v1/pipeline/process-document" \\',
    '  -F "file=@sample_data/test_document.txt" \\',
    '  -F "include_ner=true" \\',
    '  -F "include_finbert=true" \\',
    '  -F "include_langextract=true"'
  ]),
  p("Standard JSON Response Payload:"),
  codeBlock([
    '{',
    '  "status": "success",',
    '  "file_metadata": {',
    '    "filename": "test_document.txt",',
    '    "size_bytes": 504,',
    '    "extension": ".txt",',
    '    "extraction_method": "direct_read"',
    '  },',
    '  "ner_results": {',
    '    "entities": [',
    '      {"text": "Apple Inc.", "label": "ORG", "start": 0, "end": 10, "confidence": 0.95},',
    '      {"text": "$89.5 billion", "label": "MONEY", "start": 45, "end": 58, "confidence": 0.98},',
    '      {"text": "within 30 days", "label": "PAYMENT_TERM", "start": 120, "end": 134, "confidence": 0.92}',
    '    ],',
    '    "entity_count": 14,',
    '    "entity_types": ["ORG", "MONEY", "DATE", "PERSON", "PAYMENT_TERM"]',
    '  },',
    '  "finbert_results": {',
    '    "dominant_sentiment": "neutral",',
    '    "sentiment_distribution": {"positive": 1, "negative": 0, "neutral": 7},',
    '    "confidence_scores": {"positive": 0.83, "negative": 0.0, "neutral": 0.94}',
    '  },',
    '  "langextract_results": {',
    '    "clauses": [',
    '      {"type": "Payment", "text": "Payment shall be made within 30 days...", "risk_level": "Medium"},',
    '      {"type": "Termination", "text": "Either party may terminate upon 60 days...", "risk_level": "High"}',
    '    ],',
    '    "provider_used": "local_rules"',
    '  }',
    '}'
  ])
);

// ============================================================================
// 8. ENGINEERING OPTIMIZATIONS & DEEP-DIVE
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("7. Engineering Optimizations & Deep-Dive"),
  p(
    "During development and stress testing, several critical bottlenecks and edge cases were identified and solved through targeted architectural optimizations."
  ),
  h2("7.1 Vectorized FinBERT Batching (Resolving the 90% Upload Freeze)"),
  p(
    "Diagnosis: In early releases, when a multi-paragraph document was processed, the upload progress bar would freeze at 90%. Profiling revealed that FinBERTService was evaluating sentences sequentially in a Python for-loop on the CPU without batching, resulting in unconstrained latency for documents containing over 20 sentences."
  ),
  p(
    "Resolution: In backend/services/finbert_service.py, the inference routine was re-engineered using batched parallel PyTorch tensors with torch.no_grad():"
  ),
  bullet("Batch Tensor Dispatch: Sentences are grouped into batches of 16 (batch_size=16) and dispatched simultaneously to the transformer encoder.", 0),
  bullet("Token Truncation: Sequence length is capped at max_length=128 tokens per sentence, preventing O(n²) attention explosion on malformed passages.", 0),
  bullet("Sentence Ceiling: A maximum ceiling of 60 sentences is analyzed per document summary, reducing CPU execution time from 45 seconds down to 2.1 seconds.", 0),
  h2("7.2 Custom Financial NER Model Cleaning & EntityRuler Tuning"),
  p(
    "Inspection of the initial training data in annotations.json revealed that 12 of 229 annotated spans contained invalid character offsets (e.g. resolving to 'D 75,000.' instead of full monetary spans) and 166 spans truncated mid-token. In build_financial_ner.py, span extraction was rebuilt using exact whitespace token boundary matching and curated regex patterns for monetary values ($X.XX million/billion), interest rates (X.X%), and payment terms ('within N days', 'net 30/60')."
  ),
  h2("7.3 Deterministic Hashed n-Gram Vector Retrieval for Zero-Cost RAG"),
  p(
    "To provide instant question-answering without requiring paid OpenAI or Google Gemini API keys, rag_service.py implements a local 256-dimensional subword and character n-gram hashing algorithm using NumPy. Queries are matched via vector cosine similarity with zero external network latency, providing high retrieval precision on domain-specific contractual keywords."
  ),
  h2("7.4 Frontend Bundle Splitting & Tree-Shaking"),
  p(
    "The production frontend bundle was optimized in frontend/vite.config.js using manual chunk splitting. Heavy libraries were segmented into distinct vendor chunks (vendor-react, vendor-clerk, vendor-charts, vendor-motion), reducing the main entry point to just 129 kB and ensuring near-instant page transitions."
  )
);

// ============================================================================
// 9. TROUBLESHOOTING & MAINTENANCE RUNBOOK
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("8. Troubleshooting & Maintenance Runbook"),
  p(
    "This runbook outlines solutions for common operational issues encountered during deployment or evaluation."
  )
);

const troubleRows = [
  ["Issue / Symptom", "Root Cause", "Resolution Procedure"],
  ["Port 8001 / 5173 already in use", "A previous Uvicorn or Vite process is still running in the background.", "Run in PowerShell: Get-Process python, node | Stop-Process -Force or launch on alternative ports."],
  ["PyTorch CPU memory pressure", "FinBERT transformer initialized without memory constraints.", "FinBERTService is configured with torch.no_grad() and batch_size=16 by default. Ensure system has at least 4 GB free RAM."],
  ["LM Studio offline / timeout", "LM Studio local server not running on port 1234.", "No action required: LangExtractService automatically falls back to the internal rule-based engine and logs 'Provider fallback engaged'."],
  ["Upload hangs or returns HTTP 413", "File exceeds the 50 MB size ceiling.", "Split large filings or increase MAX_FILE_SIZE_MB in backend/config.py."],
  ["Clerk Authentication modal block", "No internet connection or invalid Clerk publishable key.", "ProtectedRoute.jsx implements an automatic 5-second degrade-open fallback, granting access for local demo evaluation if Clerk is unreachable."]
];
children.push(dataTable(["Symptom", "Root Cause", "Resolution"], troubleRows, [2400, 2800, 4400]));

// ============================================================================
// 10. REPOSITORY STRUCTURE & DIRECTORY MAP
// ============================================================================
children.push(
  new Paragraph({ children: [new PageBreak()] }),
  h1("9. Repository Structure & Directory Map"),
  p(
    "The codebase follows a clean, modular structure separating backend services, frontend presentation, models, and automation scripts:"
  ),
  codeBlock([
    "c:\\Users\\speak\\Downloads\\nlp2.0",
    "├── backend/                     # FastAPI Backend Application",
    "│   ├── main.py                  # Application entry point, CORS, routers mounting",
    "│   ├── config.py                # Environment configuration settings via Pydantic",
    "│   ├── errors.py                # Structured domain error classes",
    "│   ├── routers/                 # REST API Route Controllers",
    "│   │   ├── pipeline_router.py   # Primary document processing & status endpoints",
    "│   │   ├── ner_router.py        # Dedicated Named Entity Recognition endpoints",
    "│   │   ├── finbert_router.py    # Dedicated FinBERT sentiment endpoints",
    "│   │   ├── langextract_router.py# Clause extraction & legal risk endpoints",
    "│   │   ├── rag_router.py        # RAG document indexing & query endpoints",
    "│   │   └── export_router.py     # JSON, CSV, TXT & HTML report generation",
    "│   ├── services/                # Specialized Analytical Microservices",
    "│   │   ├── docling_service.py   # File ingestion & parsing (PDF, DOCX, TXT)",
    "│   │   ├── ner_service.py       # Custom spaCy EntityRuler financial extractor",
    "│   │   ├── finbert_service.py   # ProsusAI/finbert transformer sentiment engine",
    "│   │   ├── langextract_service.py# Tri-tier fallback contract clause engine",
    "│   │   └── rag_service.py       # Offline hashed n-gram & cosine vector RAG",
    "│   ├── models/                  # Trained NLP Models & Dictionaries",
    "│   │   └── ner_model/model-best # Custom spaCy financial NER pipeline",
    "│   └── requirements.txt         # Backend Python package dependencies",
    "├── frontend/                    # React 18 / Vite 5 Single Page Application",
    "│   ├── src/",
    "│   │   ├── App.jsx              # Application routing & ProtectedRoute guards",
    "│   │   ├── pages/               # Top-level Page Components",
    "│   │   │   ├── Home.jsx         # Landing page & feature introduction",
    "│   │   │   ├── Upload.jsx       # 3-step document upload wizard",
    "│   │   │   ├── Results.jsx      # Tabbed analytical results dashboard",
    "│   │   │   ├── About.jsx        # Architecture overview & project details",
    "│   │   │   └── Chatbot.jsx      # Grounded RAG conversational AI assistant",
    "│   │   ├── components/          # Reusable UI widgets & Recharts visualizers",
    "│   │   └── services/api.js      # Centralized REST API client (Fetch wrappers)",
    "│   ├── package.json             # Frontend npm dependencies and scripts",
    "│   └── vite.config.js           # Vite build configuration & chunk splitting",
    "├── screenshots/                 # High-resolution platform UI captures & diagrams",
    "│   ├── architecture_diagram.png # System architecture diagram",
    "│   └── 01_landing_page.png ...  # Interface walkthrough figures 2-9",
    "├── sample_data/                 # Sample financial documents for verification",
    "│   └── test_document.txt        # Sample corporate earnings & covenant filing",
    "├── run_app.py                   # Automated single-command launcher",
    "├── start.bat                    # Windows batch launcher script",
    "├── verify_system.py             # System diagnostic & dependency verification tool",
    "└── generate_diagram.py          # Script generating architecture_diagram.png"
  ])
);

// Assemble Document
const doc = new Document({
  creator: "FinSight AI Engineering Team",
  title: "FinSight AI: Comprehensive Step-by-Step Technical Documentation & Architecture Specification",
  description: "Exhaustive Technical Documentation, System Architecture, Installation Guide, Runbook, and API Reference for FinSight AI",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 21, color: COLORS.darkNeutral },
        paragraph: { spacing: { line: 276 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // US Letter
          margin: { top: 1080, bottom: 1080, left: 1100, right: 1100 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "FinSight AI — Technical Documentation & Architecture Specification", size: 16, color: COLORS.secondary, italics: true, font: "Calibri" })
              ],
              alignment: AlignmentType.RIGHT,
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "FinSight AI Financial Document Intelligence Platform  |  Page ", size: 16, color: COLORS.darkNeutral, font: "Calibri" }),
                new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 16,
                  color: COLORS.darkNeutral,
                  font: "Calibri"
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      },
      children,
    },
  ],
});

const outputPath = path.join(baseDir, "FinSight_AI_Technical_Documentation.docx");

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log("Successfully generated Technical Documentation Word Document at:", outputPath);
    console.log("File size:", buffer.length, "bytes");
  })
  .catch((err) => {
    console.error("Error generating docx:", err);
    process.exit(1);
  });
