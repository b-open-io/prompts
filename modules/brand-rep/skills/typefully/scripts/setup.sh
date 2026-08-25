#!/bin/bash
# Typefully API setup guide
# Run this when TYPEFULLY_API_KEY is not configured

cat << 'GUIDE'
╔══════════════════════════════════════════════════════════════════╗
║                   Typefully API Setup Guide                       ║
╚══════════════════════════════════════════════════════════════════╝

TYPEFULLY_API_KEY is not set. Follow these steps:

STEP 1: Open Typefully and go to Settings → API
        https://typefully.com/settings/api

STEP 2: Create an API key and copy it
        The key inherits YOUR account permissions — it can publish.
        Treat it like a password.

STEP 3: Add it to your shell profile:

        echo 'export TYPEFULLY_API_KEY="paste-key-here"' >> ~/.zshrc
        source ~/.zshrc

STEP 4: Find your social set id and export it:

        ${CLAUDE_SKILL_DIR}/scripts/social-sets.sh
        echo 'export TYPEFULLY_SOCIAL_SET="12345"' >> ~/.zshrc

────────────────────────────────────────────────────────────────────
NOTE ON SAFETY

This key can publish to live accounts. The draft script creates plain
drafts unless you pass --at, --plan, or --publish-now. Keep it that way.

Docs: https://typefully.com/docs/api
GUIDE
