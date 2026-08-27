#!/usr/bin/env bash
# Encode a captured PNG sequence into seamlessly looping web video.
#
#   capture/encode.sh capture/frames/land 30 public/hero-land 1.5
#
# Approach and encoder settings follow the bake rig in the portfolio repo:
#
#  - The loop is made in the encode, not the capture. Each job captures
#    dur + X seconds, then assembles middle + xfade(tail, head, X), so the
#    <video loop> wrap point lands on blended frames and the seam is invisible
#    no matter what the animation is doing. Don't try to match clip length to
#    animation periods — the koi frequencies are incommensurate and it doesn't
#    matter with the crossfade.
#  - Three renditions: h264 (universal), HEVC 10-bit (Safari/iOS — the hvc1
#    tag is mandatory or Safari rejects the file), VP9 10-bit (Chrome/Firefox).
#  - 10-bit is not for banding: 8-bit 4:2:0 chroma subsampling eats thin
#    saturated detail, which here is the red koi fins against cyan water.
set -euo pipefail

DIR="${1:?frames dir}"
FPS="${2:-30}"
OUT="${3:?output basename}"
X="${4:-1.5}"

N=$(ls "$DIR"/*.png | wc -l | tr -d ' ')
XF=$(python3 -c "print(int(round($X * $FPS)))")
MID=$((N - XF))
T=$(sysctl -n hw.ncpu 2>/dev/null || echo 8)
T=$((T > 16 ? 16 : T))

echo "$OUT: frames=$N  crossfade=${XF}f  loop=$((N - XF))f"
mkdir -p "$(dirname "$OUT")"

# three reads of the same sequence: tail, head, middle.
# Order matters: middle plays FIRST and the crossfade sits at the END. Putting
# the blend first means the opening 1.5s is a cross-dissolve, which reads as a
# blur on load (and makes a soft poster frame). Either order loops seamlessly —
# blend start follows middle's last frame, blend end leads into middle's first.
INPUTS=(
  -framerate "$FPS" -start_number "$MID" -i "$DIR/f%05d.png"
  -framerate "$FPS" -start_number 0      -i "$DIR/f%05d.png"
  -framerate "$FPS" -start_number "$XF"  -i "$DIR/f%05d.png"
)
# xfade refuses variable-rate input, and a trimmed image2 stream reports 1/0 —
# so both crossfade legs get an explicit fps filter
FC="[0:v]trim=end_frame=$XF,setpts=PTS-STARTPTS,fps=$FPS[b];\
[1:v]trim=end_frame=$XF,setpts=PTS-STARTPTS,fps=$FPS[a];\
[b][a]xfade=transition=fade:duration=$X:offset=0[x];\
[2:v]trim=end_frame=$((MID - XF)),setpts=PTS-STARTPTS,fps=$FPS[m];\
[m][x]concat=n=2:v=1[out]"

echo "  h264…"
ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" \
  -filter_complex "$FC" -map '[out]' \
  -c:v libx264 -crf 18 -preset slow -pix_fmt yuv420p -profile:v high \
  -threads "$T" -movflags +faststart -an "$OUT.mp4"

echo "  hevc…"
ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" \
  -filter_complex "$FC" -map '[out]' \
  -c:v libx265 -crf 21 -preset medium -pix_fmt yuv420p10le \
  -tag:v hvc1 -x265-params "aq-mode=3:pools=$T:log-level=error" \
  -movflags +faststart -an "$OUT.hevc.mp4"

echo "  vp9…"
ffmpeg -y -hide_banner -loglevel error "${INPUTS[@]}" \
  -filter_complex "$FC" -map '[out]' \
  -c:v libvpx-vp9 -crf 32 -b:v 0 -pix_fmt yuv420p10le \
  -row-mt 1 -threads "$T" -deadline good -cpu-used 2 -an "$OUT.webm"

echo "  poster…"
ffmpeg -y -hide_banner -loglevel error -i "$OUT.mp4" -frames:v 1 -q:v 4 "$OUT.jpg"

ls -lh "$OUT".mp4 "$OUT".hevc.mp4 "$OUT".webm "$OUT".jpg | awk '{print $9, $5}'
