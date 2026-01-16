#!/usr/bin/env bash

# Technical Audit Script for SaaS Launch
# Usage: ./tech-audit.sh https://example.com
#
# Checks: SSL, security headers, Core Web Vitals, structured data

set -euo pipefail

URL="${1:-}"

if [[ -z "$URL" ]]; then
  echo "Usage: $0 https://example.com"
  exit 1
fi

# Remove trailing slash
URL="${URL%/}"

# Extract domain
DOMAIN=$(echo "$URL" | sed -E 's|https?://([^/]+).*|\1|')

echo "============================================"
echo "Technical Audit: ${DOMAIN}"
echo "============================================"
echo ""

# Check if required tools are available
check_tool() {
  if ! command -v "$1" &> /dev/null; then
    echo "Warning: $1 not found - skipping related checks"
    return 1
  fi
  return 0
}

echo "----------------------------------------"
echo "1. SSL CERTIFICATE"
echo "----------------------------------------"
echo ""

if check_tool openssl; then
  echo "Checking SSL certificate..."
  SSL_INFO=$(echo | openssl s_client -servername "$DOMAIN" -connect "$DOMAIN:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null || echo "FAILED")

  if [[ "$SSL_INFO" == "FAILED" ]]; then
    echo "[FAIL] SSL certificate check failed"
    echo "  → Next step: Verify SSL is properly configured"
  else
    EXPIRY=$(echo "$SSL_INFO" | grep "notAfter" | cut -d= -f2)
    echo "[PASS] SSL certificate valid"
    echo "  Expires: $EXPIRY"
  fi
else
  echo "[SKIP] openssl not available"
fi
echo ""

echo "----------------------------------------"
echo "2. SECURITY HEADERS"
echo "----------------------------------------"
echo ""

if check_tool curl; then
  HEADERS=$(curl -sI "$URL" 2>/dev/null | tr -d '\r')

  check_header() {
    local header="$1"
    local name="$2"
    if echo "$HEADERS" | grep -qi "^${header}:"; then
      echo "[PASS] ${name}"
    else
      echo "[FAIL] ${name} missing"
      echo "  → Next step: Add ${header} header"
    fi
  }

  check_header "Strict-Transport-Security" "HSTS"
  check_header "X-Content-Type-Options" "X-Content-Type-Options"
  check_header "X-Frame-Options" "X-Frame-Options"
  check_header "Content-Security-Policy" "CSP"
  check_header "Referrer-Policy" "Referrer-Policy"

  echo ""
  echo "For detailed analysis, visit: https://securityheaders.com/?q=${URL}"
else
  echo "[SKIP] curl not available"
fi
echo ""

echo "----------------------------------------"
echo "3. CORE WEB VITALS"
echo "----------------------------------------"
echo ""
echo "Run PageSpeed Insights for detailed metrics:"
echo "  https://pagespeed.web.dev/report?url=${URL}"
echo ""
echo "Target thresholds:"
echo "  - LCP (Largest Contentful Paint): < 2.5s"
echo "  - INP (Interaction to Next Paint): < 200ms"
echo "  - CLS (Cumulative Layout Shift): < 0.1"
echo ""

# Basic response time check
if check_tool curl; then
  echo "Basic response time check..."
  TIME=$(curl -o /dev/null -s -w '%{time_total}' "$URL" 2>/dev/null || echo "0")

  if (( $(echo "$TIME < 1.0" | bc -l) )); then
    echo "[PASS] Initial response: ${TIME}s"
  elif (( $(echo "$TIME < 2.0" | bc -l) )); then
    echo "[WARN] Initial response: ${TIME}s (could be faster)"
  else
    echo "[FAIL] Initial response: ${TIME}s (too slow)"
    echo "  → Next step: Investigate server response time"
  fi
fi
echo ""

echo "----------------------------------------"
echo "4. STRUCTURED DATA"
echo "----------------------------------------"
echo ""
echo "Check for structured data:"
echo "  https://search.google.com/test/rich-results?url=${URL}"
echo ""
echo "Recommended schemas for SaaS:"
echo "  - Organization"
echo "  - SoftwareApplication"
echo "  - FAQPage"
echo "  - Product (for pricing)"
echo ""

# Basic check for JSON-LD
if check_tool curl; then
  PAGE=$(curl -s "$URL" 2>/dev/null || echo "")

  if echo "$PAGE" | grep -q "application/ld+json"; then
    echo "[PASS] JSON-LD structured data detected"
  else
    echo "[FAIL] No JSON-LD structured data found"
    echo "  → Next step: Add schema.org markup to pages"
  fi
fi
echo ""

echo "----------------------------------------"
echo "5. ESSENTIAL PAGES"
echo "----------------------------------------"
echo ""

if check_tool curl; then
  check_page() {
    local path="$1"
    local name="$2"
    local status=$(curl -sI "${URL}${path}" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "000")

    if [[ "$status" == "200" ]]; then
      echo "[PASS] ${name} (${URL}${path})"
    else
      echo "[FAIL] ${name} not found or error (status: ${status})"
      echo "  → Next step: Create ${path} page"
    fi
  }

  check_page "/pricing" "Pricing page"
  check_page "/privacy" "Privacy policy"
  check_page "/terms" "Terms of service"
fi
echo ""

echo "----------------------------------------"
echo "6. ROBOTS & SITEMAP"
echo "----------------------------------------"
echo ""

if check_tool curl; then
  # Check robots.txt
  ROBOTS_STATUS=$(curl -sI "${URL}/robots.txt" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "000")
  if [[ "$ROBOTS_STATUS" == "200" ]]; then
    echo "[PASS] robots.txt exists"
  else
    echo "[WARN] robots.txt not found"
    echo "  → Next step: Create robots.txt"
  fi

  # Check sitemap
  SITEMAP_STATUS=$(curl -sI "${URL}/sitemap.xml" 2>/dev/null | head -1 | cut -d' ' -f2 || echo "000")
  if [[ "$SITEMAP_STATUS" == "200" ]]; then
    echo "[PASS] sitemap.xml exists"
  else
    echo "[WARN] sitemap.xml not found"
    echo "  → Next step: Create and submit sitemap"
  fi
fi
echo ""

echo "============================================"
echo "Audit Complete"
echo "============================================"
echo ""
echo "Additional tools for deeper analysis:"
echo "  - SSL Labs: https://www.ssllabs.com/ssltest/analyze.html?d=${DOMAIN}"
echo "  - Security Headers: https://securityheaders.com/?q=${URL}"
echo "  - PageSpeed: https://pagespeed.web.dev/report?url=${URL}"
echo "  - Rich Results: https://search.google.com/test/rich-results?url=${URL}"
