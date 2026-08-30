import unittest

from research_analysis import (
    ResearchValidationFailure,
    derive_research_items,
    validate_research_analysis,
)


def valid_payload() -> dict:
    return {
        "schema_version": "0.2",
        "song": {"id": "song-1", "title": "Title", "artist": "Artist"},
        "summary": {"overview": "overview", "key_insights": ["insight"]},
        "techniques": [{
            "name": "Sound chain",
            "category": "sound",
            "description": "description",
            "why_it_works": "effect",
            "evidence": [{"quote": "example"}],
            "reuse_hint": "hint",
            "tags": ["rhyme"],
        }],
        "expression_patterns": {
            "sentence_endings": [],
            "connections": [],
            "modifiers": [],
            "notable_phrases": [],
        },
        "motifs": [{
            "name": "water",
            "elements": [{"text": "rain"}],
            "development": "development",
            "shared_principle": "water",
            "function": "function",
        }],
        "structure": {
            "overview": "",
            "repetition_and_variation": "",
            "viewpoint_flow": "",
            "abstract_concrete_flow": "",
        },
        "takeaways": [],
    }


class ResearchAnalysisValidationTests(unittest.TestCase):
    def test_valid_v02_and_derivation(self):
        analysis = validate_research_analysis(valid_payload())
        types = {item["item_type"] for item in derive_research_items(analysis)}
        self.assertIn("technique", types)
        self.assertIn("motif", types)

    def test_rejects_unknown_fields(self):
        payload = valid_payload()
        payload["unknown"] = True
        with self.assertRaises(ResearchValidationFailure) as caught:
            validate_research_analysis(payload)
        self.assertIn("$.unknown", str(caught.exception))

    def test_requires_technique_evidence(self):
        payload = valid_payload()
        payload["techniques"][0]["evidence"] = []
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)

    def test_requires_expression_evidence(self):
        payload = valid_payload()
        payload["expression_patterns"]["modifiers"] = [{
            "expression": "ほんの",
            "description": "",
            "effect": "",
            "evidence": [],
            "reuse_hint": "",
            "tags": [],
        }]
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)

    def test_requires_motif_elements(self):
        payload = valid_payload()
        payload["motifs"][0]["elements"] = []
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)

    def test_rejects_other_schema_versions(self):
        payload = valid_payload()
        payload["schema_version"] = "0.1"
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)


if __name__ == "__main__":
    unittest.main()
