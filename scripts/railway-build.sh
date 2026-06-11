#!/usr/bin/env bash
set -euo pipefail

HUB_CLIENT="../mactech-suite-platform/packages/hub-client"
if [ ! -d "$HUB_CLIENT" ]; then
  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT
  git clone --depth 1 https://github.com/MacTech-Solutions-LLC/mactech-suite-platform.git "$TMPDIR/mactech-suite-platform"
  mkdir -p ../mactech-suite-platform/packages
  cp -R "$TMPDIR/mactech-suite-platform/packages/hub-client" "$HUB_CLIENT"
fi

(
  cd "$HUB_CLIENT"
  npm install --ignore-scripts
  npm install --no-save typescript@5.6.3 @types/node
  npm run build
)

rm -rf node_modules/.cache
npm ci --cache /tmp/npm-cache && npm run build