#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TOKEN="$(grep '^VERCEL_TOKEN=' .env.local | sed -E 's/VERCEL_TOKEN="?([^"]*)"?/\1/')"

if [ -z "$TOKEN" ]; then
  echo "VERCEL_TOKEN not found in .env.local" >&2
  exit 1
fi

vercel deploy --token="$TOKEN" "$@"
