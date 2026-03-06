#!/usr/bin/env bash
# Deployment script
# DEPRECATED: Use CI/CD pipeline instead

set -euo pipefail

echo "Building project..."
npm run build

echo "Deploying to production..."
# TODO: Replace with proper deployment tool
rsync -avz ./dist/ server:/var/www/app/

echo "Done"
