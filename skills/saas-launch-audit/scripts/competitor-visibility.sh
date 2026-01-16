#!/usr/bin/env bash

# Competitor AI Visibility Audit Script
# Usage: ./competitor-visibility.sh "your product" "category" "competitor1" "competitor2" "competitor3"
#
# This script helps prepare AI visibility comparison queries.
# The actual queries should be run manually in ChatGPT, Perplexity, and Claude.

set -euo pipefail

PRODUCT="${1:-}"
CATEGORY="${2:-}"
COMPETITOR1="${3:-}"
COMPETITOR2="${4:-}"
COMPETITOR3="${5:-}"

if [[ -z "$PRODUCT" || -z "$CATEGORY" ]]; then
  echo "Usage: $0 \"your product\" \"category\" [competitor1] [competitor2] [competitor3]"
  echo ""
  echo "Example: $0 \"Acme\" \"project management\" \"Asana\" \"Monday\" \"Notion\""
  exit 1
fi

echo "============================================"
echo "AI Visibility Audit Queries"
echo "============================================"
echo ""
echo "Run these queries in ChatGPT, Perplexity, and Claude:"
echo ""
echo "----------------------------------------"
echo "1. CATEGORY DISCOVERY QUERIES"
echo "----------------------------------------"
echo ""
echo "  → \"What are the best ${CATEGORY} tools?\""
echo "  → \"Top ${CATEGORY} software in 2026\""
echo "  → \"${CATEGORY} tools for startups\""
echo "  → \"${CATEGORY} alternatives\""
echo ""
echo "For each response, note:"
echo "  - Is ${PRODUCT} mentioned? (Y/N)"
echo "  - Position in list (1st, 2nd, etc. or not listed)"
echo "  - How is it described?"
echo ""

if [[ -n "$COMPETITOR1" ]]; then
  echo "----------------------------------------"
  echo "2. COMPETITOR COMPARISON QUERIES"
  echo "----------------------------------------"
  echo ""
  echo "  → \"${PRODUCT} vs ${COMPETITOR1}\""
  [[ -n "$COMPETITOR2" ]] && echo "  → \"${PRODUCT} vs ${COMPETITOR2}\""
  [[ -n "$COMPETITOR3" ]] && echo "  → \"${PRODUCT} vs ${COMPETITOR3}\""
  [[ -n "$COMPETITOR1" ]] && echo "  → \"${COMPETITOR1} alternatives\""
  [[ -n "$COMPETITOR2" ]] && echo "  → \"${COMPETITOR2} alternatives\""
  echo ""
  echo "For each response, note:"
  echo "  - How does ${PRODUCT} compare?"
  echo "  - What features are highlighted?"
  echo "  - Is the comparison accurate?"
  echo ""
fi

echo "----------------------------------------"
echo "3. DIRECT BRAND QUERIES"
echo "----------------------------------------"
echo ""
echo "  → \"What is ${PRODUCT}?\""
echo "  → \"${PRODUCT} pricing\""
echo "  → \"${PRODUCT} features\""
echo "  → \"${PRODUCT} reviews\""
echo ""
echo "For each response, note:"
echo "  - Is the information accurate?"
echo "  - Is pricing current?"
echo "  - What sources are cited?"
echo ""

echo "----------------------------------------"
echo "4. SENTIMENT ANALYSIS"
echo "----------------------------------------"
echo ""
echo "For each mention of ${PRODUCT}, rate the sentiment:"
echo "  - Positive: Highlighted as top choice, praised"
echo "  - Neutral: Listed without opinion"
echo "  - Negative: Criticized, mentioned as limited"
echo ""

echo "----------------------------------------"
echo "5. AUDIT TRACKING TEMPLATE"
echo "----------------------------------------"
echo ""
echo "| Query | ChatGPT | Perplexity | Claude |"
echo "|-------|---------|------------|--------|"
echo "| Category: best ${CATEGORY} | | | |"
echo "| vs ${COMPETITOR1:-competitor} | | | |"
echo "| Direct: what is ${PRODUCT} | | | |"
echo ""
echo "Use: Y (mentioned), N (not mentioned), #N (position)"
echo ""
echo "============================================"
echo "Run these queries manually and record results"
echo "============================================"
