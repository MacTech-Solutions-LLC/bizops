#!/usr/bin/env bash
set -uo pipefail

# Production start: apply pending Prisma migrations, then start Next.
#
# Self-heal for a legacy database (this app's original Railway DB) that already
# contained the baseline tables (CompanyProfile/TeamMember/Campaign) before a
# Prisma migration history existed. On first `migrate deploy` the baseline `init`
# migration fails re-creating those tables (P3018 "relation already exists") and
# is recorded as failed, which then blocks every deploy (P3009). When we detect
# that P3009 state, mark the baseline init migration as applied (it only writes
# to _prisma_migrations — no schema change — and its tables already exist), then
# retry. On a fresh database `migrate deploy` just succeeds and this path is
# never taken, so the script is safe in both cases.

BASELINE_MIGRATION="20260612031118_init_bizops_domain"
LOG=/tmp/gc-migrate.log

echo "[railway-start] Applying pending migrations…"
if npx --no-install prisma migrate deploy >"${LOG}" 2>&1; then
  cat "${LOG}"
else
  cat "${LOG}"
  if grep -qiE "P3009|failed migration" "${LOG}"; then
    echo "[railway-start] Detected a failed baseline migration; marking ${BASELINE_MIGRATION} as applied and retrying."
    npx --no-install prisma migrate resolve --applied "${BASELINE_MIGRATION}" || true
    echo "[railway-start] Re-applying pending migrations…"
    npx --no-install prisma migrate deploy
  else
    echo "[railway-start] migrate deploy failed for a reason other than a failed-baseline; aborting."
    exit 1
  fi
fi

echo "[railway-start] Starting Next.js…"
exec npx --no-install next start
