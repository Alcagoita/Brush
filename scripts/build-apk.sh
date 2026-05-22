#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# build-apk.sh — Build a debug APK and store it
# in the project's builds/ folder.
# ─────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILDS_DIR="$PROJECT_ROOT/builds"
ANDROID_DIR="$PROJECT_ROOT/android"
APK_SOURCE="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

# Resolve Android SDK
ANDROID_SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}"
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"

# Gradle 9.x requires Java 17 — prefer the Homebrew-installed JDK
JAVA17="/usr/local/opt/openjdk@17/bin"
if [ -d "$JAVA17" ]; then
  export PATH="$JAVA17:$PATH"
  export JAVA_HOME="/usr/local/opt/openjdk@17"
fi

echo ""
echo "▶ Building Agenda APK..."
echo "  Project : $PROJECT_ROOT"
echo "  SDK     : $ANDROID_HOME"
echo ""

# 1. Install JS dependencies
echo "→ Installing JS dependencies..."
cd "$PROJECT_ROOT"
npm install --silent

# 2. Build debug APK
echo "→ Running Gradle assembleDebug..."
cd "$ANDROID_DIR"
./gradlew assembleDebug --quiet

# 3. Copy APK to builds/
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEST="$BUILDS_DIR/Agenda-debug-$TIMESTAMP.apk"
mkdir -p "$BUILDS_DIR"
cp "$APK_SOURCE" "$DEST"

echo ""
echo "✅ APK ready: builds/Agenda-debug-$TIMESTAMP.apk"
echo ""
