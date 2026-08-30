import os
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from research_auth import require_research_admin_token


class ResearchAdminTokenTests(unittest.TestCase):
    def test_rejects_when_server_token_is_not_configured(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(HTTPException) as caught:
                require_research_admin_token(None)
        self.assertEqual(caught.exception.status_code, 503)

    def test_rejects_missing_header(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "server-secret"}, clear=True):
            with self.assertRaises(HTTPException) as caught:
                require_research_admin_token(None)
        self.assertEqual(caught.exception.status_code, 401)

    def test_rejects_incorrect_token(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "server-secret"}, clear=True):
            with self.assertRaises(HTTPException) as caught:
                require_research_admin_token("incorrect-secret")
        self.assertEqual(caught.exception.status_code, 401)

    def test_accepts_matching_token(self):
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": "server-secret"}, clear=True):
            self.assertIsNone(require_research_admin_token("server-secret"))

    def test_responses_do_not_expose_token_values(self):
        server_token = "server-secret-that-must-not-leak"
        supplied_token = "client-secret-that-must-not-leak"
        with patch.dict(os.environ, {"RESEARCH_ADMIN_TOKEN": server_token}, clear=True):
            with self.assertRaises(HTTPException) as caught:
                require_research_admin_token(supplied_token)
        detail = str(caught.exception.detail)
        self.assertNotIn(server_token, detail)
        self.assertNotIn(supplied_token, detail)


if __name__ == "__main__":
    unittest.main()
