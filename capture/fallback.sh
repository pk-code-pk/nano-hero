#!/usr/bin/env bash
# Re-encode only the H.264 fallback at a smaller resolution.
#
# HEVC and VP9 cover every current browser (Safari/iOS and Chrome/Firefox/Edge
# respectively), so the h264 file exists purely for old clients. Shipping it at
# native 1440p cost 16MB that nobody downloads; 1080p is plenty for a fallback.
#
#   capture/fallback.sh capture/frames/land 30 public/hero-land 1.5 1920
set -euo pipefail

DIR="${1:?frames dir}"; FPS="${2:-30}"; OUT="${3:?out}"; X="${4:-1.5}"; W="${5:-1920}"
N=$(ls "$DIR"/*.png | wc -l | tr -d ' ')
XF=$(python3 -c "print(int(round($X * $FPS)))")
MID=$((N - XF))
T=$(sysctl -n hw.ncpu 2>/dev/null || echo 8); T=$((T > 16 ? 16 : T))

FC="[0:v]trim=end_frame=$XF,setpts=PTS-STARTPTS,fps=$FPS[b];\
[1:v]trim=end_frame=$XF,setpts=PTS-STARTPTS,fps=$FPS[a];\
[b][a]xfade=transition=fade:duration=$X:offset=0[x];\
[2:v]trim=end_frame=$((MID - XF)),setpts=PTS-STARTPTS,fps=$FPS[m];\
[x][m]concat=n=2:v=1[c];[c]scale=$W:-2[out]"

ffmpeg -y -hide_banner -loglevel error \
  -framerate "$FPS" -start_number "$MID" -i "$DIR/f%05d.png" \
  -framerate "$FPS" -start_number 0      -i "$DIR/f%05d.png" \
  -framerate "$FPS" -start_number "$XF"  -i "$DIR/f%05d.png" \
  -filter_complex "$FC" -map '[out]' \
  -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -profile:v high \
  -threads "$T" -movflags +faststart -an "$OUT.mp4"

ls -lh "$OUT.mp4" | awk '{print $9, $5}'
