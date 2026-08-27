#!/usr/bin/env bash
# Capture and encode both hero orientations.
#
# Runs against a production preview build, not the dev server: HMR reloading
# the page mid-run resets the capture clock and kills the grab.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT="${PORT:-4173}"
SECS="${SECS:-20}"
FPS="${FPS:-30}"
XFADE="${XFADE:-1.5}"

echo "=== build + preview ==="
npm run build
npx vite preview --port "$PORT" --strictPort >/tmp/preview.log 2>&1 &
PREVIEW=$!
trap 'kill $PREVIEW 2>/dev/null || true' EXIT
until curl -sf "http://localhost:$PORT/" >/dev/null; do sleep 0.5; done

echo "=== landscape: 2560x1440 ==="
node capture/grab.mjs --w 1280 --h 720 --dpr 2 --fps "$FPS" --secs "$SECS" \
  --warm 7000 --port "$PORT" --out capture/frames/land

echo "=== portrait: 1440x2560 ==="
node capture/grab.mjs --w 720 --h 1280 --dpr 2 --fps "$FPS" --secs "$SECS" \
  --warm 7000 --camz 1500 --port "$PORT" --out capture/frames/port

echo "=== encode ==="
capture/encode.sh capture/frames/land "$FPS" public/hero-land "$XFADE"
capture/encode.sh capture/frames/port "$FPS" public/hero-port "$XFADE"

echo "=== done ==="
ls -lh public/hero-* | awk '{print $9, $5}'
