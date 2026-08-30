import copy
import unittest

from research_analysis import (
    ResearchValidationFailure,
    derive_research_items,
    validate_research_analysis,
)


def evidence():
    return [{"quote": "example", "section": "1A", "explanation": "reason"}]


def valid_v03():
    return {
        "schema_version": "0.3",
        "song": {"id": "song-1", "title": "Title", "artist": "Artist"},
        "techniques": [{
            "name": "Technique", "category": "wording", "description": "Description",
            "why_it_works": "Effect", "evidence": evidence(), "reuse_hint": "Hint", "tags": [],
        }],
        "constructions": [{
            "expression": "although", "kind": "connection", "description": "Description",
            "effect": "Effect", "evidence": evidence(), "reuse_hint": "Hint", "tags": [],
        }, {
            "expression": "only", "kind": "modification", "description": "Description",
            "effect": "Effect", "evidence": evidence(), "reuse_hint": "Hint", "tags": [],
        }],
        "sentence_endings": [{
            "expression": "perhaps", "description": "Description", "effect": "Effect",
            "evidence": evidence(), "reuse_hint": "Hint", "tags": [],
        }],
        "phrases": [{
            "phrase": "a phrase", "section": None, "description": "Description",
            "reuse_hint": "Hint", "tags": [],
        }],
    }


class ResearchAnalysisV03Tests(unittest.TestCase):
    def assert_invalid(self, payload):
        with self.assertRaises(ResearchValidationFailure):
            validate_research_analysis(payload)

    def test_valid_full_json_and_mapping(self):
        rows = derive_research_items(validate_research_analysis(valid_v03()))
        self.assertEqual(
            [row["item_type"] for row in rows],
            ["technique", "connection", "modifier", "sentence_ending", "notable_phrase"],
        )

    def test_all_arrays_may_be_empty(self):
        payload = valid_v03()
        for key in ("techniques", "constructions", "sentence_endings", "phrases"):
            payload[key] = []
        validate_research_analysis(payload)

    def test_unknown_field_rejected(self):
        payload = valid_v03(); payload["summary"] = {}
        self.assert_invalid(payload)

    def test_technique_evidence_required(self):
        payload = valid_v03(); payload["techniques"][0]["evidence"] = []
        self.assert_invalid(payload)

    def test_construction_evidence_required(self):
        payload = valid_v03(); payload["constructions"][0]["evidence"] = []
        self.assert_invalid(payload)

    def test_sentence_ending_evidence_required(self):
        payload = valid_v03(); payload["sentence_endings"][0]["evidence"] = []
        self.assert_invalid(payload)

    def test_invalid_kind_rejected(self):
        payload = valid_v03(); payload["constructions"][0]["kind"] = "theme"
        self.assert_invalid(payload)

    def test_wrong_schema_version_rejected(self):
        payload = valid_v03(); payload["schema_version"] = "0.4"
        self.assert_invalid(payload)

    def test_v02_remains_valid(self):
        from test_research_analysis import valid_payload
        validate_research_analysis(copy.deepcopy(valid_payload()))


if __name__ == "__main__":
    unittest.main()
