#!/usr/bin/env bash
set -euo pipefail

HUB_CLIENT="../mactech-suite-platform/packages/hub-client"
if [ ! -d "$HUB_CLIENT" ]; then
  TMPDIR=$(mktemp -d)
  trap 'rm -rf "$TMPDIR"' EXIT
  git clone --depth 1 --branch "${PLATFORM_BRANCH:-main}" \
    "https://${GITHUB_TOKEN:+x-access-token:$GITHUB_TOKEN@}github.com/MacTech-Solutions-LLC/mactech-suite-platform.git" \
    "$TMPDIR/mactech-suite-platform"
  mkdir -p ../mactech-suite-platform/packages
  cp -R "$TMPDIR/mactech-suite-platform/packages/hub-client" "$HUB_CLIENT"
fi

(
  cd "$HUB_CLIENT"
  npm ci --ignore-scripts
  npm run build
)

# Railpack may already install deps; refresh file: hub-client without touching locked cache dir.
npm install --no-audit --cache /tmp/npm-app-cache
npm run build