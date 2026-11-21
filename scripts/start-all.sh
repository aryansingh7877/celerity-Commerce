#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "Starting Celerity API on :4000 and Vite UI…"
node server/index.js &
API_PID=$!
trap 'kill $API_PID 2>/dev/null' EXIT
npm run dev
