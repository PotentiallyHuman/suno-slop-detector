#!/usr/bin/env bash
# One command: serve the latest built APK over a fresh cloudflared tunnel + print/show a QR.
# (trycloudflare URLs die with the process — rerun this whenever a new QR is needed.)
set -e
cd "$(dirname "$0")/.."
APK=app/lyric-humanizer.apk
[ -f mobile/android/app/build/outputs/apk/release/app-release.apk ] && \
  cp mobile/android/app/build/outputs/apk/release/app-release.apk "$APK"
[ -f "$APK" ] || { echo "no APK found — build first (mobile/: build_www.py, cap sync, gradlew assembleRelease)"; exit 1; }

# http server (idempotent: reuse if already serving this dir)
if ! curl -sf http://localhost:8088/lyric-humanizer.apk -o /tmp/.apk_probe 2>/dev/null || ! cmp -s /tmp/.apk_probe "$APK"; then
  pkill -f "http.server 8088" 2>/dev/null || true
  sleep 1
  nohup python3 -m http.server 8088 --directory "$(pwd)/app" > /tmp/apk_http.log 2>&1 &
  sleep 1
fi

pkill -f "cloudflared tunnel --url http://localhost:8088" 2>/dev/null || true
nohup ~/bin/cloudflared tunnel --url http://localhost:8088 > /tmp/apk_tunnel.log 2>&1 &
echo "waiting for tunnel..."
for i in $(seq 1 30); do
  URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/apk_tunnel.log | head -1)
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "tunnel failed — see /tmp/apk_tunnel.log"; exit 1; }
FULL="$URL/lyric-humanizer.apk"
curl -sf "$FULL" -o /tmp/.apk_tunnel_check && cmp -s /tmp/.apk_tunnel_check "$APK" && echo "VERIFIED: tunnel serves the current APK"
echo "$FULL"
python3 - "$FULL" <<'PY'
import sys, qrcode
qr = qrcode.QRCode(); qr.add_data(sys.argv[1]); qr.print_ascii()
qr.make_image().save("/tmp/apk_qr.png")
PY
command -v xdg-open >/dev/null && DISPLAY=:1 xdg-open /tmp/apk_qr.png 2>/dev/null || true
