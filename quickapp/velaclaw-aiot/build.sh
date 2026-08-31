#!/bin/sh

set -eu

echo "========================================"
echo "  vela_band - quality check and build"
echo "========================================"

if ! command -v node >/dev/null 2>&1; then
  echo "[vela_band] Node.js 18 or newer is required."
  exit 1
fi

if [ ! -x "node_modules/.bin/aiot" ]; then
  echo "[vela_band] Installing locked dependencies..."
  npm ci
fi

echo "[vela_band] Running project checks..."
npm run check

echo "[vela_band] Building JSC-enabled RPK..."
npm run build

echo "[vela_band] Build complete: dist/com.application.watch.demo.debug.1.0.0.rpk"
