#!/usr/bin/env bash
set -euo pipefail
if [ ! -d ../mactech-suite-platform/packages/hub-client ]; then
  git clone --depth 1 https://github.com/MacTech-Solutions-LLC/mactech-suite-platform.git /tmp/mactech-suite-platform
  mkdir -p ../mactech-suite-platform/packages
  cp -R /tmp/mactech-suite-platform/packages/hub-client ../mactech-suite-platform/packages/hub-client
fi
cd ../mactech-suite-platform/packages/hub-client && npm ci && npm run build
cd - && npm ci && npm run build
