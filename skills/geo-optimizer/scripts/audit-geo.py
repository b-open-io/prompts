#!/usr/bin/env python3
"""
GEO Audit Script - Full Generative Engine Optimization audit for a URL.

Usage:
    python audit-geo.py https://example.com
    python audit-geo.py https://example.com --output report.md
    python audit-geo.py https://example.com --mode technical
"""

import argparse
import json
import re
import sys
from datetime import datetime
from urllib.parse import urlparse

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    import subprocess
    print("Installing required packages...", file=sys.stderr)
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests", "beautifulsoup4"])
    import requests
    from bs4 import BeautifulSoup


# Hedge words for confidence analysis
HEDGE_PATTERNS = [
    r"\bmaybe\b",
    r"\bpossibly\b",
    r"\bperhaps\b",
    r"\bmight\b",
    r"\bcould be\b",
    r"\bhowever\b",
    r"\balthough\b",
    r"\bit seems\b",
    r"\barguably\b",
    r"\bpotentially\b",
    r"\bsome believe\b",
    r"\bit appears\b",
    r"\bin my opinion\b",
    r"\bto some extent\b",
]


class GeoAuditor:
    """GEO Auditor for AI search visibility analysis."""

    def __init__(self, url: str, launch_year: int = None):
        self.url = url
        self.domain = urlparse(url).netloc
        self.launch_year = launch_year
        self.raw_html = ""
        self.text_content = ""
        self.soup = None

    def fetch_content(self) -> bool:
        """Fetch URL content simulating an AI crawler."""
        headers = {
            "User-Agent": "ClaudeBot/1.0 (compatible; AI-Search-Crawler)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }

        try:
            response = requests.get(self.url, headers=headers, timeout=15)
            response.raise_for_status()
            self.raw_html = response.text
            self.soup = BeautifulSoup(self.raw_html, "html.parser")

            # Extract text content (remove scripts/styles)
            for element in self.soup(["script", "style", "noscript"]):
                element.extract()
            self.text_content = self.soup.get_text(separator=" ", strip=True)

            return True
        except requests.RequestException as e:
            print(f"Error fetching URL: {e}", file=sys.stderr)
            return False

    def audit_technical(self) -> dict:
        """Audit technical visibility factors."""
        results = {}

        # HTML size check (1MB limit)
        size_bytes = len(self.raw_html.encode("utf-8"))
        size_mb = size_bytes / (1024 * 1024)
        results["html_size_bytes"] = size_bytes
        results["html_size_mb"] = round(size_mb, 3)
        results["size_risk"] = "HIGH" if size_mb > 1.0 else "LOW"

        # JS dependency check
        script_count = len(self.soup.find_all("script"))
        text_length = len(self.text_content)

        if text_length < 500:
            js_risk = "CRITICAL"
            js_note = "Very little text in raw HTML - content likely requires JS"
        elif text_length < 2000:
            js_risk = "MEDIUM"
            js_note = "Limited text in raw HTML - some content may require JS"
        else:
            js_risk = "LOW"
            js_note = "Substantial text in raw HTML"

        results["script_count"] = script_count
        results["text_length"] = text_length
        results["js_dependency_risk"] = js_risk
        results["js_note"] = js_note

        # Content-to-code ratio
        total_size = len(self.raw_html)
        text_size = len(self.text_content)
        content_ratio = (text_size / total_size * 100) if total_size > 0 else 0
        results["content_ratio"] = round(content_ratio, 1)
        results["content_ratio_rating"] = (
            "EXCELLENT" if content_ratio > 25 else
            "GOOD" if content_ratio > 15 else
            "FAIR" if content_ratio > 5 else
            "POOR"
        )

        return results

    def audit_content(self) -> dict:
        """Audit content authority factors (hedge density)."""
        words = self.text_content.split()
        word_count = len(words)

        hedge_count = 0
        hedge_matches = []

        for pattern in HEDGE_PATTERNS:
            matches = re.findall(pattern, self.text_content, re.IGNORECASE)
            hedge_count += len(matches)
            if matches:
                hedge_matches.extend(matches)

        hedge_density = (hedge_count / word_count * 100) if word_count > 0 else 0

        rating = (
            "EXCELLENT" if hedge_density < 0.1 else
            "GOOD" if hedge_density < 0.2 else
            "FAIR" if hedge_density < 0.5 else
            "POOR"
        )

        return {
            "word_count": word_count,
            "hedge_count": hedge_count,
            "hedge_density": round(hedge_density, 3),
            "confidence_rating": rating,
            "hedge_examples": list(set(hedge_matches))[:10],
        }

    def check_agent_facts(self) -> dict:
        """Check for AgentFacts/NANDA protocol presence."""
        agent_facts_url = f"https://{self.domain}/.well-known/agent-facts"

        try:
            response = requests.get(agent_facts_url, timeout=5)
            if response.status_code == 200:
                try:
                    schema = response.json()
                    has_context = "@context" in schema
                    has_id = "id" in schema
                    has_name = "agent_name" in schema

                    return {
                        "present": True,
                        "valid": has_context and has_id and has_name,
                        "url": agent_facts_url,
                        "schema_preview": {k: v for k, v in list(schema.items())[:5]},
                    }
                except json.JSONDecodeError:
                    return {
                        "present": True,
                        "valid": False,
                        "error": "Invalid JSON",
                        "url": agent_facts_url,
                    }
            else:
                return {"present": False, "status_code": response.status_code}
        except requests.RequestException:
            return {"present": False, "error": "Could not fetch"}

    def assess_discovery_strategy(self) -> dict:
        """Assess recommended discovery strategy based on site age."""
        current_year = datetime.now().year

        if self.launch_year is None:
            return {
                "status": "Unknown",
                "note": "Provide --launch-year for strategy recommendations",
            }

        age = current_year - self.launch_year

        if age < 1:
            return {
                "status": "New Site (<1 year)",
                "visibility_estimate": "~1%",
                "primary_strategy": "Web-augmented signals",
                "focus": [
                    "Reddit presence in relevant subreddits",
                    "Earn referring domains through guest posts",
                    "Build social proof (Twitter, LinkedIn mentions)",
                    "Technical foundation (AgentFacts for future)",
                ],
                "avoid": [
                    "Obsessing over GEO optimization",
                    "Expecting quick AI visibility",
                ],
            }
        elif age < 2:
            return {
                "status": "Early Stage (1-2 years)",
                "visibility_estimate": "~3%",
                "primary_strategy": "Hybrid approach",
                "focus": [
                    "Continue web-augmented signals",
                    "Begin basic GEO optimization",
                    "Implement AgentFacts",
                    "Build content authority",
                ],
            }
        elif age < 5:
            return {
                "status": "Established (2-5 years)",
                "visibility_estimate": "~60%",
                "primary_strategy": "Full GEO optimization",
                "focus": [
                    "Comprehensive hedge density reduction",
                    "Technical visibility optimization",
                    "Complete AgentFacts implementation",
                    "Content refresh cycle",
                ],
            }
        else:
            return {
                "status": "Authority (5+ years)",
                "visibility_estimate": "~99%",
                "primary_strategy": "Maintain and defend",
                "focus": [
                    "Citation monitoring",
                    "Advanced GEO tactics",
                    "Trust optimization",
                    "Protocol innovation adoption",
                ],
            }

    def generate_report(self, mode: str = "full") -> str:
        """Generate the audit report."""
        lines = [
            "=" * 60,
            f"GEO AUDIT REPORT",
            f"Target: {self.url}",
            f"Generated: {datetime.now().isoformat()}",
            "=" * 60,
            "",
        ]

        if mode in ("full", "technical"):
            tech = self.audit_technical()
            lines.extend([
                "## TECHNICAL VISIBILITY",
                "",
                f"HTML Size: {tech['html_size_mb']} MB ({tech['html_size_bytes']:,} bytes)",
                f"Size Risk: {tech['size_risk']} (limit: 1.0 MB)",
                "",
                f"Script Tags: {tech['script_count']}",
                f"Raw Text Length: {tech['text_length']:,} chars",
                f"JS Dependency Risk: {tech['js_dependency_risk']}",
                f"Note: {tech['js_note']}",
                "",
                f"Content-to-Code Ratio: {tech['content_ratio']}%",
                f"Rating: {tech['content_ratio_rating']}",
                "",
            ])

        if mode in ("full", "content"):
            content = self.audit_content()
            lines.extend([
                "## CONTENT AUTHORITY",
                "",
                f"Word Count: {content['word_count']:,}",
                f"Hedge Words Found: {content['hedge_count']}",
                f"Hedge Density: {content['hedge_density']}%",
                f"Confidence Rating: {content['confidence_rating']}",
                "",
            ])
            if content['hedge_examples']:
                lines.append(f"Examples: {', '.join(content['hedge_examples'])}")
                lines.append("")

        if mode in ("full", "agent"):
            agent = self.check_agent_facts()
            lines.extend([
                "## AGENT INFRASTRUCTURE",
                "",
                f"AgentFacts Present: {'Yes' if agent.get('present') else 'No'}",
            ])
            if agent.get('present'):
                lines.append(f"Valid Schema: {'Yes' if agent.get('valid') else 'No'}")
                if agent.get('error'):
                    lines.append(f"Error: {agent['error']}")
            else:
                lines.extend([
                    "Recommendation: Implement AgentFacts at /.well-known/agent-facts",
                    "See: references/agentfacts-schema.md",
                ])
            lines.append("")

        if mode == "full":
            strategy = self.assess_discovery_strategy()
            lines.extend([
                "## DISCOVERY STRATEGY",
                "",
                f"Status: {strategy['status']}",
            ])
            if 'visibility_estimate' in strategy:
                lines.append(f"Estimated AI Visibility: {strategy['visibility_estimate']}")
                lines.append(f"Primary Strategy: {strategy['primary_strategy']}")
                lines.append("")
                if 'focus' in strategy:
                    lines.append("Focus Areas:")
                    for item in strategy['focus']:
                        lines.append(f"  - {item}")
                if 'avoid' in strategy:
                    lines.append("")
                    lines.append("Avoid:")
                    for item in strategy['avoid']:
                        lines.append(f"  - {item}")
            elif 'note' in strategy:
                lines.append(f"Note: {strategy['note']}")
            lines.append("")

        lines.extend([
            "=" * 60,
            "END OF REPORT",
            "=" * 60,
        ])

        return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="GEO Audit - Generative Engine Optimization analysis"
    )
    parser.add_argument("url", help="URL to audit")
    parser.add_argument(
        "--output", "-o",
        help="Output file (default: stdout)"
    )
    parser.add_argument(
        "--mode", "-m",
        choices=["full", "technical", "content", "agent"],
        default="full",
        help="Audit mode (default: full)"
    )
    parser.add_argument(
        "--launch-year",
        type=int,
        help="Year the site launched (for strategy recommendations)"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON instead of text"
    )

    args = parser.parse_args()

    auditor = GeoAuditor(args.url, args.launch_year)

    if not auditor.fetch_content():
        sys.exit(1)

    if args.json:
        results = {
            "url": args.url,
            "timestamp": datetime.now().isoformat(),
        }
        if args.mode in ("full", "technical"):
            results["technical"] = auditor.audit_technical()
        if args.mode in ("full", "content"):
            results["content"] = auditor.audit_content()
        if args.mode in ("full", "agent"):
            results["agent_facts"] = auditor.check_agent_facts()
        if args.mode == "full":
            results["strategy"] = auditor.assess_discovery_strategy()

        output = json.dumps(results, indent=2)
    else:
        output = auditor.generate_report(args.mode)

    if args.output:
        with open(args.output, "w") as f:
            f.write(output)
        print(f"Report saved to: {args.output}")
    else:
        print(output)


if __name__ == "__main__":
    main()
