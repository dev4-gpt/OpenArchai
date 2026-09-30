#!/usr/bin/env bash
# AtelierOS — Start the AGY Python sidecar
# Run from the repo root: bash services/agy/start.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "📦 Installing AGY sidecar dependencies..."
pip install -r services/agy/requirements.txt -q

echo "🔑 Checking for GEMINI_API_KEY..."
if [ -f "apps/web/.env.local" ]; then
  # Export GEMINI_API_KEY from .env.local if present
  GEMINI_API_KEY=$(grep '^GEMINI_API_KEY=' apps/web/.env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
  if [ -n "$GEMINI_API_KEY" ]; then
    export GEMINI_API_KEY
    echo "✅ GEMINI_API_KEY loaded from apps/web/.env.local"
  else
    echo "⚠️  GEMINI_API_KEY not found in apps/web/.env.local"
    echo "   Add it: GEMINI_API_KEY=<your-key> in apps/web/.env.local"
    echo "   Get a key at: https://aistudio.google.com/app/api-keys"
  fi
fi

AGY_PORT="${AGY_PORT:-8765}"
echo "🚀 Starting AtelierOS AGY sidecar on port $AGY_PORT..."
python3 services/agy/server.py
