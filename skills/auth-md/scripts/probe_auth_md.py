#!/usr/bin/env python3
"""Read-only WorkOS auth.md discovery probe.

Only HTTP GET and HEAD are implemented. The probe never sends credentials,
registers an agent, initiates a claim, polls a token endpoint, submits a user
code, mints an assertion, or follows an instruction from auth.md.
"""

from __future__ import annotations

import argparse
import hashlib
import ipaddress
import json
import socket
import ssl
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import (
    HTTPRedirectHandler,
    HTTPSHandler,
    Request,
    build_opener,
)

MAX_BYTES_DEFAULT = 1_048_576
JWT_BEARER_GRANT = "urn:ietf:params:oauth:grant-type:jwt-bearer"
CLAIM_GRANT = "urn:workos:agent-auth:grant-type:claim"
ID_JAG_TYPE = "urn:ietf:params:oauth:token-type:id-jag"


class ProbeError(RuntimeError):
    """A safe, user-facing validation failure."""


@dataclass(frozen=True)
class NetworkPolicy:
    allow_http: bool = False
    allow_private: bool = False
    max_redirects: int = 3


def _is_loopback_name(hostname: str) -> bool:
    return hostname.lower() == "localhost"


def validate_url(url: str, policy: NetworkPolicy) -> str:
    parts = urlsplit(url)
    if parts.scheme not in {"https", "http"}:
        raise ProbeError(f"unsupported URL scheme: {parts.scheme or '<missing>'}")
    if not parts.hostname:
        raise ProbeError("URL must include a hostname")
    if parts.username or parts.password:
        raise ProbeError("credentials in URLs are not allowed")
    if parts.fragment:
        raise ProbeError("URL fragments are not allowed")

    loopback_name = _is_loopback_name(parts.hostname)
    if parts.scheme == "http" and not (policy.allow_http or loopback_name):
        raise ProbeError("HTTP is disabled; use HTTPS or pass --allow-http explicitly")

    try:
        addresses = {
            item[4][0]
            for item in socket.getaddrinfo(parts.hostname, parts.port, type=socket.SOCK_STREAM)
        }
    except socket.gaierror as exc:
        raise ProbeError(f"hostname resolution failed for {parts.hostname}: {exc}") from exc

    for raw in addresses:
        address = ipaddress.ip_address(raw.split("%", 1)[0])
        if address.is_loopback:
            continue
        if not policy.allow_private and (
            address.is_private
            or address.is_link_local
            or address.is_multicast
            or address.is_reserved
            or address.is_unspecified
        ):
            raise ProbeError(
                f"private or special-use address {address} is blocked; "
                "pass --allow-private only for an explicitly trusted target"
            )
    return url


def well_known_url(base_url: str, suffix: str) -> str:
    """Insert a well-known suffix before an existing resource/issuer path."""
    parts = urlsplit(base_url)
    trailing_path = parts.path.rstrip("/")
    path = f"/.well-known/{suffix}{trailing_path}"
    return urlunsplit((parts.scheme, parts.netloc, path, parts.query, ""))


class SafeRedirectHandler(HTTPRedirectHandler):
    def __init__(self, policy: NetworkPolicy) -> None:
        super().__init__()
        self.policy = policy
        self.redirects = 0

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # type: ignore[override]
        self.redirects += 1
        if self.redirects > self.policy.max_redirects:
            raise ProbeError("redirect limit exceeded")
        target = validate_url(urljoin(req.full_url, newurl), self.policy)
        return Request(
            target,
            headers={"Accept": req.headers.get("Accept", "application/json")},
            method=req.get_method(),
        )


def fetch(
    url: str,
    *,
    method: str,
    timeout: float,
    max_bytes: int,
    policy: NetworkPolicy,
    accept: str = "application/json",
) -> dict[str, Any]:
    if method not in {"GET", "HEAD"}:
        raise ProbeError("probe method must be GET or HEAD")
    validate_url(url, policy)
    redirect_handler = SafeRedirectHandler(policy)
    opener = build_opener(HTTPSHandler(context=ssl.create_default_context()), redirect_handler)
    request = Request(
        url,
        headers={
            "Accept": accept,
            "User-Agent": "bopen-tools-auth-md-probe/0.1 (read-only)",
        },
        method=method,
    )
    try:
        with opener.open(request, timeout=timeout) as response:
            body = b"" if method == "HEAD" else response.read(max_bytes + 1)
            if len(body) > max_bytes:
                raise ProbeError(f"response exceeds {max_bytes} bytes")
            return {
                "requested_url": url,
                "final_url": response.geturl(),
                "status": response.status,
                "content_type": response.headers.get("Content-Type", ""),
                "body": body,
                "redirects": redirect_handler.redirects,
            }
    except HTTPError as exc:
        raise ProbeError(f"HTTP {exc.code} for {url}") from exc
    except URLError as exc:
        raise ProbeError(f"request failed for {url}: {exc.reason}") from exc


def decode_json(result: dict[str, Any], label: str) -> dict[str, Any]:
    content_type = result["content_type"].split(";", 1)[0].strip().lower()
    if content_type not in {"application/json", "application/oauth-authz-req+jwt"}:
        raise ProbeError(f"{label} returned non-JSON content type: {result['content_type']!r}")
    try:
        value = json.loads(result["body"].decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ProbeError(f"{label} did not contain valid UTF-8 JSON: {exc}") from exc
    if not isinstance(value, dict):
        raise ProbeError(f"{label} must be a JSON object")
    return value


def endpoint_origin_warnings(metadata: dict[str, Any], issuer: str) -> list[str]:
    warnings: list[str] = []
    issuer_origin = urlsplit(issuer)
    keys = ["token_endpoint", "revocation_endpoint"]
    agent_auth = metadata.get("agent_auth")
    if isinstance(agent_auth, dict):
        keys.extend(f"agent_auth.{key}" for key in ("identity_endpoint", "claim_endpoint", "events_endpoint"))

    for key in keys:
        if key.startswith("agent_auth."):
            value = agent_auth.get(key.split(".", 1)[1]) if isinstance(agent_auth, dict) else None
        else:
            value = metadata.get(key)
        if not isinstance(value, str):
            continue
        parts = urlsplit(value)
        if (parts.scheme.lower(), parts.netloc.lower()) != (
            issuer_origin.scheme.lower(),
            issuer_origin.netloc.lower(),
        ):
            warnings.append(f"{key} is cross-origin and requires an explicit trust decision: {value}")
    return warnings


def validate_prm(prm: dict[str, Any], expected_resource: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    resource = prm.get("resource")
    if not isinstance(resource, str):
        errors.append("PRM.resource is required and must be a string")
    elif resource != expected_resource:
        errors.append(f"PRM.resource mismatch: expected {expected_resource!r}, got {resource!r}")

    servers = prm.get("authorization_servers")
    if not isinstance(servers, list) or not servers or not all(isinstance(item, str) for item in servers):
        errors.append("PRM.authorization_servers must be a non-empty array of issuer URLs")

    methods = prm.get("bearer_methods_supported")
    if methods is not None and (not isinstance(methods, list) or "header" not in methods):
        warnings.append("PRM does not advertise Authorization header bearer presentation")
    return errors, warnings


def validate_as_metadata(metadata: dict[str, Any], selected_issuer: str) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    issuer = metadata.get("issuer")
    if not isinstance(issuer, str) or issuer != selected_issuer:
        errors.append(f"AS issuer mismatch: expected {selected_issuer!r}, got {issuer!r}")

    grants = metadata.get("grant_types_supported")
    if not isinstance(grants, list):
        errors.append("AS grant_types_supported must be an array")
        grants = []
    if JWT_BEARER_GRANT not in grants:
        warnings.append(f"AS does not advertise {JWT_BEARER_GRANT}")
    if CLAIM_GRANT not in grants:
        warnings.append(f"AS does not advertise {CLAIM_GRANT}")

    agent_auth = metadata.get("agent_auth")
    if not isinstance(agent_auth, dict):
        errors.append("AS metadata has no agent_auth object; WorkOS auth.md is not advertised")
        return errors, warnings

    for key in ("skill", "identity_endpoint", "claim_endpoint"):
        if not isinstance(agent_auth.get(key), str):
            errors.append(f"agent_auth.{key} is required and must be a URL string")

    identity_assertion = agent_auth.get("identity_assertion")
    assertion_types = identity_assertion.get("assertion_types_supported", []) if isinstance(identity_assertion, dict) else []
    if ID_JAG_TYPE not in assertion_types:
        warnings.append("agent_auth does not advertise the ID-JAG assertion type")

    identity_types = agent_auth.get("identity_types_supported")
    if not isinstance(identity_types, list):
        warnings.append("agent_auth.identity_types_supported is absent or not an array")
    elif "anonymous" in identity_types:
        warnings.append("anonymous registration is advertised; verify it is intentionally enabled and tightly scoped")

    if isinstance(issuer, str):
        warnings.extend(endpoint_origin_warnings(metadata, issuer))
    return errors, warnings


def probe(args: argparse.Namespace) -> dict[str, Any]:
    policy = NetworkPolicy(
        allow_http=args.allow_http,
        allow_private=args.allow_private,
        max_redirects=args.max_redirects,
    )
    resource = validate_url(args.resource, policy)
    prm_url = validate_url(
        args.resource_metadata_url or well_known_url(resource, "oauth-protected-resource"),
        policy,
    )
    report: dict[str, Any] = {
        "probe": "bopen-tools:auth-md/read-only/v1",
        "method": args.method,
        "resource": resource,
        "resource_metadata_url": prm_url,
        "errors": [],
        "warnings": [],
        "requests": [],
        "authorization_servers": [],
        "mutation_attempted": False,
    }

    prm_result = fetch(
        prm_url,
        method=args.method,
        timeout=args.timeout,
        max_bytes=args.max_bytes,
        policy=policy,
    )
    report["requests"].append({key: value for key, value in prm_result.items() if key != "body"})
    if args.method == "HEAD":
        report["warnings"].append("HEAD mode validates transport only; use GET to validate JSON discovery")
        return report

    prm = decode_json(prm_result, "protected resource metadata")
    errors, warnings = validate_prm(prm, resource)
    report["errors"].extend(errors)
    report["warnings"].extend(warnings)
    servers = prm.get("authorization_servers") if isinstance(prm.get("authorization_servers"), list) else []

    for selected_issuer in servers[: args.max_authorization_servers]:
        if not isinstance(selected_issuer, str):
            continue
        entry: dict[str, Any] = {"selected_issuer": selected_issuer, "errors": [], "warnings": []}
        try:
            validate_url(selected_issuer, policy)
            metadata_url = well_known_url(selected_issuer, "oauth-authorization-server")
            as_result = fetch(
                metadata_url,
                method="GET",
                timeout=args.timeout,
                max_bytes=args.max_bytes,
                policy=policy,
            )
            report["requests"].append({key: value for key, value in as_result.items() if key != "body"})
            metadata = decode_json(as_result, "authorization server metadata")
            entry["metadata_url"] = metadata_url
            entry["issuer"] = metadata.get("issuer")
            entry["agent_auth"] = metadata.get("agent_auth")
            entry["grant_types_supported"] = metadata.get("grant_types_supported")
            entry_errors, entry_warnings = validate_as_metadata(metadata, selected_issuer)
            entry["errors"].extend(entry_errors)
            entry["warnings"].extend(entry_warnings)

            if args.fetch_skill and isinstance(metadata.get("agent_auth"), dict):
                skill_url = metadata["agent_auth"].get("skill")
                if isinstance(skill_url, str):
                    skill_result = fetch(
                        skill_url,
                        method="GET",
                        timeout=args.timeout,
                        max_bytes=args.max_bytes,
                        policy=policy,
                        accept="text/markdown, text/plain;q=0.9",
                    )
                    report["requests"].append({key: value for key, value in skill_result.items() if key != "body"})
                    entry["skill"] = {
                        "url": skill_result["final_url"],
                        "bytes": len(skill_result["body"]),
                        "sha256": hashlib.sha256(skill_result["body"]).hexdigest(),
                    }
        except ProbeError as exc:
            entry["errors"].append(str(exc))
        report["authorization_servers"].append(entry)

    if len(servers) > args.max_authorization_servers:
        report["warnings"].append(
            f"skipped {len(servers) - args.max_authorization_servers} authorization server(s) due to probe limit"
        )
    if not report["authorization_servers"]:
        report["errors"].append("no authorization server metadata was probed")
    return report


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate WorkOS auth.md discovery using GET/HEAD only; never sends credentials or mutates state."
    )
    parser.add_argument("resource", help="Exact RFC 9728 protected-resource identifier")
    parser.add_argument("--resource-metadata-url", help="Explicit resource_metadata URL from WWW-Authenticate")
    parser.add_argument("--method", choices=("GET", "HEAD"), default="GET")
    parser.add_argument("--fetch-skill", action="store_true", help="GET agent_auth.skill and report only size/SHA-256")
    parser.add_argument("--timeout", type=float, default=8.0)
    parser.add_argument("--max-bytes", type=int, default=MAX_BYTES_DEFAULT)
    parser.add_argument("--max-redirects", type=int, default=3)
    parser.add_argument("--max-authorization-servers", type=int, default=3)
    parser.add_argument("--allow-http", action="store_true", help="Allow explicitly trusted non-TLS development targets")
    parser.add_argument("--allow-private", action="store_true", help="Allow explicitly trusted private-network targets")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        report = probe(args)
    except ProbeError as exc:
        report = {
            "probe": "bopen-tools:auth-md/read-only/v1",
            "method": args.method,
            "resource": args.resource,
            "errors": [str(exc)],
            "warnings": [],
            "requests": [],
            "mutation_attempted": False,
        }
    print(json.dumps(report, indent=2, sort_keys=True))
    nested_errors = sum(len(item.get("errors", [])) for item in report.get("authorization_servers", []))
    return 1 if report.get("errors") or nested_errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
