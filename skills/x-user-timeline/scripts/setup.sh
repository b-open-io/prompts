#!/bin/bash
# X API Setup Guide
# Run this when X_BEARER_TOKEN is not configured

cat << 'EOF'
╔══════════════════════════════════════════════════════════════════╗
║                    X API Setup Guide                              ║
╚══════════════════════════════════════════════════════════════════╝

X_BEARER_TOKEN is not set. Follow these steps:

STEP 1: Go to the X Developer Portal
        https://developer.x.com/en/portal/dashboard

STEP 2: Click the 🔑 key icon next to your existing app
        (Free tier only allows 1 app - use your existing one)

STEP 3: Scroll to "Bearer Token" section and click "Regenerate"
        Copy the token (starts with "AAAA...")
        ⚠️  Save it now - you can't view it again!

STEP 4: Add to your shell profile:

        echo 'export X_BEARER_TOKEN="paste-token-here"' >> ~/.zshrc
        source ~/.zshrc

────────────────────────────────────────────────────────────────────
NO APP YET? (Free tier = 1 app only)

1. Left sidebar → "Projects & Apps"
2. Click "+ Add App" under your project
3. Name it anything (e.g., "Claude Code")
4. After creation → "Keys and tokens" tab
5. Scroll to "Bearer Token" → Generate

────────────────────────────────────────────────────────────────────
FREE TIER LIMITS:
• 1 app per project (can't create more)
• 1,500 tweets per month
• 10 requests per 15 minutes

Docs: https://developer.x.com/en/docs/x-api
EOF
