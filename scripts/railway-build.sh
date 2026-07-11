#!/usr/bin/env bash
set -euo pipefail

bash scripts/prepare-hub-client.sh
npm install --no-audit --cache /tmp/npm-app-cache
npm run build
