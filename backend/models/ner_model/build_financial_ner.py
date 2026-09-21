import json
import os
from pathlib import Path
import spacy
from spacy.pipeline import EntityRuler

def build_custom_financial_ner():
    base_dir = Path(__file__).parent
    annotations_path = base_dir / "annotations.json"
    output_path = base_dir / "model-best"
    
    print(f"Loading base spaCy model 'en_core_web_sm'...")
    nlp = spacy.load("en_core_web_sm")
    
    print(f"Loading annotations from {annotations_path}...")
    with open(annotations_path, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    # Extract distinct patterns for financial entities
    patterns = []
    seen = set()
    
    for item in data:
        text = item["text"]
        for ent in item.get("entities", []):
            label = ent["label"]
            start = ent["start"]
            end = ent["end"]
            phrase = text[start:end].strip()
            
            if phrase and (label, phrase.lower()) not in seen:
                seen.add((label, phrase.lower()))
                patterns.append({"label": label, "pattern": phrase})
    
    print(f"Extracted {len(patterns)} unique financial entity patterns.")
    
    # Add common financial regex-like / token patterns
    additional_patterns = [
        {"label": "PAYMENT_TERM", "pattern": [{"LOWER": "within"}, {"LIKE_NUM": True}, {"LOWER": {"IN": ["days", "business", "months", "weeks"]}}]},
        {"label": "PAYMENT_TERM", "pattern": [{"LOWER": "net"}, {"LIKE_NUM": True}]},
        {"label": "INTEREST_RATE", "pattern": [{"LIKE_NUM": True}, {"TEXT": "%"}, {"LOWER": "per"}, {"LOWER": "annum"}]},
        {"label": "INTEREST_RATE", "pattern": [{"LIKE_NUM": True}, {"TEXT": "%"}, {"LOWER": "interest"}]},
        {"label": "PENALTY", "pattern": [{"LIKE_NUM": True}, {"TEXT": "%"}, {"LOWER": "penalty"}]},
        {"label": "PENALTY", "pattern": [{"LOWER": "late"}, {"LOWER": "fee"}, {"LOWER": "of"}, {"TEXT": "$"}]},
        {"label": "COLLATERAL", "pattern": [{"LOWER": "real"}, {"LOWER": "estate"}]},
        {"label": "COLLATERAL", "pattern": [{"LOWER": "pledged"}, {"LOWER": "securities"}]},
        {"label": "DURATION", "pattern": [{"LOWER": "period"}, {"LOWER": "of"}, {"LIKE_NUM": True}, {"LOWER": {"IN": ["years", "months", "days"]}}]}
    ]
    patterns.extend(additional_patterns)
    
    # Add ruler to spaCy pipeline
    ruler = nlp.add_pipe("entity_ruler", before="ner")
    ruler.add_patterns(patterns)
    
    # Save model
    output_path.mkdir(parents=True, exist_ok=True)
    nlp.to_disk(output_path)
    print(f"Custom Financial NER model successfully created and saved to: {output_path}")
    
    # Test model
    test_text = "Acme Corp shall pay John Doe USD 5,000,000 within 30 days. Late penalty of 2% applies with interest rate at 6% per annum."
    doc = nlp(test_text)
    print("\nVerification Inference:")
    for ent in doc.ents:
        print(f"  - [{ent.label_}]: {ent.text}")

if __name__ == "__main__":
    build_custom_financial_ner()
