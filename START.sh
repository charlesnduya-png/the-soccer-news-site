#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  soccer.co.ke - installing and starting"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed (need 20+)."
  exit 1
fi

if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example ..."
  cp .env.example .env.local
  echo "Edit .env.local then run this script again."
  echo "  NEXT_PUBLIC_SITE_URL=https://your-domain.com"
  echo "  GNEWS_API_KEY=your-key (optional)"
  exit 0
fi

echo "Installing packages..."
npm install

echo "Building site..."
npm run build

echo ""
echo "========================================"
echo "  READY - open http://localhost:3000"
echo "  (or http://YOUR-SERVER-IP:3000)"
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

npm start
