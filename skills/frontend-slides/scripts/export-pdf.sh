#!/usr/bin/env bash
# Kept for older instructions. Same as: node scripts/export-pdf.mjs <deck.html> [out.pdf] [--raster]
set -euo pipefail
if ! command -v node >/dev/null 2>&1; then
    echo "Node.js is required: https://nodejs.org (or: brew install node)" >&2
    exit 1
fi
exec node "$(dirname "$0")/export-pdf.mjs" "$@"
