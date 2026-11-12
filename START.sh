#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  soccer.co.ke deploy"
echo "========================================"
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed (need 20+)."
  exit 1
fi

node scripts/check-deploy.js

if [ ! -f .env.local ]; then
  echo "Creating .env.local from .env.example ..."
  cp .env.example .env.local
  echo "Edit .env.local and set NEXT_PUBLIC_SITE_URL=https://your-domain.com"
  echo "Then run this script again."
  exit 0
fi

echo "Installing packages..."
npm install

echo "Building site..."
npm run build

echo ""
echo "========================================"
echo "  READY - open http://localhost:3000"
echo "  If Cloudflare shows 522, test IP:3000"
echo "  or set DNS to grey-cloud temporarily."
echo "  Press Ctrl+C to stop"
echo "========================================"
echo ""

npm start
