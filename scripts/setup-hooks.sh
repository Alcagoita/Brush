#!/usr/bin/env bash
set -euo pipefail

# setup-hooks.sh — Install project git hooks.
# Run once after cloning: bash scripts/setup-hooks.sh

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_SRC="$PROJECT_ROOT/scripts/hooks"
HOOKS_DEST="$PROJECT_ROOT/.git/hooks"

echo "→ Installing git hooks..."

for hook in "$HOOKS_SRC"/*; do
  name=$(basename "$hook")
  cp "$hook" "$HOOKS_DEST/$name"
  chmod +x "$HOOKS_DEST/$name"
  echo "  ✔ $name"
done

echo ""
echo "✅ Git hooks installed. APK will be built automatically when merging into main (end of sprint)."
echo ""
