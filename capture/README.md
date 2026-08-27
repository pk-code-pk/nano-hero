# Hero bake rig

Films the live WebGL koi pond into the looping clips in `../public/`. Everything
needed to re-record after a scene change lives here.

## Re-record

```bash
# captures both orientations and encodes all renditions (~35 min)
caffeinate -i env SECS=20 FPS=30 XFADE=1.5 ./capture/run.sh
```

Frames go to `capture/frames/` (gitignored, safe to delete). Outputs land in
`public/` as `hero-{land,port}.{mp4,hevc.mp4,webm,jpg}`.

To re-encode without re-capturing, run `encode.sh` directly:

```bash
./capture/encode.sh capture/frames/land 30 public/hero-land 1.5
./capture/fallback.sh capture/frames/land 30 public/hero-land 1.5 1920
```

## How it works — read before touching

- **Runs against a production build, not the dev server.** HMR reloading the
  page mid-capture resets the clock and kills the run. `run.sh` builds, starts
  `vite preview`, and captures against that.
- **The scene's only time source is `window.__captureTime`** (see
  `src/renderClock.ts`), set externally per frame. After each present the page
  publishes `window.__renderedTime`, and the grabber waits for the exact
  timestamp it asked for. Waiting on a couple of rAFs instead is not enough —
  it produced duplicate frames.
- **The loop is made in the encode, not the capture.** Each run captures
  `SECS`, then assembles `xfade(tail, head, XFADE) + middle`, so the
  `<video loop>` wrap point lands on blended frames and the seam is invisible
  regardless of what the animation is doing. Don't try to make clip length
  match animation periods — the koi use incommensurate sine frequencies and
  never repeat, and with the crossfade none of that matters.
- **`xfade` needs constant frame rate.** A trimmed image2 stream reports `1/0`,
  which fails with "Could not open encoder before EOF". Both crossfade legs get
  an explicit `fps` filter.
- **Renditions**: HEVC crf21 10-bit `hvc1` (Safari/iOS — the tag is mandatory
  or Safari rejects the file), VP9 crf32 10-bit (Chrome/Firefox), H.264 crf20
  1080p (fallback only, so it doesn't need native resolution). 10-bit is not
  about banding: 8-bit 4:2:0 chroma subsampling smears the thin red koi fins
  against the cyan water. No 8-bit VP9 — at matched quality it came out larger
  than H.264 on this content.
- **Capture mode bypasses the mobile quality profile** (`AsciiPass`) since it
  runs offline, and takes framing from `&camz=N` — portrait uses 1500 so the
  narrow FOV doesn't crop the school.
- **Scene requirement**: the koi bodies are displaced in a vertex shader, so
  their geometry bounds don't follow the animation. `OneKoi` sets
  `frustumCulled = false` on its meshes; keep it, or fish pop out at the frame
  edges (worst in portrait).

## Capture hooks (`?capture=1` only)

| hook | what |
|---|---|
| `window.__captureTime` | external clock in seconds; the scene's only time source |
| `window.__renderedTime` | set after each present, so the grabber can wait for an exact frame |
| `&camz=N` | camera distance, for per-orientation framing |

All of it is one `URLSearchParams` check on the visitor path.
