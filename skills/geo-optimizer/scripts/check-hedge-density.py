#!/usr/bin/env python3
"""
Hedge Density Analyzer - Check content confidence for AI visibility.

Usage:
    python check-hedge-density.py --url https://example.com/blog/post
    python check-hedge-density.py --text "Your content to analyze"
    python check-hedge-density.py --file content.txt
"""

import argparse
import re
import sys

# Optional imports for URL fetching
requests = None
BeautifulSoup = None

try:
    import requests as _requests
    from bs4 import BeautifulSoup as _BeautifulSoup
    requests = _requests
    BeautifulSoup = _BeautifulSoup
except ImportError:
    pass  # Will auto-install if URL mode is used


# Hedge patterns with categories
HEDGE_PATTERNS = {
    "uncertainty": [
        (r"\bmaybe\b", "maybe"),
        (r"\bpossibly\b", "possibly"),
        (r"\bperhaps\b", "perhaps"),
        (r"\bmight\b", "might"),
        (r"\bcould be\b", "could be"),
        (r"\bpotentially\b", "potentially"),
    ],
    "contrast": [
        (r"\bhowever\b", "however"),
        (r"\balthough\b", "although"),
        (r"\bnevertheless\b", "nevertheless"),
        (r"\bnonetheless\b", "nonetheless"),
    ],
    "perception": [
        (r"\bit seems\b", "it seems"),
        (r"\bit appears\b", "it appears"),
        (r"\barguably\b", "arguably"),
        (r"\bapparently\b", "apparently"),
    ],
    "opinion": [
        (r"\bin my opinion\b", "in my opinion"),
        (r"\bsome believe\b", "some believe"),
        (r"\bto some extent\b", "to some extent"),
        (r"\bi think\b", "I think"),
        (r"\bi believe\b", "I believe"),
    ],
}


def fetch_text_from_url(url: str) -> str:
    """Fetch and extract text from a URL."""
    global requests, BeautifulSoup
    if requests is None or BeautifulSoup is None:
        import subprocess
        print("Installing required packages...", file=sys.stderr)
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "requests", "beautifulsoup4"])
        import requests as _requests
        from bs4 import BeautifulSoup as _BeautifulSoup
        requests = _requests
        BeautifulSoup = _BeautifulSoup

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; HedgeAnalyzer/1.0)",
    }

    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # Remove scripts, styles, nav, footer
    for element in soup(["script", "style", "noscript", "nav", "footer", "header"]):
        element.extract()

    # Try to find main content
    main_content = soup.find("main") or soup.find("article") or soup.find("body")
    if main_content:
        return main_content.get_text(separator=" ", strip=True)

    return soup.get_text(separator=" ", strip=True)


def analyze_hedge_density(text: str, verbose: bool = False) -> dict:
    """Analyze hedge density in text."""
    words = text.split()
    word_count = len(words)

    if word_count == 0:
        return {
            "word_count": 0,
            "error": "No text to analyze",
        }

    # Find all hedges with positions
    hedge_findings = []
    total_hedge_count = 0

    for category, patterns in HEDGE_PATTERNS.items():
        for pattern, name in patterns:
            matches = list(re.finditer(pattern, text, re.IGNORECASE))
            for match in matches:
                # Find surrounding context
                start = max(0, match.start() - 30)
                end = min(len(text), match.end() + 30)
                context = text[start:end].strip()
                if start > 0:
                    context = "..." + context
                if end < len(text):
                    context = context + "..."

                hedge_findings.append({
                    "word": name,
                    "category": category,
                    "position": match.start(),
                    "context": context,
                })
                total_hedge_count += 1

    # Calculate density
    hedge_density = (total_hedge_count / word_count) * 100

    # Determine rating
    if hedge_density < 0.1:
        rating = "EXCELLENT"
        recommendation = "Content has strong confidence signals. Maintain current tone."
    elif hedge_density < 0.2:
        rating = "GOOD"
        recommendation = "Minor improvements possible. Review flagged hedges."
    elif hedge_density < 0.5:
        rating = "FAIR"
        recommendation = "Significant hedging detected. Review and reduce uncertainty language."
    else:
        rating = "POOR"
        recommendation = "High hedge density hurts AI citation probability. Major rewrite recommended."

    # Group by category
    by_category = {}
    for finding in hedge_findings:
        cat = finding["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(finding)

    return {
        "word_count": word_count,
        "hedge_count": total_hedge_count,
        "hedge_density": round(hedge_density, 3),
        "rating": rating,
        "recommendation": recommendation,
        "by_category": {k: len(v) for k, v in by_category.items()},
        "findings": hedge_findings if verbose else hedge_findings[:10],
        "truncated": len(hedge_findings) > 10 and not verbose,
    }


def print_report(results: dict, show_context: bool = True):
    """Print formatted analysis report."""
    print("\n" + "=" * 60)
    print("HEDGE DENSITY ANALYSIS")
    print("=" * 60)

    if "error" in results:
        print(f"\nError: {results['error']}")
        return

    print(f"\nWord Count: {results['word_count']:,}")
    print(f"Hedge Words Found: {results['hedge_count']}")
    print(f"Hedge Density: {results['hedge_density']}%")
    print(f"Rating: {results['rating']}")
    print(f"\nRecommendation: {results['recommendation']}")

    if results["by_category"]:
        print("\nBreakdown by Category:")
        for category, count in sorted(results["by_category"].items(), key=lambda x: -x[1]):
            print(f"  - {category}: {count}")

    if results["findings"]:
        print("\nHedges Found:")
        for i, finding in enumerate(results["findings"], 1):
            print(f"\n  {i}. \"{finding['word']}\" ({finding['category']})")
            if show_context:
                print(f"     Context: {finding['context']}")

    if results.get("truncated"):
        print(f"\n  ... and {results['hedge_count'] - 10} more (use --verbose to see all)")

    print("\n" + "=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze hedge density in content for AI visibility"
    )

    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--url", "-u", help="URL to analyze")
    input_group.add_argument("--text", "-t", help="Text to analyze directly")
    input_group.add_argument("--file", "-f", help="File to analyze")

    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show all findings (not just first 10)"
    )
    parser.add_argument(
        "--no-context",
        action="store_true",
        help="Don't show context around hedge words"
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output as JSON"
    )
    parser.add_argument(
        "--threshold",
        type=float,
        default=0.2,
        help="Exit with code 1 if density exceeds threshold (default: 0.2)"
    )

    args = parser.parse_args()

    # Get text to analyze
    try:
        if args.url:
            print(f"Fetching: {args.url}")
            text = fetch_text_from_url(args.url)
        elif args.file:
            with open(args.file, "r") as f:
                text = f.read()
        else:
            text = args.text
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Analyze
    results = analyze_hedge_density(text, verbose=args.verbose)

    # Output
    if args.json:
        import json
        print(json.dumps(results, indent=2))
    else:
        print_report(results, show_context=not args.no_context)

    # Exit code based on threshold
    if results.get("hedge_density", 0) > args.threshold:
        sys.exit(1)


if __name__ == "__main__":
    main()
