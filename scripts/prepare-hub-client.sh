#!/usr/bin/env bash
# Provisions @mactech/hub-client for portable local dev and CI (no machine-specific file: paths).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${MACTECH_HUB_CLIENT_PATH:-$ROOT_DIR/vendor/hub-client}"
PLATFORM_REPO="${MACTECH_PLATFORM_REPO:-https://github.com/MacTech-Solutions-LLC/mactech-suite-platform.git}"
PLATFORM_REF="${MACTECH_PLATFORM_REF:-main}"
SIBLING="$ROOT_DIR/../mactech-suite-platform/packages/hub-client"

hub_entry_ready() {
  node "$ROOT_DIR/scripts/hub-entry-ready.mjs" "$1"
}

if [ -f "$TARGET/package.json" ] && hub_entry_ready "$TARGET"; then
  echo "hub-client ready at $TARGET"
  exit 0
fi

if [ -z "${MACTECH_HUB_CLIENT_PATH:-}" ] && [ -f "$SIBLING/package.json" ] && hub_entry_ready "$SIBLING"; then
  echo "Using sibling checkout: $SIBLING"
  mkdir -p "$ROOT_DIR/vendor"
  rm -rf "$TARGET"
  cp -R "$SIBLING" "$TARGET"
fi

if [ ! -f "$TARGET/package.json" ]; then
  echo "Cloning hub-client from $PLATFORM_REPO#$PLATFORM_REF"
  TMPDIR="$(mktemp -d)"
  trap 'rm -rf "$TMPDIR"' EXIT
  (
    git init "$TMPDIR/mactech-suite-platform"
    cd "$TMPDIR/mactech-suite-platform"
    git remote add origin "$PLATFORM_REPO"
    if git fetch --depth 1 origin "$PLATFORM_REF" 2>/dev/null; then
      git checkout FETCH_HEAD
    else
      git fetch origin
      git checkout "$PLATFORM_REF"
    fi
  )
  mkdir -p "$ROOT_DIR/vendor"
  rm -rf "$TARGET"
  cp -R "$TMPDIR/mactech-suite-platform/packages/hub-client" "$TARGET"
fi

if ! hub_entry_ready "$TARGET"; then
  (
    cd "$TARGET"
    npm install --ignore-scripts --include=dev
    npm run build
  )
fi

echo "hub-client ready at $TARGET"
