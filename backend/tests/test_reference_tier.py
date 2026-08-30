import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

import main


class ReferenceTierEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.path = "/api/songs/song-1/reference-tier"

    def test_missing_env_fails_closed(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(self.client.patch(self.path, json={"reference_tier": "core"}).status_code, 503)

    def test_no_token_and_wrong_token_are_rejected(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "secret"}, clear=True):
            self.assertEqual(self.client.patch(self.path, json={"reference_tier": "core"}).status_code, 401)
            self.assertEqual(self.client.patch(self.path, headers={"X-Research-Admin-Token": "wrong"}, json={"reference_tier": "core"}).status_code, 401)

    def test_invalid_tier_is_rejected(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "secret"}, clear=True):
            response = self.client.patch(self.path, headers={"X-Research-Admin-Token": "secret"}, json={"reference_tier": "favorite"})
        self.assertEqual(response.status_code, 422)

    def test_missing_song_returns_404(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "secret"}, clear=True), patch("main.db.update_song_reference_tier", return_value=None):
            response = self.client.patch(self.path, headers={"X-Research-Admin-Token": "secret"}, json={"reference_tier": "archive"})
        self.assertEqual(response.status_code, 404)

    def test_success_returns_updated_song(self):
        updated = {"id": "song-1", "reference_tier": "selected"}
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "secret"}, clear=True), patch("main.db.update_song_reference_tier", return_value=updated):
            response = self.client.patch(self.path, headers={"X-Research-Admin-Token": "secret"}, json={"reference_tier": "selected"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], updated)


if __name__ == "__main__":
    unittest.main()
