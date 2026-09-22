const path = require("path");
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, ShadingType, AlignmentType, ImageRun, PageBreak,
  Header, Footer, PageNumber, NumberFormat
} = require("docx");

// Color Palette for Academic Report
const COLORS = {
  primary: "1A365D",      // Deep Navy Blue
  secondary: "2B6CB0",    // Slate Blue
  darkNeutral: "2D3748",  // Charcoal Text
  lightBg: "F7FAFC",      // Very light grey
  tableHeaderBg: "E2E8F0",// Crisp slate header
  tableAltBg: "F8FAFC",   // Alternating row
  border: "CBD5E0",       // Border grey
  accent: "0D9488",       // Teal accent
  riskHigh: "E53E3E",
  riskMedium: "DD6B20",
  riskLow: "38A169"
};

// Formatting helpers
function h1(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 30, color: COLORS.primary, font: "Calibri" })],
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180 },
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
    children: [new TextRun({ text, bold: true, italics: true, size: 22, color: COLORS.darkNeutral, font: "Calibri" })],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 100 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: 21, color: COLORS.darkNeutral, italics: opts.italics || false, bold: opts.bold || false, font: "Calibri" })],
    spacing: { after: 140, line: 280 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
  });
}

function pRuns(runs, opts = {}) {
  return new Paragraph({
    children: runs.map(r => new TextRun({ size: 21, font: "Calibri", color: COLORS.darkNeutral, ...r })),
    spacing: { after: 140, line: 280 },
    alignment: opts.align || AlignmentType.JUSTIFIED,
  });
}

function bullet(text, level = 0, boldPrefix = "") {
  const children = [];
  if (boldPrefix) {
    children.push(new TextRun({ text: boldPrefix + " ", bold: true, size: 21, color: COLORS.darkNeutral, font: "Calibri" }));
  }
  children.push(new TextRun({ text, size: 21, color: COLORS.darkNeutral, font: "Calibri" }));
  return new Paragraph({
    children,
    bullet: { level },
    spacing: { after: 90, line: 260 },
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width || 2000, type: WidthType.DXA },
    shading: opts.shade ? { type: ShadingType.CLEAR, fill: opts.shade } : undefined,
    margins: { top: 100, bottom: 100, left: 140, right: 140 },
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
    console.warn("Image not found:", imagePath);
    return [p(`[Figure placeholder: ${caption}]`, { italics: true })];
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
      spacing: { before: 200, after: 100 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: caption, bold: true, italics: true, size: 19, color: COLORS.secondary, font: "Calibri" })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 220 },
    })
  ];
}

const screenshotsDir = path.join(__dirname, "screenshots");

const children = [];

// ==========================================
// 1. COVER PAGE / TITLE
// ==========================================
children.push(
  new Paragraph({
    children: [new TextRun({ text: "VELLORE INSTITUTE OF TECHNOLOGY, CHENNAI", bold: true, size: 26, color: COLORS.primary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 600, after: 80 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "SCHOOL OF COMPUTER SCIENCE AND ENGINEERING (SCOPE)", bold: true, size: 22, color: COLORS.secondary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 80 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "SWE1017 - NATURAL LANGUAGE PROCESSING (EPJ) — FALL SEMESTER 2026-2027", italics: true, size: 20, color: COLORS.darkNeutral, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "FinSight AI: A Transformer-Based Document Intelligence Platform for Financial Entity Extraction, Sentiment Analysis, and Clause Risk Classification", bold: true, size: 36, color: COLORS.primary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }),
  new Paragraph({
    children: [new TextRun({ text: "PROJECT REVIEW – 2 TECHNICAL IMPLEMENTATION & EVALUATION REPORT", bold: true, size: 24, color: COLORS.accent, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 }
  })
);

const studentRows = [
  ["Laksharaa A S", "23MIA1053", "M.Tech CSE (Integrated) Business Analytics"],
  ["Sandheep S S", "23MIA1161", "M.Tech CSE (Integrated) Business Analytics"],
  ["Karthikeyan A", "23MIA1123", "M.Tech CSE (Integrated) Business Analytics"],
];
children.push(
  new Paragraph({
    children: [new TextRun({ text: "SUBMITTED BY:", bold: true, size: 21, color: COLORS.primary, font: "Calibri" })],
    spacing: { after: 120 }
  }),
  dataTable(["Student Name", "Register No.", "Programme & Specialization"], studentRows, [2600, 2200, 4800]),
  new Paragraph({ text: "", spacing: { after: 400 } }),
  new Paragraph({
    children: [new TextRun({ text: "PROJECT SUPERVISOR / GUIDE:", bold: true, size: 21, color: COLORS.primary, font: "Calibri" })],
    spacing: { after: 120 }
  }),
  dataTable(
    ["Guide Name", "Designation", "Department & School"],
    [["Dr. Manjula V", "Associate Professor Grade 2", "Department of Analytics, SCOPE, VIT Chennai"]],
    [2600, 3200, 3800]
  ),
  new Paragraph({ text: "", spacing: { after: 600 } }),
  new Paragraph({
    children: [new TextRun({ text: "Repository Source: https://github.com/karthiksteve/finsight", italics: true, size: 19, color: COLORS.secondary, font: "Calibri" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 }
  }),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 2. ABSTRACT & KEYWORDS
// ==========================================
children.push(
  h1("Abstract"),
  p(
    "Financial documents such as quarterly filings, earnings call transcripts, credit agreements, and corporate disclosures contain mission-critical information trapped within complex, unstructured natural language. While generic Natural Language Processing (NLP) models perform adequately on standard text, they severely under-perform on domain-specific financial language due to specialized vocabulary, non-standard numeric notations, dense tabular disclosures, and intricate contractual conditions. This report presents the technical implementation and empirical evaluation of FinSight AI, a full-stack, transformer-based document intelligence platform engineered specifically for financial and legal-financial domains. The platform unifies four specialized natural language processing services behind a high-performance asynchronous FastAPI orchestrator: (1) a custom Named Entity Recognition (NER) pipeline combining statistical token representations with a rule-augmented financial EntityRuler; (2) a sentence-level financial sentiment scoring engine powered by ProsusAI/finbert; (3) a contract clause extraction and legal risk classification service utilizing a robust three-tier fallback architecture (local LM Studio LLM → Groq Llama-3.1-8B → deterministic rule-based extractor); and (4) an offline-resilient Retrieval-Augmented Generation (RAG) contextual guidance engine providing document-grounded question answering without hallucination. An interactive single-page application built with React 18, Vite 5, Tailwind CSS, Recharts, and Clerk authentication delivers a responsive user interface for document ingestion, real-time visualization, and multi-format data export (JSON, CSV, plain text, and styled HTML reports). We present end-to-end integration test results, system diagnostic benchmarks, and empirical interface captures across all platform views, followed by a rigorous assessment of current architectural boundaries, training data quality, and the production roadmap."
  ),
  pRuns([
    { text: "Keywords: ", bold: true, color: COLORS.primary },
    { text: "Financial NLP, Named Entity Recognition (NER), FinBERT Sentiment Analysis, Contract Clause Extraction, Retrieval-Augmented Generation (RAG), Legal Risk Classification, Full-Stack Architecture.", italics: true }
  ]),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 3. PROBLEM STATEMENT, MOTIVATION & OBJECTIVES
// ==========================================
children.push(
  h1("1. Problem Statement, Motivation, and Research Objectives"),
  h2("1.1 Problem Statement"),
  p(
    "The modern financial sector generates millions of unstructured textual documents daily, encompassing 10-K/10-Q regulatory filings, debt covenants, credit facility agreements, equity research notes, and press announcements. Financial analysts, compliance officers, and risk underwriters spend upwards of 70% of their research time manually locating and cross-referencing critical figures (e.g., revenues, EBITDA margins, interest rates, penalty percentages) and identifying legal exposure in covenants and termination clauses. Off-the-shelf NLP tools and general-purpose large language models (LLMs) fail to resolve this challenge reliably: generic NER taggers misclassify compound financial terms, general sentiment lexicons (such as VADER or general BERT) misinterpret standard financial language (e.g., classifying 'liability increased' or 'yield declined' incorrectly), and ungrounded LLMs frequently hallucinate quantitative figures when reasoning over dense multi-page filings. There is an urgent academic and industrial need for a domain-adapted, multi-service intelligence system that converts unstructured financial text into structured, auditable, and queryable data."
  ),
  h2("1.2 Motivation"),
  bullet("Scale and Velocity: The exponential growth in corporate documentation renders manual line-by-line review computationally and financially prohibitive [10].", 0, "1."),
  bullet("Foundational Downstream Utility: Accurate financial entity extraction is an indispensable prerequisite for credit scoring, algorithmic trading, compliance auditing, and fraud detection [1], [9].", 0, "2."),
  bullet("Domain Specificity: Literature demonstrates that finance-tuned models (e.g., FinBERT, specialized NER rulers) drastically outperform general models on specialized corpora [6], [8].", 0, "3."),
  bullet("Unified Intelligence Gap: Existing academic research predominantly investigates NER, sentiment analysis, clause extraction, or RAG in isolated studies; virtually no open platform unifies these four capabilities into an integrated analytical pipeline [11], [12].", 0, "4."),
  h2("1.3 Objectives"),
  bullet("To design and implement a custom financial Named Entity Recognition (NER) service tuned to extract organizations, monetary amounts, dates, durations, interest rates, and payment terms from unstructured corpora.", 0, "Obj 1:"),
  bullet("To integrate and evaluate a sentence-level FinBERT sentiment analysis engine that aggregates document-level polarity, per-label confidence distributions, and color-coded visual transparency.", 0, "Obj 2:"),
  bullet("To engineer a fault-tolerant contract clause extraction and risk classification service operating across a three-tier hierarchy (Local LM Studio → Cloud Groq LLM → Local Rule Engine).", 0, "Obj 3:"),
  bullet("To develop a document-grounded Retrieval-Augmented Generation (RAG) assistant that indexes parsed document passages and answers contextual queries with source citations.", 0, "Obj 4:"),
  bullet("To construct a modern, authenticated React/Vite dashboard featuring data visualization, interactive clause inspection, and multi-format export capabilities.", 0, "Obj 5:"),
  h2("1.4 Scope and System Boundaries"),
  p(
    "The scope of this Phase-2 implementation encompasses document ingestion (PDF, DOCX, TXT, HTML), multi-service NLP feature extraction, in-memory RAG querying, and client-side visualization. While Docker Compose provisions PostgreSQL and Azurite blob storage for future state persistence, runtime document state in the current release is held in memory per session. Real-time streaming ingestion and multi-tenant enterprise access control are planned for subsequent production hardening."
  )
);

// ==========================================
// 4. LITERATURE SURVEY & RELATED WORK
// ==========================================
children.push(
  h1("2. Literature Survey and Theoretical Background"),
  p(
    "To establish a sound methodological foundation, a comprehensive literature survey of fifteen peer-reviewed papers (2023-2026) published across IEEE, Springer, Elsevier, ACM, and MDPI was conducted during Review 1. The literature spans three core technical pillars: (1) Financial Named Entity Recognition, (2) Financial Sentiment Classification via Transformers, and (3) Contract Clause Extraction and Retrieval-Augmented Generation. Table 1 summarizes the findings, architectures, attained metrics, and identified gaps across these foundational works."
  ),
  h2("2.1 Comparative Literature Matrix")
);

const litHeaders = ["Ref / Paper", "Problem Addressed", "Methodology / Models", "Metrics", "Attained Score", "Identified Gap / Limitation"];
const litData = [
  ["[1] Zhang & Zhang (2023)", "Nested financial entities in complex sentences", "BERT encoder reformulated as Machine Reading Comprehension (MRC)", "P, R, F1", "Outperformed BERT-CRF baselines on nested spans", "Inference latency overhead; struggles with rare/OOV ticker symbols."],
  ["[2] Kaur et al. (2024)", "Domain adaptation in supervised NER pipelines", "Fine-tuned BERT transformer with token-classification head", "P, R, F1", "Superior P/R over CRF and dictionary baselines", "Tested only on generic corpora; lacks financial notation awareness."],
  ["[3] Aejas et al. (2024)", "Lack of standardized legal/financial NER benchmark", "BERT-family transformers benchmarked against BiLSTM-CRF", "Entity F1, P, R", "Transformer models attained strongest overall F1", "Benchmark confined to formal contracts; lacks informal financial text."],
  ["[4] Abilio et al. (2024)", "Non-English earnings call transcripts (BraFiNER)", "BERTimbau, mBERT vs. PTT5, mT5 encoder-decoder", "Macro F1, Error rate", "Macro F1 reached 98.33% - 98.99% (BERT-family)", "Generative T5 models altered numeric/percentage values during generation."],
  ["[5] IPerFEX (2024)", "Personal finance entity extraction from informal text", "IndoBERT embeddings + BiGRU + CRF layer", "F1, Latency", "F1 0.73; ~14% faster than BiLSTM-CRF baseline", "Numeric entity extraction weak on unnormalized currency phrases."],
  ["[6] Shobayo et al. (2024)", "Financial news sentiment for stock market prediction", "FinBERT vs. GPT-4 vs. Logistic Regression (Optuna)", "Acc, P, R, F1, ROC", "FinBERT attained Acc 63.3%, F1 63.3%, ROC-AUC 65.6%", "FinBERT alone struggled with fast-moving market terminology."],
  ["[7] Priya et al. (2025)", "Capturing subtle sentiment dynamics in financial text", "FinBERT vs. BERT vs. DistilBERT comparative study", "Accuracy, Nuance capture", "FinBERT best for subtle shifts; DistilBERT best efficiency", "Accuracy-efficiency trade-off unresolved for large-scale pipelines."],
  ["[8] Zaâbi & Boukhris (2025)", "Coarse sentiment categories miss fine-grained intensity", "Hybrid FinBERT + RoBERTa ensemble classifier", "Fine-grained F1", "Hybrid ensemble captured subtle sentiment grades", "Significantly higher computational and training overhead."],
  ["[9] Kirtac & Germano (2024)", "LLM sentiment vs. Loughran-McDonald dictionary", "OPT, BERT, FinBERT compared to LM dictionary", "Acc, P, R, F1, Sharpe", "FinBERT Acc 72.2%, F1 73.1% (LM dictionary 50.1%)", "General LLM (OPT) matched FinBERT, showing domain tuning has limits."],
  ["[10] Faccia et al. (2024)", "Automating accounting disclosure transparency review", "NLP sentiment scoring of accounting narratives", "Transparency score", "Demonstrated automated flagging of evasive disclosures", "Qualitative evaluation; lacks standardized quantitative benchmark."],
  ["[11] Darji et al. (2024)", "Hallucinations in financial risk document reasoning", "Dense retriever + generative LLM (RAG pipeline)", "Faithfulness, Relevance", "RAG grounding substantially cut hallucinated numbers", "Retrieval degraded on long, table-heavy SEC filings."],
  ["[12] Sarmah et al. (2024)", "Vector-only RAG misses relational facts across docs", "HybridRAG: Knowledge Graph + Vector Retrieval", "Faithfulness, Context P", "HybridRAG significantly improved answer faithfulness", "Knowledge graph construction is labor-intensive and costly."],
  ["[13] Aejas et al. (2024)", "Manual extraction of termination & liability clauses", "Extractive QA transformers fine-tuned on CUAD", "Exact Match, F1", "Strong span-level accuracy on target clauses", "Limited to CUAD categories; lacks financial covenant clauses."],
  ["[14] Memar et al. (2026)", "Automated Low/Med/High risk scoring of clauses", "Fine-tuned BERT and RoBERTa risk classifiers", "Acc, Macro-F1", "RoBERTa Acc 82.8%, Macro-F1 0.805", "Confusion between Med and High risk due to overlapping terms."],
  ["[15] Aejas et al. (2025)", "Heavy transformer latency during real-time review", "Teacher-student knowledge distillation for QA clauses", "F1 retention, Latency", "Student model retained >92% F1 with 60% lower latency", "Accuracy dropped on under-represented / rare clause types."]
];
children.push(dataTable(litHeaders, litData, [1400, 1600, 1800, 1100, 1600, 1900]));

children.push(
  h2("2.2 Synthesis of Literature Gaps and Proposed Architecture"),
  p(
    "A systematic analysis of the literature reveals three persistent shortcomings across existing works: First, single-task isolation: papers [1]-[5] focus exclusively on entity tagging, [6]-[10] on sentiment classification, and [11]-[15] on clause extraction or question answering, forcing practitioners to stitch together disparate, incompatible tools. Second, numeric vulnerability: generative approaches [4] frequently hallucinate or distort monetary figures and percentages, a fatal flaw in financial analysis. Third, infrastructure fragility: advanced RAG pipelines [11], [12] collapse when third-party cloud APIs experience downtime, rate limits, or network partitions. FinSight AI resolves these limitations through a unified multi-service architecture featuring deterministic rule-based guarantees for numeric entities, local offline fallbacks for LLM inference, and synchronized multi-service orchestration behind a unified REST gateway."
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 5. SYSTEM ARCHITECTURE & HIGH-LEVEL DESIGN
// ==========================================
children.push(
  h1("3. System Architecture and Implementation Design"),
  p(
    "FinSight AI is structured as a decoupled, three-tier client-server system designed for high computational efficiency, offline resilience, and modular service extensibility. The system comprises a React 18 / Vite 5 single-page application, an asynchronous FastAPI backend gateway, four specialized NLP processing microservices, and provisioned storage containers (PostgreSQL and Azurite blob emulator)."
  ),
  h2("3.1 Implementation Architecture Diagram")
);

const archPath = path.join(screenshotsDir, "architecture_diagram.png");
children.push(...addImage(archPath, "Figure 1: FinSight AI Implementation Architecture — Router Orchestration, NLP Microservices, Fallbacks, and Client Tier", 590, 420));

children.push(
  h2("3.2 Request Flow and Pipeline Execution"),
  p("A document submitted via the web dashboard traverses the following sequential stages:"),
  bullet("Multipart Form Submission: The frontend sends the selected file (PDF, DOCX, TXT, HTML) and boolean feature flags (include_ner, include_finbert, include_langextract) to POST /api/v1/pipeline/process-document.", 0, "Step 1:"),
  bullet("Ingestion & Validation: The pipeline router validates file presence, extension, and enforces a 50 MB payload ceiling. The file is temporarily staged in local buffer storage.", 0, "Step 2:"),
  bullet("Text Extraction: DoclingService parses the file using pypdf (for PDF binaries), python-docx (for Word documents), or direct UTF-8 reading (for plain text), generating plain text and structured metadata.", 0, "Step 3:"),
  bullet("Concurrent Service Dispatch: The extracted text is concurrently dispatched to the active analytical services: NERService tags financial tokens; FinBERTService calculates sentence sentiments; LangExtractService extracts clauses and assigns risk tiers.", 0, "Step 4:"),
  bullet("RAG Vector Indexing: The parsed text is segmented into semantic chunks, vectorized via deterministic embeddings (or Google Gemini if configured), and indexed into the in-memory RAG vector store.", 0, "Step 5:"),
  bullet("Response Consolidation: Results from all microservices are merged into an integrated JSON payload and transmitted to the frontend, which renders interactive visualization tabs.", 0, "Step 6:"),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 6. BACKEND IMPLEMENTATION BY MODULE
// ==========================================
children.push(
  h1("4. Backend Implementation and Service Specifications"),
  h2("4.1 Document Ingestion Service (DoclingService)"),
  p(
    "The DoclingService (backend/services/docling_service.py) acts as the ingestion boundary. It accepts multipart file uploads and implements dedicated format extractors: pypdf.PdfReader for PDF extraction, docx.Document for Microsoft Word documents, and direct UTF-8 decoding for raw text and HTML files. Extracted text is normalized by stripping extraneous whitespace, non-printable characters, and carriage returns, while recording structural metadata (original filename, byte size, page count, and extraction method)."
  ),
  h2("4.2 Custom Financial Named Entity Recognition (NERService)"),
  p(
    "Financial entity recognition requires capturing both general categories (organizations, persons, dates) and domain-specific financial constructs (monetary amounts, percentage yields, payment terms, and durations). NERService loads a custom spaCy pipeline from models/ner_model/model-best, backed by en_core_web_sm. To achieve high precision on financial notation without generative drift [4], the pipeline layers a spaCy EntityRuler loaded with 96 curated financial entity patterns and exact regex matchers for monetary amounts (e.g., '$89.5 billion', 'GBP 20,000') and payment schedules ('within 30 days', 'net 60')."
  ),
  h2("4.3 FinBERT Financial Sentiment Analysis (FinBERTService)"),
  p(
    "FinBERTService wraps the ProsusAI/finbert transformer model via the Hugging Face Transformers pipeline. FinBERT is specifically pre-trained on the Financial PhraseBank corpus to discern financial tone. Text is segmented into sentences using NLTK's punkt tokenizer. Each sentence is independently evaluated, outputting a discrete label (positive, negative, neutral) and a softmax probability score. FinBERTService computes aggregate document statistics: dominant polarity, sentiment distribution counts, and per-label average confidence scores."
  ),
  h2("4.4 Contract Clause Extraction and Risk Engine (LangExtractService)"),
  p(
    "LangExtractService implements an advanced three-tier fallback hierarchy to guarantee continuous operation in the absence of internet connectivity or paid API quotas: (1) Primary Engine: Local LM Studio instance running Qwen3-8B or Gemma3-4B on port 1234; (2) Secondary Engine: Cloud Groq API running llama-3.1-8b-instant; (3) Tertiary Engine: Deterministic rule-based regex parser matching eight clause categories (Payment, Termination, Confidentiality, Liability, Governing Law, Force Majeure, Renewal, Intellectual Property). Each extracted clause is assigned an objective risk tier (Critical, High, Medium, Low) based on contractual thresholds [14]."
  ),
  h2("4.5 Contextual RAG AI Guide (RAGService)"),
  p(
    "RAGService enables semantic question-answering grounded strictly within uploaded documents to eliminate hallucination [11]. The service chunks text into 300-word passages with 50-word overlaps. Embeddings are generated using Google Gemini (if GOOGLE_API_KEY is supplied) or a local deterministic 256-dimensional hashed n-gram embedding requiring zero external network calls. Incoming queries are matched via cosine similarity, and top passages are synthesized into contextual responses with explicit source citations."
  ),
  h2("4.6 Export and Reporting Router (export_router.py)"),
  p(
    "The export engine serializes analysis results into four standardized formats: structured JSON (for machine-to-machine pipelines), tabular CSV (for spreadsheet analysis), plain text summary, and an executive self-contained HTML report with inline responsive CSS styling, enabling seamless sharing without server dependencies."
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 7. FRONTEND ARCHITECTURE & PLATFORM SCREENSHOTS
// ==========================================
children.push(
  h1("5. Frontend Architecture and Platform Visual Walkthrough"),
  p(
    "The frontend is implemented as a modern Single-Page Application (SPA) utilizing React 18, Vite 5, Tailwind CSS, Framer Motion for micro-animations, and Lucide React iconography. The client architecture emphasizes visual hierarchy, responsive layout, dark/light theme switching, and seamless state transitions across routes."
  ),
  h2("5.1 Visual Walkthrough and Empirical Interface Captures"),
  p(
    "The following figures present high-resolution captures of the active platform, documenting the end-to-end user workflow from initial landing to document upload, multi-service results exploration, and conversational question-answering."
  )
);

// Screenshot 1: Landing Page
const img1 = path.join(screenshotsDir, "01_landing_page.png");
children.push(...addImage(img1, "Figure 2: FinSight AI Landing Page — Hero Section, Architecture Overview, and Navigation Header", 580, 290));
children.push(p(
  "Figure 2 illustrates the platform's entry point. The interface features a prominent value-proposition headline ('Financial Document Intelligence Platform'), capability pills (NER, FinBERT Sentiment, Contract Clause Extraction, RAG), and quick navigation controls. The top navigation bar provides instant access to Home, Upload, Results, About, and RAG routes, alongside light/dark theme toggles and Clerk authentication controls."
));

// Screenshot 2: Upload Wizard
const img2 = path.join(screenshotsDir, "02_upload_wizard.png");
children.push(...addImage(img2, "Figure 3: Multi-Stage Document Upload Wizard — Drag-and-Drop Dropzone, Format Support, and Feature Toggles", 580, 290));
children.push(p(
  "Figure 3 depicts the three-step upload wizard (/upload). Users can drag-and-drop or browse files with visual badges for supported extensions (PDF, DOCX, TXT). Below the dropzone, modular toggle cards allow analysts to independently enable or disable Named Entity Recognition, FinBERT Sentiment Analysis, and Clause Extraction prior to initiating server-side processing."
));

// Screenshot 3: Results Overview
const img3 = path.join(screenshotsDir, "03_results_overview.png");
children.push(...addImage(img3, "Figure 4: Comprehensive Results Dashboard — KPI Cards, Entity Pie Chart, Sentiment Histogram, and Risk Donut Chart", 580, 290));
children.push(p(
  "Figure 4 showcases the primary Results Dashboard (/results) after processing sample_data/test_document.txt. Four executive KPI cards display Analysis Duration (2.4s), Entities Extracted (53), Documents Processed (1), and Overall Confidence (94%). Below, Recharts visual components depict the Entity Distribution pie chart (breaking down percentages across Duration, Money, Person, Org, Date), Sentiment Distribution bar chart, and Contract Risk Profile donut chart (identifying 2 High-Risk and 1 Medium-Risk clauses)."
));

// Screenshot 4: NER Analysis
const img4 = path.join(screenshotsDir, "04_ner_analysis.png");
children.push(...addImage(img4, "Figure 5: Custom Named Entity Recognition Tab — Entity Category Badges, Extracted Tokens, and Metrics", 580, 290));
children.push(p(
  "Figure 5 displays the Named Entity Recognition tab. The top metric strip indicates 14 Total Entities across 7 distinct Entity Types with 94% Precision and 92% Confidence. The lower grid categorizes extracted spans into color-coded cards: Organization (Apple Inc.), Money ($89.5 billion, 150.25), Date (the quarter, Tuesday), Person (Tim Cook), and Payment Term ('within 30 days')."
));

// Screenshot 5: Sentiment Analysis
const img5 = path.join(screenshotsDir, "05_sentiment_analysis.png");
children.push(...addImage(img5, "Figure 6: FinBERT Sentiment Analysis Tab — Polarity Scores and Sentence-Level Color Coding", 580, 290));
children.push(p(
  "Figure 6 details the FinBERT Sentiment Analysis interface. Sentences within the document are independently classified and presented in a line-by-line inspection container. Favorable sentences ('The stock price rose to $150.25 per share') are highlighted in light green with an 83% confidence rating, while neutral contractual terms ('Payment shall be made within 30 days') are classified as neutral with up to 94% confidence."
));

// Screenshot 6: Clause Risk Analysis
const img6 = path.join(screenshotsDir, "06_clause_risk_analysis.png");
children.push(...addImage(img6, "Figure 7: Legal Clause Extraction & Risk Assessment — Interactive Text Highlighter and Clause Classification Cards", 580, 290));
children.push(p(
  "Figure 7 presents the Clause Extraction and Risk Assessment view. Extracted legal clauses are dynamically highlighted in the primary document viewing pane using distinct color codings (Green for Payment, Orange for Termination, Purple for Confidentiality). The right-hand panel renders structured metadata cards displaying clause type, raw excerpt, and assessed risk level (e.g., Critical Priority for termination clauses)."
));

// Screenshot 7: RAG Chatbot
const img7 = path.join(screenshotsDir, "07_rag_chatbot.png");
children.push(...addImage(img7, "Figure 8: Contextual RAG AI Guide — Document-Grounded Conversational Interface with Source Attribution", 580, 290));
children.push(p(
  "Figure 8 demonstrates the RAG Contextual AI Guide (/chatbot). The conversation reflects an analyst query: 'What is the payment term specified in the contract?'. The RAG assistant retrieves the indexed passages from test_document.txt and synthesizes a direct, grounded response citing Key Passage 1 ('Payment shall be made within 30 days of invoice date') and Key Passage 2, confirming zero hallucination."
));

// Screenshot 8: FastAPI Swagger Docs
const img8 = path.join(screenshotsDir, "08_fastapi_swagger_docs.png");
children.push(...addImage(img8, "Figure 9: FastAPI OpenAPI / Swagger Interactive Documentation Interface (/docs)", 580, 290));
children.push(p(
  "Figure 9 illustrates the interactive OpenAPI Swagger documentation (/docs) generated natively by FastAPI, detailing all pipeline, NER, sentiment, RAG, and export endpoints."
));

new Paragraph({ children: [new PageBreak()] });

// ==========================================
// 8. API SPECIFICATION & DATA CONTRACTS
// ==========================================
children.push(
  h1("6. API Specifications and System Interoperability"),
  p("The backend exposes a versioned RESTful API under the /api/v1 prefix, documented in Table 2:"),
  h2("6.1 Core API Endpoint Directory")
);

const apiHeaders = ["HTTP Method", "Endpoint Route", "Consumes / Payload", "Produces", "Functional Description"];
const apiRows = [
  ["POST", "/api/v1/pipeline/process-document", "multipart/form-data (file, flags)", "application/json", "Executes full document pipeline (Text extraction, NER, FinBERT, Clause extraction, RAG index)."],
  ["GET", "/api/v1/pipeline/pipeline-status", "None", "application/json", "Returns operational health and readiness of all integrated NLP microservices."],
  ["POST", "/api/v1/ner/extract-entities", "application/json (text, threshold)", "application/json", "Extracts financial entities, token spans, labels, and confidence metrics."],
  ["POST", "/api/v1/finbert/analyze-sentiment", "application/json (text)", "application/json", "Executes sentence-level FinBERT sentiment scoring and returns aggregate distribution."],
  ["POST", "/api/v1/langextract/extract-clauses", "application/json (text, prompt)", "application/json", "Classifies legal/financial clauses and calculates contractual risk levels."],
  ["POST", "/api/v1/rag/upload-document", "multipart/form-data (file)", "application/json", "Chunks, embeds, and indexes document into vector knowledge base."],
  ["POST", "/api/v1/rag/query", "application/json (question, top_k)", "application/json", "Performs semantic similarity search and synthesizes grounded answer with source citations."],
  ["POST", "/api/v1/export/export-results", "application/json (results, format)", "file download", "Exports analysis payload as JSON, CSV, TXT, or styled HTML report."]
];
children.push(dataTable(apiHeaders, apiRows, [1400, 2600, 2000, 1400, 2400]));

// ==========================================
// 9. VERIFICATION & EMPIRICAL BENCHMARKS
// ==========================================
children.push(
  h1("7. System Verification and Empirical Evaluation"),
  p(
    "To substantiate the operational readiness of the platform, two rigorous verification suites were executed against the codebase: verify_system.py (diagnostic probe of local dependencies and model runtimes) and test_pipeline.py (end-to-end integration test driving the FastAPI TestClient through the entire analysis lifecycle)."
  ),
  h2("7.1 Diagnostic Verification Results (verify_system.py)"),
  bullet("Core Dependencies: FastAPI v0.141.1, Uvicorn v0.53.0, spaCy v3.8.11, Transformers v4.46.3, PyTorch v2.4.1+cpu, PyPDF v6.18.1, python-docx v1.2.0 confirmed [OK].", 0),
  bullet("Custom Financial NER: spaCy model loaded from backend/models/ner_model/model-best. Verified entity extraction on test payload: [ORG: Acme Corp], [PERSON: John Doe USD 5,000,000], [PAYMENT_TERM: within 30 days] [OK].", 0),
  bullet("FinBERT Sentiment: ProsusAI/finbert loaded successfully on CPU. Benchmark test sentence ('Operating profit increased by 25% exceeding market expectations') scored Positive with 95.92% confidence [OK].", 0),
  bullet("Clause Extraction: Tri-tier fallback detected local offline status and automatically engaged the local rule-based extractor, identifying 2 clauses [OK].", 0),
  bullet("RAG Contextual Guide: Document chunking and 256-dimensional hashed n-gram embeddings successfully indexed test document and returned grounded contextual synthesis in offline mode [OK].", 0),
  h2("7.2 Pipeline Integration Test Results (test_pipeline.py)")
);

const testHeaders = ["Pipeline Component", "Test Input / Operation", "Observed Output", "Status"];
const testRows = [
  ["Health Endpoint", "GET /", "HTTP 200 OK ('FinSight AI API is running')", "PASSED"],
  ["Document Parsing", "POST /process-document (test_document.txt)", "Extracted 504 chars via direct_read method", "PASSED"],
  ["NER Service", "Entity extraction over document text", "14 entities extracted (ORG, DURATION, PERCENT, MONEY, DATE, PERSON)", "PASSED"],
  ["FinBERT Service", "Sentence-level sentiment analysis", "8 sentences evaluated; Overall sentiment: Neutral; 1 positive sentence", "PASSED"],
  ["Clause Extraction", "Contract clause classification", "3 clauses identified: Payment (Medium risk), Termination (High), Confidentiality", "PASSED"],
  ["RAG Indexing", "In-memory vector store addition", "Indexed 1 chunk into in-memory RAG store", "PASSED"],
  ["RAG Query", "Query: 'What is the payment term...'", "Answer synthesized with Key Passages and source metadata", "PASSED"]
];
children.push(dataTable(testHeaders, testRows, [2000, 2600, 3600, 1200]));

// ==========================================
// 10. CRITICAL ANALYSIS & LIMITATIONS
// ==========================================
children.push(
  h1("8. Critical Analysis, Gaps, and Threats to Validity"),
  p(
    "In accordance with rigorous academic standards, this report explicitly documents the architectural limitations and engineering gaps identified during repository analysis:"
  ),
  bullet("Rule-Based vs. Statistical Generalization: While the NER model incorporates spaCy token architectures, the custom model-best is predominantly driven by an EntityRuler containing 96 dictionary examples. Consequently, it memorizes exact phrases rather than generalising statistically to novel corporate entities [1], [4].", 0, "1. NER Generalization:"),
  bullet("Training Data Span Anomalies: Inspection of backend/models/ner_model/annotations.json revealed that 12 of 229 annotated spans contain invalid character offsets (e.g., resolving to 'D 75,000.' instead of full monetary spans), and 166 spans truncate mid-token. These annotations must be cleaned before formal statistical retraining.", 0, "2. Data Quality:"),
  bullet("Database and Storage Latency: While docker-compose.yml provisions PostgreSQL and Azurite, current FastAPI endpoints store results and vector embeddings in process memory. Session state is lost upon server restart.", 0, "3. Persistence:"),
  bullet("Backend Authentication Trust Boundary: While the React frontend enforces Clerk authentication on /upload and /results, backend FastAPI routes currently accept unauthenticated calls with permissive CORS (allow_origins=['*']). Production deployment mandates JWT token verification middleware.", 0, "4. Security:"),
  bullet("Lack of Standardized Quantitative Benchmark: The platform has demonstrated end-to-end integration and qualitative precision, but lacks a published held-out benchmark measuring micro/macro F1, Exact Match (EM), and ROC-AUC against datasets like FiNER-ORD or CUAD [3], [13].", 0, "5. Evaluation:"),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 11. CONCLUSION & FUTURE WORK
// ==========================================
children.push(
  h1("9. Conclusion and Future Roadmap"),
  p(
    "The Second Implementation Review demonstrates that FinSight AI has achieved its core architectural milestone: transitioning from conceptual design to a fully operational, integrated financial document intelligence platform. The unified multi-service pipeline reliably parses unstructured documents, extracts key financial entities, classifies sentence-level sentiment via FinBERT, detects risk-bearing legal clauses, and provides hallucination-free contextual Q&A through an offline-resilient RAG architecture."
  ),
  p(
    "For the final development phase leading to Review 3, engineering effort will prioritize: (1) correcting span offsets in annotations.json and fine-tuning a RoBERTa-NER token classification head; (2) wiring SQLAlchemy ORM models into the Alembic-managed PostgreSQL database to enable persistent multi-document indexing; (3) introducing JWT bearer validation on all FastAPI routes to match Clerk frontend authentication; and (4) executing a formal quantitative benchmark against the FiNER-139 and CUAD benchmarks to publish empirical F1 and precision-recall metrics."
  ),
  new Paragraph({ children: [new PageBreak()] })
);

// ==========================================
// 12. REFERENCES (IEEE FORMAT)
// ==========================================
children.push(
  h1("10. References"),
  p("References are formatted in standard IEEE citation order matching citations throughout the report:"),
  bullet('Y. Zhang and H. Zhang, "FinBERT-MRC: Financial Named Entity Recognition Using BERT Under the Machine Reading Comprehension Paradigm," Neural Processing Letters, vol. 55, pp. 7393-7413, 2023.', 0, "[1]"),
  bullet('N. Kaur, A. Saha, M. Swami, et al., "BERT-NER: A Transformer-Based Approach For Named Entity Recognition," in Proc. 2024 15th Int. Conf. Computing, Communication and Networking Technologies (ICCCNT), IEEE, 2024.', 0, "[2]"),
  bullet('B. Aejas, A. Belhi, H. Zhang, and A. Bouras, "Deep learning-based automatic analysis of legal contracts: a named entity recognition benchmark," Neural Computing and Applications, Springer, 2024.', 0, "[3]"),
  bullet('R. Abilio et al., "Evaluating Named Entity Recognition: A comparative analysis of mono- and multilingual transformer models on a novel Brazilian corporate earnings call transcripts dataset," Applied Soft Computing, Elsevier, vol. 152, art. 111244, 2024.', 0, "[4]"),
  bullet('"IPerFEX-2023: Indonesian personal financial entity extraction using IndoBERT-BiGRU-CRF model," Journal of Big Data, vol. 11, Springer, 2024.', 0, "[5]"),
  bullet('O. Shobayo et al., "Innovative Sentiment Analysis and Prediction of Stock Price Using FinBERT, GPT-4 and Logistic Regression: A Data-Driven Approach," Big Data and Cognitive Computing, vol. 8, no. 11, art. 143, MDPI, 2024.', 0, "[6]"),
  bullet('S. Baghavathi Priya, M. Kumar, J. D. Nitheesh Prakash, and N. Krithika, "Advanced Financial Sentiment Analysis Using FinBERT to Explore Sentiment Dynamics," in Proc. 2025 3rd Int. Conf. Intelligent Data Communication Technologies and Internet of Things (IDCIoT), IEEE, 2025, pp. 889-897.', 0, "[7]"),
  bullet('C. Zaâbi and I. Boukhris, "Enhancing Financial Sentiment Analysis with FinBERT and RoBERTa: A Fine-Grained Approach to Market Predictions," in Communications in Computer and Information Science, Springer, 2025.', 0, "[8]"),
  bullet('K. Kirtac and G. Germano, "Sentiment trading with large language models," Finance Research Letters, vol. 62, Part B, art. 105227, Elsevier, 2024.', 0, "[9]"),
  bullet('A. Faccia, J. McDonald, and B. George, "NLP sentiment analysis and accounting transparency: a new era of financial record keeping," Computers, vol. 13, no. 1, art. 5, MDPI, 2024.', 0, "[10]"),
  bullet('A. Darji, F. Kheni, D. Chodvadia, P. Goel, D. Garg, and B. Patel, "Enhancing Financial Risk Analysis using RAG-based Large Language Models," in Proc. 2024 3rd Int. Conf. Automation, Computing and Renewable Systems (ICACRS), IEEE, 2024, pp. 754-760.', 0, "[11]"),
  bullet('B. Sarmah, D. Mehta, B. Hall, R. Rao, S. Patel, and S. Pasquali, "HybridRAG: Integrating knowledge graphs and vector retrieval augmented generation for efficient information extraction," in Proc. 5th ACM Int. Conf. AI in Finance (ICAIF), 2024, pp. 608-616.', 0, "[12]"),
  bullet('B. Aejas, A. Belhi, and A. Bouras, "Contract Clause Extraction Using Question-Answering Task," in Proc. Int. Conf. Web Information Systems Engineering (WISE), Springer, 2024, pp. 320-333.', 0, "[13]"),
  bullet('F. Memar, E. Q. Shahra, and S. Bamansoor, "AI-Powered Contract Clause Risk Classifier for ERP Integration," in Advances in Intelligent Computing Techniques and Applications II (IRICT 2025), Lecture Notes on Data Engineering and Communications Technologies, vol. 293, Springer, Cham, 2026.', 0, "[14]"),
  bullet('B. Aejas, A. Belhi, and A. Bouras, "Efficient legal contract clause extraction using a QA-based knowledge distillation approach," World Wide Web, vol. 28, art. 62, Springer, 2025.', 0, "[15]"),
  bullet('A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems (NeurIPS), vol. 30, 2017, pp. 5998-6008.', 0, "[16]"),
  bullet('J. Devlin, M.-W. Chang, K. Lee, and K. Toutanova, "BERT: Pre-training of deep bidirectional transformers for language understanding," in Proc. NAACL-HLT, 2019, pp. 4171-4186.', 0, "[17]"),
  bullet('D. Araci, "FinBERT: Financial sentiment analysis with pre-trained language models," arXiv preprint arXiv:1908.10063, 2019.', 0, "[18]"),
  bullet('P. Lewis et al., "Retrieval-augmented generation for knowledge-intensive NLP tasks," in Advances in Neural Information Processing Systems (NeurIPS), vol. 33, 2020, pp. 9459-9474.', 0, "[19]"),
  bullet('D. Hendrycks et al., "CUAD: An expert-annotated NLP dataset for legal contract review," in Proc. NeurIPS Datasets and Benchmarks Track, 2021.', 0, "[20]")
);

// Assemble Document
const doc = new Document({
  creator: "FinSight AI Project Team — VIT Chennai",
  title: "FinSight AI: Second Review Technical Implementation Report",
  description: "Academic-grade Technical Documentation and Implementation Review for FinSight AI Platform",
  styles: {
    default: {
      document: {
        run: { font: "Calibri", size: 21, color: COLORS.darkNeutral },
        paragraph: { spacing: { line: 280 } },
      },
    },
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 }, // Standard US Letter
          margin: { top: 1200, bottom: 1200, left: 1200, right: 1200 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "FinSight AI — Review 2 Technical Implementation Report", size: 16, color: COLORS.secondary, italics: true, font: "Calibri" })
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
                new TextRun({ text: "School of Computer Science and Engineering (SCOPE), VIT Chennai  |  Page ", size: 16, color: COLORS.darkNeutral, font: "Calibri" }),
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

const outputPath = path.join(__dirname, "FinSight_AI_Technical_Documentation.docx");

Packer.toBuffer(doc)
  .then((buffer) => {
    fs.writeFileSync(outputPath, buffer);
    console.log("Successfully generated Academic Project Report Word Document at:", outputPath);
    console.log("File size:", buffer.length, "bytes");
  })
  .catch((err) => {
    console.error("Error generating docx:", err);
    process.exit(1);
  });
