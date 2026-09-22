import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Set up figure
fig, ax = plt.subplots(figsize=(12, 8.5), dpi=300)
ax.set_xlim(0, 12)
ax.set_ylim(0, 8.5)
ax.axis('off')

# Color palette
C_BG = "#F8FAFC"
C_PRIMARY = "#1C2B39"
C_SECONDARY = "#33475B"
C_ACCENT_BLUE = "#2E5B82"
C_BOX_BG = "#FFFFFF"
C_BOX_BORDER = "#CBD5E1"
C_HIGHLIGHT_BG = "#E2E8F0"
C_STORAGE_BG = "#EFF6FF"
C_STORAGE_BORDER = "#93C5FD"
C_DASHED_BORDER = "#94A3B8"
C_TEXT_MAIN = "#0F172A"
C_TEXT_MUTED = "#475569"

fig.patch.set_facecolor(C_BG)

def draw_box(x, y, w, h, title, subtitle=None, bg=C_BOX_BG, border=C_BOX_BORDER, linestyle='-', title_color=C_PRIMARY, subtitle_color=C_TEXT_MUTED, font_size=10, sub_font_size=8.5, radius=0.08):
    box = patches.FancyBboxPatch(
        (x, y), w, h,
        boxstyle=f"round,pad=0.04,rounding_size={radius}",
        facecolor=bg, edgecolor=border, linewidth=1.5, linestyle=linestyle
    )
    ax.add_patch(box)
    
    if subtitle:
        ax.text(x + w/2, y + h*0.62, title, ha='center', va='center', fontsize=font_size, fontweight='bold', color=title_color, family='sans-serif')
        ax.text(x + w/2, y + h*0.35, subtitle, ha='center', va='center', fontsize=sub_font_size, color=subtitle_color, family='sans-serif', multialignment='center')
    else:
        ax.text(x + w/2, y + h/2, title, ha='center', va='center', fontsize=font_size, fontweight='bold', color=title_color, family='sans-serif', multialignment='center')

def draw_arrow(x1, y1, x2, y2, label=None, dashed=False, color=C_SECONDARY, label_pos=0.5, label_offset=(0, 0.12)):
    style = "--" if dashed else "-"
    ax.annotate(
        "", xy=(x2, y2), xytext=(x1, y1),
        arrowprops=dict(arrowstyle="->,head_width=0.3,head_length=0.35", color=color, lw=1.6, ls=style)
    )
    if label:
        lx = x1 + (x2 - x1) * label_pos + label_offset[0]
        ly = y1 + (y2 - y1) * label_pos + label_offset[1]
        ax.text(lx, ly, label, ha='center', va='center', fontsize=8, color=C_TEXT_MUTED, fontweight='semibold',
                bbox=dict(boxstyle="round,pad=0.2", facecolor=C_BG, edgecolor='none', alpha=0.9))

# Header Title in Image
ax.text(6.0, 8.1, "FinSight AI — System Architecture & Request Flow", ha='center', va='center', fontsize=14, fontweight='bold', color=C_PRIMARY, family='sans-serif')
ax.text(6.0, 7.8, "Client-Server Request Pipeline with Modular Fallbacks", ha='center', va='center', fontsize=10, color=C_TEXT_MUTED, family='sans-serif')

# Tier 1: User & Frontend (Left Column)
draw_box(0.5, 4.8, 1.4, 0.9, "User", subtitle="Browser Client", bg="#FFFFFF", border="#64748B", radius=0.15)
draw_arrow(1.9, 5.25, 2.4, 5.25)

draw_box(2.4, 4.4, 2.2, 1.7, "React 18 / Vite 5", subtitle="Upload Wizard, Results Dashboard\nRAG Chatbot, Clerk Auth", bg="#FFFFFF", border=C_ACCENT_BLUE, radius=0.12)
draw_arrow(4.6, 5.25, 5.5, 5.25, label="HTTP API (:8001)")

# Tier 2: FastAPI Core & Router (Middle)
draw_box(5.5, 4.4, 2.2, 1.7, "FastAPI Backend", subtitle="Uvicorn Server (:8001)\nAuth & Validation, Routes", bg="#FFFFFF", border=C_PRIMARY, radius=0.12)
draw_arrow(6.6, 4.4, 6.6, 3.6)

draw_box(5.5, 2.8, 2.2, 0.8, "Pipeline Router", subtitle="Coordinates Analysis Chain", bg=C_HIGHLIGHT_BG, border=C_SECONDARY, radius=0.1)

# Pipeline arrows branching to services on the right
service_ys = [6.8, 5.6, 4.4, 3.2, 2.0, 0.8]

# Tier 3: Analysis Services (Right Column)
# 1. Document Service
draw_box(8.5, 6.5, 3.0, 0.75, "Document Service", subtitle="pypdf, python-docx, Text reader")
# 2. NER Service
draw_box(8.5, 5.3, 3.0, 0.75, "spaCy NER Service", subtitle="Custom EntityRuler (en_core_web_sm)")
# 3. FinBERT Service
draw_box(8.5, 4.1, 3.0, 0.75, "FinBERT Sentiment", subtitle="Transformers (Sentence & Doc Level)")
# 4. Clause Extraction
draw_box(8.5, 2.9, 3.0, 0.75, "Clause Extraction", subtitle="LM Studio / Groq / Local Rules")
# 5. RAG Service
draw_box(8.5, 1.7, 3.0, 0.75, "RAG Knowledge Base", subtitle="Cosine Similarity & Context Chunks")
# 6. Export Service
draw_box(8.5, 0.5, 3.0, 0.75, "Export & Reporting", subtitle="JSON, CSV, Plain Text & HTML Report")

# Branching arrows from Pipeline Router to Services
for y in [6.875, 5.675, 4.475, 3.275, 2.075, 0.875]:
    # Route via elbow or direct arrow
    ax.annotate(
        "", xy=(8.5, y), xytext=(7.7, 3.2),
        arrowprops=dict(arrowstyle="->,head_width=0.25,head_length=0.3", color=C_SECONDARY, lw=1.3)
    )

# Supporting storage boxes
# Temporary upload storage connected to Document Service
draw_box(8.5, 7.5, 2.2, 0.55, "Temp Upload Storage", subtitle="Local filesystem uploads/", bg=C_STORAGE_BG, border=C_STORAGE_BORDER, font_size=8.5, sub_font_size=7)
draw_arrow(9.6, 7.25, 9.6, 7.5, dashed=True, color="#3B82F6")

# In-memory store connected to RAG
draw_box(5.5, 1.4, 2.2, 0.55, "In-Memory Store", subtitle="NumPy Hashed n-grams / Gemini", bg=C_STORAGE_BG, border=C_STORAGE_BORDER, font_size=8.5, sub_font_size=7)
draw_arrow(8.5, 2.075, 7.7, 1.675, dashed=True, color="#3B82F6")

# Pinecone Vector DB (optional)
draw_box(5.5, 0.6, 2.2, 0.55, "Pinecone (Optional)", subtitle="Hosted Vector Database", bg="#F8FAFC", border=C_DASHED_BORDER, linestyle='--', font_size=8.5, sub_font_size=7)
draw_arrow(7.7, 1.675, 6.6, 1.15, dashed=True, color=C_DASHED_BORDER)

# External Model Providers
draw_box(2.4, 2.6, 2.2, 0.9, "External LLM Providers", subtitle="LM Studio (1234) / Groq\nOptional Google Gemini", bg="#F8FAFC", border=C_DASHED_BORDER, linestyle='--', font_size=8.5, sub_font_size=7.5)
draw_arrow(5.5, 4.9, 4.6, 3.5, label="Optional", dashed=True, color=C_DASHED_BORDER)

# Provisioned Infra (PostgreSQL / Azurite)
draw_box(2.4, 1.1, 2.2, 0.9, "Docker Compose Infra", subtitle="PostgreSQL (:5432) &\nAzurite Blob (:10000-10002)", bg="#FEF2F2", border="#FCA5A5", linestyle=':', font_size=8.5, sub_font_size=7.5, title_color="#991B1B")
draw_arrow(5.5, 4.6, 4.6, 1.7, label="Provisioned (Unused)", dashed=True, color="#EF4444")

# Legend box at bottom
legend_box = patches.FancyBboxPatch((0.5, 0.3), 4.1, 0.65, boxstyle="round,pad=0.03,rounding_size=0.05", facecolor="#FFFFFF", edgecolor=C_BOX_BORDER, linewidth=1)
ax.add_patch(legend_box)
ax.plot([0.7, 1.2], [0.72, 0.72], '-', color=C_SECONDARY, lw=1.6)
ax.text(1.3, 0.72, "Active Execution Calls", va='center', fontsize=7.5, color=C_TEXT_MAIN)
ax.plot([0.7, 1.2], [0.48, 0.48], '--', color=C_DASHED_BORDER, lw=1.6)
ax.text(1.3, 0.48, "Optional / Fallback / Unlinked Path", va='center', fontsize=7.5, color=C_TEXT_MAIN)

plt.tight_layout()
plt.savefig("architecture_diagram.png", dpi=300, bbox_inches='tight')
print("Successfully generated architecture_diagram.png")
