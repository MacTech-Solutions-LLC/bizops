#!/usr/bin/env bash
set -euo pipefail

bash scripts/prepare-hub-client.sh
npm install --include=dev --no-audit --cache /tmp/npm-app-cache
npm run build
