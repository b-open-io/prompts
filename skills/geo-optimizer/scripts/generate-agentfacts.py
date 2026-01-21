#!/usr/bin/env python3
"""
AgentFacts Generator - Create NANDA-compliant JSON-LD schema.

Usage:
    python generate-agentfacts.py --domain example.com
    python generate-agentfacts.py --domain example.com --agent-name "My Service" --capabilities text,image
    python generate-agentfacts.py --validate https://example.com/.well-known/agent-facts
"""

import argparse
import json
import sys
from datetime import datetime

try:
    import requests
except ImportError:
    requests = None  # Will auto-install if validation is used


def generate_agent_facts(
    domain: str,
    agent_name: str = None,
    description: str = None,
    capabilities: list = None,
    auth_methods: list = None,
    endpoints: list = None,
    human_oversight: str = "true",
) -> dict:
    """Generate NANDA-compliant AgentFacts schema."""

    # Defaults
    if agent_name is None:
        agent_name = domain.replace(".", " ").title()

    if capabilities is None:
        capabilities = ["text"]

    if auth_methods is None:
        auth_methods = ["none"]

    # Build schema
    schema = {
        "@context": "https://nanda.dev/ns/agent-facts/v1",
        "id": f"nanda:{domain}",
        "agent_name": f"urn:agent:{domain.replace('.', ':')}",
        "version": "1.0.0",
    }

    if description:
        schema["description"] = description

    schema["homepage"] = f"https://{domain}"

    # Endpoints
    if endpoints:
        schema["endpoints"] = {"static": endpoints}
    else:
        schema["endpoints"] = {
            "static": [f"https://api.{domain}/v1/agent"]
        }

    # Capabilities
    schema["capabilities"] = {
        "modalities": capabilities,
        "authentication": {
            "methods": auth_methods,
        }
    }

    # Trust
    schema["trust"] = {
        "certification": "self-attested",
        "human_oversight": human_oversight,
    }

    # Metadata
    schema["metadata"] = {
        "created": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "modified": datetime.now().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "ttl": 86400,
    }

    return schema


def validate_agent_facts(url_or_schema) -> dict:
    """Validate an AgentFacts schema."""
    errors = []
    warnings = []

    # Fetch if URL
    global requests
    if isinstance(url_or_schema, str) and url_or_schema.startswith("http"):
        if requests is None:
            import subprocess
            print("Installing required packages...", file=sys.stderr)
            subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests"])
            import requests as _requests
            requests = _requests

        try:
            response = requests.get(url_or_schema, timeout=10)
            if response.status_code != 200:
                return {
                    "valid": False,
                    "errors": [f"HTTP {response.status_code}"],
                }
            schema = response.json()
        except requests.RequestException as e:
            return {"valid": False, "errors": [str(e)]}
        except json.JSONDecodeError:
            return {"valid": False, "errors": ["Invalid JSON"]}
    else:
        schema = url_or_schema

    # Required fields
    required_fields = ["@context", "id", "agent_name"]
    for field in required_fields:
        if field not in schema:
            errors.append(f"Missing required field: {field}")

    # Context validation
    if "@context" in schema:
        if not schema["@context"].startswith("https://nanda.dev"):
            errors.append("@context must be a NANDA namespace URI")

    # ID validation
    if "id" in schema:
        if not schema["id"].startswith("nanda:"):
            errors.append("id must start with 'nanda:'")

    # Recommended fields
    recommended = ["endpoints", "capabilities", "trust"]
    for field in recommended:
        if field not in schema:
            warnings.append(f"Recommended field missing: {field}")

    # Capabilities validation
    if "capabilities" in schema:
        caps = schema["capabilities"]
        if "modalities" in caps:
            valid_modalities = {"text", "image", "audio", "video", "code"}
            for mod in caps["modalities"]:
                if mod not in valid_modalities:
                    warnings.append(f"Unknown modality: {mod}")

    # Trust validation
    if "trust" in schema:
        trust = schema["trust"]
        if "certification" in trust:
            valid_certs = {"self-attested", "third-party", "audited"}
            if trust["certification"] not in valid_certs:
                warnings.append(f"Unknown certification level: {trust['certification']}")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "schema": schema,
    }


def main():
    parser = argparse.ArgumentParser(
        description="Generate or validate AgentFacts schema"
    )

    subparsers = parser.add_subparsers(dest="command", help="Command")

    # Generate command
    gen_parser = subparsers.add_parser("generate", help="Generate AgentFacts schema")
    gen_parser.add_argument("--domain", "-d", required=True, help="Domain name")
    gen_parser.add_argument("--agent-name", "-n", help="Agent display name")
    gen_parser.add_argument("--description", help="Service description")
    gen_parser.add_argument(
        "--capabilities", "-c",
        help="Capabilities (comma-separated: text,image,audio,video,code)"
    )
    gen_parser.add_argument(
        "--auth", "-a",
        help="Auth methods (comma-separated: oauth2,jwt,apikey,none)"
    )
    gen_parser.add_argument(
        "--endpoints", "-e",
        help="API endpoints (comma-separated URLs)"
    )
    gen_parser.add_argument(
        "--human-oversight",
        choices=["true", "false", "on-request"],
        default="true",
        help="Human oversight level"
    )
    gen_parser.add_argument("--output", "-o", help="Output file")
    gen_parser.add_argument(
        "--minify",
        action="store_true",
        help="Output minified JSON"
    )

    # Validate command
    val_parser = subparsers.add_parser("validate", help="Validate AgentFacts schema")
    val_parser.add_argument("url", help="URL to validate")

    # Handle no subcommand (default to generate for backwards compat)
    args, unknown = parser.parse_known_args()

    if args.command is None:
        # Check if --validate flag was used
        if "--validate" in sys.argv:
            idx = sys.argv.index("--validate")
            if idx + 1 < len(sys.argv):
                url = sys.argv[idx + 1]
                result = validate_agent_facts(url)
                print(json.dumps(result, indent=2))
                sys.exit(0 if result["valid"] else 1)

        # Otherwise assume generate with --domain
        args = gen_parser.parse_args(sys.argv[1:])
        args.command = "generate"

    if args.command == "generate":
        # Parse list arguments
        capabilities = args.capabilities.split(",") if args.capabilities else None
        auth_methods = args.auth.split(",") if args.auth else None
        endpoints = args.endpoints.split(",") if args.endpoints else None

        schema = generate_agent_facts(
            domain=args.domain,
            agent_name=args.agent_name,
            description=args.description,
            capabilities=capabilities,
            auth_methods=auth_methods,
            endpoints=endpoints,
            human_oversight=args.human_oversight,
        )

        # Output
        indent = None if args.minify else 2
        output = json.dumps(schema, indent=indent)

        if args.output:
            with open(args.output, "w") as f:
                f.write(output)
            print(f"Schema saved to: {args.output}")
        else:
            print(output)

    elif args.command == "validate":
        result = validate_agent_facts(args.url)

        if result["valid"]:
            print("✓ Valid AgentFacts schema")
        else:
            print("✗ Invalid AgentFacts schema")

        if result["errors"]:
            print("\nErrors:")
            for error in result["errors"]:
                print(f"  - {error}")

        if result["warnings"]:
            print("\nWarnings:")
            for warning in result["warnings"]:
                print(f"  - {warning}")

        sys.exit(0 if result["valid"] else 1)


if __name__ == "__main__":
    main()
