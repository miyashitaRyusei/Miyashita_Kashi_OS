import unittest
from unittest.mock import patch

import db


class FakeResult:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, data):
        self.data = data
        self.calls = []

    def select(self, columns):
        self.calls.append(("select", columns))
        return self

    def eq(self, column, value):
        self.calls.append(("eq", column, value))
        return self

    def order(self, column, desc=False):
        self.calls.append(("order", column, desc))
        return self

    def or_(self, expression):
        self.calls.append(("or", expression))
        return self

    def execute(self):
        self.calls.append(("execute",))
        rows = self.data
        for call in self.calls:
            if call[:2] == ("eq", "song_research_analyses.is_active"):
                rows = [
                    row for row in rows
                    if row.get("song_research_analyses", {}).get("is_active") is call[2]
                ]
            elif call[:2] == ("eq", "item_type"):
                rows = [row for row in rows if row.get("item_type") == call[2]]
        return FakeResult(rows)


class FakeSupabase:
    def __init__(self, data):
        self.query = FakeQuery(data)

    def table(self, table_name):
        self.query.calls.append(("table", table_name))
        return self.query


class ResearchItemsQueryTests(unittest.TestCase):
    def test_default_query_filters_to_active_analysis(self):
        client = FakeSupabase([{
            "id": "item-1",
            "item_type": "technique",
            "song_research_analyses": {"is_active": True},
        }])

        with patch("db.get_server_supabase", return_value=client):
            rows = db.get_research_items(item_type="technique")

        self.assertIn(
            ("select", "*, song_research_analyses!inner(is_active), songs(title,artist,reference_tier)"),
            client.query.calls,
        )
        self.assertIn(
            ("eq", "song_research_analyses.is_active", True),
            client.query.calls,
        )
        self.assertIn(("eq", "item_type", "technique"), client.query.calls)
        self.assertNotIn("song_research_analyses", rows[0])

    def test_include_inactive_returns_all_versions_without_active_filter(self):
        source_rows = [
            {"id": "active-item", "item_type": "technique"},
            {"id": "inactive-item", "item_type": "technique"},
        ]
        client = FakeSupabase(source_rows)

        with patch("db.get_server_supabase", return_value=client):
            rows = db.get_research_items(
                item_type="technique",
                include_inactive=True,
            )

        self.assertIn(("select", "*, songs(title,artist,reference_tier)"), client.query.calls)
        self.assertNotIn(
            ("eq", "song_research_analyses.is_active", True),
            client.query.calls,
        )
        self.assertEqual([row["id"] for row in rows], ["active-item", "inactive-item"])

    def test_duplicate_versions_return_eight_active_techniques(self):
        active_rows = [
            {
                "id": f"active-{index}",
                "item_type": "technique",
                "song_research_analyses": {"is_active": True},
            }
            for index in range(8)
        ]
        inactive_rows = [
            {
                "id": f"inactive-{index}",
                "item_type": "technique",
                "song_research_analyses": {"is_active": False},
            }
            for index in range(8)
        ]
        client = FakeSupabase(active_rows + inactive_rows)

        with patch("db.get_server_supabase", return_value=client):
            rows = db.get_research_items(item_type="technique")

        self.assertEqual(len(rows), 8)
        self.assertTrue(all(row["id"].startswith("active-") for row in rows))


if __name__ == "__main__":
    unittest.main()
