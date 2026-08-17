# News Studio — News-Style Video Editor

A local-first web app for turning raw footage into broadcast-style news videos: headline
banners, scrolling tickers, logos/watermarks, freeform text overlays, and multi-resolution
MP4 export — all rendered by FFmpeg on your own machine, no cloud, no AI-generated content.

## Stack

- **Client:** React (Vite) + Tailwind CSS + React Router + Zustand
- **Server:** Node.js + Express + fluent-ffmpeg
- **Rendering:** every text-bearing overlay (headline banner, ticker, freeform text) is
  pre-rendered server-side to a transparent PNG via `@napi-rs/canvas`, then composited onto the
  video with FFmpeg's `overlay` filter — the live browser preview uses the same normalized
  position math (`utils/overlayGeometry.js`, kept in sync between `client/` and `server/`) so
  what you see in the preview matches the export.
- **Storage:** local filesystem only (`server/storage/`) — no database, no cloud dependency.

## Prerequisites

- Node.js 18+ and npm
- **FFmpeg + FFprobe** — required for thumbnails, metadata probing, and export.

  A portable build is already vendored at `server/vendor/ffmpeg-master-latest-win64-gpl/bin/`
  and wired up via `server/.env` (`FFMPEG_PATH` / `FFPROBE_PATH`, read by `server/src/config.js`)
  — nothing to install to run this checkout as-is. If you move/redeploy the project, either:
  - keep the `server/vendor/` folder and update the paths in `server/.env` to match, or
  - install FFmpeg system-wide instead (`winget install Gyan.FFmpeg`, then restart your
    terminal so `ffmpeg`/`ffprobe` are on PATH) and delete `server/.env` so the server falls
    back to PATH resolution.

## Setup

```bash
npm install          # installs both client/ and server/ workspaces
```

## Run (development)

Two terminals (or `npm run dev` from the repo root to launch both):

```bash
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173 (proxies /api and /media to the server)
```

Open http://localhost:5173, click **+ New Project**, upload a video, and start editing.

## Project structure

```
client/    React app — pages/, components/{layout,sidebar,preview,timeline,common}/,
           store/ (zustand project state), api/, templates/, utils/
server/    Express app — routes/, controllers/, services/ (ffprobe, thumbnail, overlay
           rendering, asset preprocessing, filter-graph building, export orchestration),
           storage/ (uploads, thumbnails, logos, projects, exports — all gitignored)
```

## Verified working end-to-end

The full pipeline has been run for real (not just unit-tested): upload a video → apply a
template → set headline/ticker/logo/watermark/text layer → live preview renders all overlays →
export → FFmpeg produces a valid H.264 1080p30 MP4 with every overlay correctly burned in
(confirmed by extracting a frame from the actual output file). No console errors across the
dashboard or any editor panel.

## What's implemented (Phase 1)

- Video upload (MP4/MOV/MKV/WEBM) with metadata (duration/resolution/fps/size) + thumbnail
- 3 news templates (Breaking News, General News, Business News) — fully editable after applying
- Headline banner (main/sub/location/reporter, color/opacity/font/padding/border-radius/position)
- Scrolling ticker (LTR/RTL, speed, colors, font size)
- Logo (PNG/SVG/animated GIF) with position/size/opacity/margin/safe-area-snap toggle
- Watermark (corner presets or custom position, opacity, full-duration)
- Unlimited freeform text layers (position, rotation, background, opacity, shadow, stroke)
- Single-clip trim (start/end)
- Live in-browser preview compositing all of the above over the source video
- Export: MP4, H.264/H.265, 720p/1080p/1440p/4K, 24/30/60 FPS, with a progress-polling UI
- Save/load/delete projects (stored as JSON on disk)
- Pre-export compliance warnings (headline length, out-of-frame text layers, upscaling risk)

## Not yet implemented (Phase 2 backlog)

- Remaining 4 templates (Live Update, Political, Sports, Technology)
- Split-screen modes (vertical / horizontal / sequential shorts)
- Safe-area guide overlays in the preview
- Multi-clip cut/rearrange timeline (currently single-clip trim only)
- Deeper compliance checks (e.g. logo-covers-important-content detection)

## Deliberately not implemented (by design)

Per YouTube content-policy guidance, this tool intentionally has **no** AI-generated content
features: no deepfakes, voice cloning, face replacement, synthetic humans, misleading
breaking-news branding, or third-party content downloading. Everything you see in an export is
footage and text you provided and positioned yourself.

## Known dev-only note

The Vite dev server's HMR websocket is only intended for local use — don't expose port 5173 to
an untrusted network while developing.
