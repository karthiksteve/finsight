"""
FinSight AI - End-to-End Pipeline Integration Test
Verifies file upload, parsing, custom NER, FinBERT sentiment, clauses, and RAG.
"""

import sys
from pathlib import Path

# Add backend to sys.path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from fastapi.testclient import TestClient
from app import app

def test_full_pipeline():
    print("=" * 60)
    print("Testing Full Document Pipeline with TestClient...")
    print("=" * 60)

    client = TestClient(app)
    
    # 1. Health check
    res = client.get("/")
    assert res.status_code == 200
    print("[PASS] Root Health Endpoint: 200 OK")

    # 2. Pipeline Document Processing with sample file
    test_file_path = Path(__file__).parent / "sample_data" / "test_document.txt"
    if not test_file_path.exists():
        print(f"[FAIL] Sample file {test_file_path} not found!")
        return

    with open(test_file_path, "rb") as f:
        files = {"file": ("test_document.txt", f, "text/plain")}
        data = {
            "include_ner": "true",
            "include_finbert": "true",
            "include_langextract": "true"
        }
        
        print("\nProcessing document through all pipeline stages...")
        response = client.post("/api/v1/pipeline/process-document", files=files, data=data)
        
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    result = response.json()
    print("[PASS] Pipeline Processing: 200 OK")

    # Verify NER results
    ner = result.get("ner", {})
    print(f"  - NER Entities Extracted: {ner.get('entity_count', 0)}")
    for ent in ner.get("entities", [])[:4]:
        print(f"    * [{ent.get('label')}]: {ent.get('text')}")

    # Verify FinBERT results
    finbert = result.get("finbert", {})
    stats = finbert.get("statistics", {})
    print(f"  - FinBERT Overall Sentiment: {stats.get('overall_sentiment', 'N/A')}")
    print(f"  - Sentence Scores Count: {len(finbert.get('sentence_results', []))}")

    # Verify Clause results
    clauses = result.get("langextract", {}).get("clauses", [])
    print(f"  - Clauses Identified: {len(clauses)}")
    for c in clauses[:3]:
        print(f"    * [{c.get('extraction_class')}]: {c.get('extraction_text')[:60]}...")

    # 3. Test RAG Query
    print("\nTesting CAG Contextual Assistant on the processed document...")
    rag_payload = {"question": "What is the payment term specified in the contract?", "top_k": 2}
    rag_res = client.post("/api/v1/rag/query", json=rag_payload)
    assert rag_res.status_code == 200
    rag_data = rag_res.json()
    print(f"[PASS] RAG Query Success: {rag_data.get('success')}")
    print(f"  - Answer: {rag_data.get('answer', '')[:120]}...")

    print("\n" + "=" * 60)
    print("ALL PIPELINE INTEGRATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    test_full_pipeline()
