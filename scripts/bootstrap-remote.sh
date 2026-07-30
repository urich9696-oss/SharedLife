#!/usr/bin/env bash
# SharedLife – Remote-Bootstrap für Supabase + Vercel
# Voraussetzung: Tokens als Env gesetzt (niemals committen).
#
# Benötigt:
#   SUPABASE_ACCESS_TOKEN   – https://supabase.com/dashboard/account/tokens
#   SUPABASE_PROJECT_REF    – z.B. abcdxyzefghijklmnop
#   SUPABASE_DB_PASSWORD    – DB-Passwort des Projekts (für db push ggf.)
#   VERCEL_TOKEN            – https://vercel.com/account/tokens
#   VERCEL_ORG_ID           – Team/Org ID (optional wenn linked)
#   VERCEL_PROJECT_ID       – prj_DF7ASObHbMeRDOswJ0uiUvFTGyT1
#
# Optional:
#   VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY – werden nach db push aus API gelesen wenn möglich
#   CRON_SECRET / VAPID_* – Push

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

need() {
  if [[ -z "${!1:-}" ]]; then
    echo "Fehlt: $1" >&2
    exit 1
  fi
}

need SUPABASE_ACCESS_TOKEN
need SUPABASE_PROJECT_REF
need VERCEL_TOKEN

echo "==> Supabase CLI"
npx --yes supabase --version
npx supabase link --project-ref "$SUPABASE_PROJECT_REF" --password "${SUPABASE_DB_PASSWORD:-}"

echo "==> Migrationen pushen"
npx supabase db push

echo "==> Edge Functions deployen"
npx supabase functions deploy sync-mutations --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy manage-push-subscription --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy dispatch-reminders --project-ref "$SUPABASE_PROJECT_REF"
npx supabase functions deploy export-data --project-ref "$SUPABASE_PROJECT_REF"

if [[ -n "${CRON_SECRET:-}" ]]; then
  npx supabase secrets set CRON_SECRET="$CRON_SECRET" --project-ref "$SUPABASE_PROJECT_REF"
fi
if [[ -n "${VAPID_PRIVATE_KEY:-}" && -n "${VAPID_PUBLIC_KEY:-}" ]]; then
  npx supabase secrets set \
    VAPID_PRIVATE_KEY="$VAPID_PRIVATE_KEY" \
    VAPID_PUBLIC_KEY="$VAPID_PUBLIC_KEY" \
    VAPID_SUBJECT="${VAPID_SUBJECT:-mailto:urich9696@gmail.com}" \
    --project-ref "$SUPABASE_PROJECT_REF"
fi

echo "==> Vercel Env setzen"
add_env() {
  local key="$1" value="$2"
  # Preview + Production
  printf '%s' "$value" | npx --yes vercel@latest env add "$key" production --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
  printf '%s' "$value" | npx --yes vercel@latest env add "$key" preview --token "$VERCEL_TOKEN" --yes 2>/dev/null || true
}

if [[ -n "${VITE_SUPABASE_URL:-}" ]]; then
  add_env VITE_SUPABASE_URL "$VITE_SUPABASE_URL"
fi
if [[ -n "${VITE_SUPABASE_ANON_KEY:-}" ]]; then
  add_env VITE_SUPABASE_ANON_KEY "$VITE_SUPABASE_ANON_KEY"
fi
if [[ -n "${VITE_VAPID_PUBLIC_KEY:-}" ]]; then
  add_env VITE_VAPID_PUBLIC_KEY "$VITE_VAPID_PUBLIC_KEY"
fi
add_env VITE_DEFAULT_TIMEZONE "Europe/Zurich"
add_env VITE_APP_NAME "SharedLife"
# Demo auf Vercel aus
add_env VITE_DEMO_MODE "false"

echo "==> Vercel Redeploy anstoßen"
npx --yes vercel@latest --token "$VERCEL_TOKEN" --prod --yes || \
  npx --yes vercel@latest deploy --token "$VERCEL_TOKEN" --yes

echo "Fertig. Auth-User Dennis/Lea + Space-Membership noch im Supabase-Dashboard anlegen (siehe docs/setup.md)."
