import copy
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


def expression_pattern() -> dict:
    return {
        "expression": "and",
        "description": "description",
        "effect": "effect",
        "evidence": [{"quote": "example"}],
        "reuse_hint": "hint",
        "tags": [],
    }


def takeaway(index: int) -> dict:
    return {
        "title": f"Takeaway {index}",
        "description": "description",
        "how_to_use": "exercise",
        "avoid_copying": "change the image and situation",
    }


class ResearchAnalysisValidationTests(unittest.TestCase):
    def assert_invalid(self, payload: dict) -> None:
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)

    def test_accepts_valid_v02_and_derives_items(self):
        analysis = validate_research_analysis(valid_payload())
        types = {item["item_type"] for item in derive_research_items(analysis)}
        self.assertIn("technique", types)
        self.assertIn("motif", types)

    def test_accepts_empty_techniques(self):
        payload = valid_payload()
        payload["techniques"] = []
        validate_research_analysis(payload)

    def test_accepts_empty_motifs(self):
        payload = valid_payload()
        payload["motifs"] = []
        validate_research_analysis(payload)

    def test_accepts_zero_takeaways(self):
        payload = valid_payload()
        payload["takeaways"] = []
        validate_research_analysis(payload)

    def test_accepts_five_takeaways(self):
        payload = valid_payload()
        payload["takeaways"] = [takeaway(index) for index in range(5)]
        validate_research_analysis(payload)

    def test_rejects_schema_version_01(self):
        payload = valid_payload()
        payload["schema_version"] = "0.1"
        self.assert_invalid(payload)

    def test_rejects_unknown_fields(self):
        payload = valid_payload()
        payload["unknown"] = True
        with self.assertRaises(ResearchValidationFailure) as caught:
            validate_research_analysis(payload)
        self.assertIn("$.unknown", str(caught.exception))

    def test_rejects_unknown_technique_category(self):
        payload = valid_payload()
        payload["techniques"][0]["category"] = "theme"
        self.assert_invalid(payload)

    def test_requires_technique_evidence(self):
        payload = valid_payload()
        payload["techniques"][0]["evidence"] = []
        self.assert_invalid(payload)

    def test_requires_sentence_ending_evidence(self):
        payload = valid_payload()
        pattern = expression_pattern()
        pattern["evidence"] = []
        payload["expression_patterns"]["sentence_endings"] = [pattern]
        self.assert_invalid(payload)

    def test_requires_connection_evidence(self):
        payload = valid_payload()
        pattern = expression_pattern()
        pattern["evidence"] = []
        payload["expression_patterns"]["connections"] = [pattern]
        self.assert_invalid(payload)

    def test_requires_modifier_evidence(self):
        payload = valid_payload()
        pattern = expression_pattern()
        pattern["evidence"] = []
        payload["expression_patterns"]["modifiers"] = [pattern]
        self.assert_invalid(payload)

    def test_requires_motif_elements(self):
        payload = valid_payload()
        payload["motifs"][0]["elements"] = []
        self.assert_invalid(payload)

    def test_rejects_six_takeaways(self):
        payload = valid_payload()
        payload["takeaways"] = [takeaway(index) for index in range(6)]
        self.assert_invalid(payload)

    def test_fixture_factory_returns_independent_data(self):
        first = valid_payload()
        second = copy.deepcopy(first)
        second["techniques"] = []
        self.assertEqual(len(first["techniques"]), 1)


if __name__ == "__main__":
    unittest.main()
