#!/bin/bash
# Get X user profile by username
# Usage: ./lookup.sh <username>

set -e

USERNAME="${1#@}"  # Remove @ if present

if [ -z "$USERNAME" ]; then
    echo "Usage: lookup.sh <username>"
    exit 1
fi

if [ -z "$X_BEARER_TOKEN" ]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    bash "$SCRIPT_DIR/setup.sh"
    exit 1
fi

curl -s "https://api.x.com/2/users/by/username/${USERNAME}?user.fields=id,name,username,description,public_metrics,verified,created_at,profile_image_url" \
  -H "Authorization: Bearer $X_BEARER_TOKEN" | jq '.'
