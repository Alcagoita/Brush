#!/usr/bin/env bash
set -euo pipefail

# switch-env.sh — Switch the active Firebase environment for local development.
# Usage: bash scripts/switch-env.sh [dev|staging|prod]
#
# Swaps:
#   .firebaserc                          (Firebase CLI project alias)
#   android/app/google-services.json     (Android Firebase SDK config)
#   ios/Brush/GoogleService-Info.plist   (iOS Firebase SDK config)
#
# PROD Firebase project: brush-away       (production data)
# DEV  Firebase project: brush-away-dev   (development / QA)

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV="${1:-}"

if [[ -z "$ENV" ]]; then
  echo "Usage: bash scripts/switch-env.sh [dev|staging|prod]"
  exit 1
fi

require_file() {
  local path="$1"
  if [[ ! -f "$path" ]]; then
    echo "Error: required file not found: $path" >&2
    echo "  Run this script from the repo root, or check that all config files are present." >&2
    exit 1
  fi
}

case "$ENV" in
  dev|staging)
    FIREBASE_PROJECT="brush-away-dev"
    ANDROID_CONFIG="google-services-dev.json"
    IOS_CONFIG="GoogleService-Info-Dev.plist"
    ;;
  prod)
    FIREBASE_PROJECT="brush-away"
    ANDROID_CONFIG="google-services-prod.json"
    IOS_CONFIG="GoogleService-Info-Prod.plist"
    ;;
  *)
    echo "Unknown environment '$ENV'. Available: dev, staging, prod"
    exit 1
    ;;
esac

# .firebaserc
require_file "$PROJECT_ROOT/.firebaserc.$ENV"
cp "$PROJECT_ROOT/.firebaserc.$ENV" "$PROJECT_ROOT/.firebaserc"

# Android SDK config
require_file "$PROJECT_ROOT/android/app/$ANDROID_CONFIG"
cp "$PROJECT_ROOT/android/app/$ANDROID_CONFIG" "$PROJECT_ROOT/android/app/google-services.json"

# iOS SDK config
require_file "$PROJECT_ROOT/ios/Brush/$IOS_CONFIG"
cp "$PROJECT_ROOT/ios/Brush/$IOS_CONFIG" "$PROJECT_ROOT/ios/Brush/GoogleService-Info.plist"

echo "✓ Switched to: $ENV (Firebase project: $FIREBASE_PROJECT)"
echo "  Android: $ANDROID_CONFIG → google-services.json"
echo "  iOS:     $IOS_CONFIG → GoogleService-Info.plist"
echo ""
echo "  Rebuild the app to pick up the new Firebase config."
