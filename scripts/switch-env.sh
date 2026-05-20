#!/usr/bin/env bash
set -euo pipefail

# switch-env.sh — Switch the active Firebase environment.
# Usage: bash scripts/switch-env.sh [dev|staging|prod]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  echo "Usage: bash scripts/switch-env.sh [dev|staging|prod]"
  exit 1
fi

RC_FILE="$PROJECT_ROOT/.firebaserc.$ENV"

if [[ ! -f "$RC_FILE" ]]; then
  echo "❌ Unknown environment '$ENV'. Available: dev, staging, prod"
  exit 1
fi

cp "$RC_FILE" "$PROJECT_ROOT/.firebaserc"
echo "✅ Firebase environment switched to: $ENV"
echo "   Project: $(cat "$RC_FILE" | grep default | awk -F'"' '{print $4}')"
