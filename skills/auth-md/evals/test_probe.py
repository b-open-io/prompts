#!/usr/bin/env python3
"""Deterministic local tests for the auth.md read-only discovery probe."""

from __future__ import annotations

import json
import subprocess
import sys
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SCRIPT = Path(__file__).parents[1] / "scripts" / "probe_auth_md.py"


class Handler(BaseHTTPRequestHandler):
    methods: list[str] = []
    resource_override: str | None = None

    def log_message(self, format: str, *args: object) -> None:
        return

    def _json(self, value: dict[str, object], include_body: bool = True) -> None:
        body = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if include_body:
            self.wfile.write(body)

    def do_GET(self) -> None:
        type(self).methods.append("GET")
        origin = f"http://127.0.0.1:{self.server.server_port}"
        if self.path == "/.well-known/oauth-protected-resource/api":
            self._json(
                {
                    "resource": type(self).resource_override or f"{origin}/api",
                    "authorization_servers": [origin],
                    "scopes_supported": ["api.read"],
                    "bearer_methods_supported": ["header"],
                }
            )
            return
        if self.path == "/.well-known/oauth-authorization-server":
            self._json(
                {
                    "issuer": origin,
                    "token_endpoint": f"{origin}/oauth2/token",
                    "revocation_endpoint": f"{origin}/oauth2/revoke",
                    "grant_types_supported": [
                        "urn:ietf:params:oauth:grant-type:jwt-bearer",
                        "urn:workos:agent-auth:grant-type:claim",
                    ],
                    "agent_auth": {
                        "skill": f"{origin}/auth.md",
                        "identity_endpoint": f"{origin}/agent/identity",
                        "claim_endpoint": f"{origin}/agent/identity/claim",
                        "identity_types_supported": ["identity_assertion", "service_auth"],
                        "identity_assertion": {
                            "assertion_types_supported": [
                                "urn:ietf:params:oauth:token-type:id-jag"
                            ]
                        },
                    },
                }
            )
            return
        self.send_error(404)

    def do_HEAD(self) -> None:
        type(self).methods.append("HEAD")
        if self.path == "/.well-known/oauth-protected-resource/api":
            self._json({}, include_body=False)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        type(self).methods.append("POST")
        self.send_error(405)


class ProbeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.origin = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls) -> None:
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def setUp(self) -> None:
        Handler.methods = []
        Handler.resource_override = None

    def run_probe(self, *extra: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), f"{self.origin}/api", "--allow-http", *extra],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )

    def test_get_validates_prm_and_as_metadata_without_mutation(self) -> None:
        result = self.run_probe()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertFalse(report["mutation_attempted"])
        self.assertEqual(report["errors"], [])
        self.assertEqual(len(report["authorization_servers"]), 1)
        self.assertNotIn("POST", Handler.methods)
        self.assertEqual(Handler.methods, ["GET", "GET"])

    def test_head_performs_transport_check_only(self) -> None:
        result = self.run_probe("--method", "HEAD")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertIn("transport only", report["warnings"][0])
        self.assertEqual(Handler.methods, ["HEAD"])
        self.assertNotIn("POST", Handler.methods)

    def test_resource_mismatch_fails_closed(self) -> None:
        Handler.resource_override = f"{self.origin}/attacker"
        result = self.run_probe()
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(any("resource mismatch" in error for error in report["errors"]))
        self.assertNotIn("POST", Handler.methods)

    def test_cli_rejects_any_non_read_method(self) -> None:
        result = self.run_probe("--method", "POST")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(Handler.methods, [])

    def test_url_credentials_are_rejected_before_network(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SCRIPT), f"http://user:secret@127.0.0.1:{self.server.server_port}/api", "--allow-http"],
            check=False,
            capture_output=True,
            text=True,
            timeout=5,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("credentials in URLs are not allowed", result.stdout)
        self.assertEqual(Handler.methods, [])


if __name__ == "__main__":
    unittest.main()
