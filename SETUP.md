# Setup Guide

Steps to get this project running from a fresh clone.

## 1. Prerequisites

- **Node.js 18+** and npm — https://nodejs.org (LTS version)
- **Git**
- **FFmpeg + FFprobe** — required for thumbnails, metadata probing, and export. Setup options are
  in step 4 below.

## 2. Clone the repository

```bash
git clone https://github.com/Nishant70-sharma/news-video-editor.git
cd news-video-editor
```

## 3. Install dependencies

One command installs both the `client/` and `server/` workspaces:

```bash
npm install
```

## 4. Set up FFmpeg

Pick one:

**Option A — system-wide install (simplest, recommended)**

```bash
winget install Gyan.FFmpeg
```

Restart your terminal afterward so `ffmpeg`/`ffprobe` are on PATH. Nothing else to configure —
the server falls back to PATH resolution automatically when no explicit path is set.

**Option B — portable/vendored build**

1. Download a static FFmpeg build, e.g. `ffmpeg-master-latest-win64-gpl.zip` from
   [BtbN/FFmpeg-Builds](https://github.com/BtbN/FFmpeg-Builds/releases).
2. Extract it into `server/vendor/ffmpeg-master-latest-win64-gpl/` (this folder is gitignored —
   it won't come from the clone, you place it yourself).
3. Create `server/.env` (also gitignored) with:
   ```
   FFMPEG_PATH=<absolute-path>\server\vendor\ffmpeg-master-latest-win64-gpl\bin\ffmpeg.exe
   FFPROBE_PATH=<absolute-path>\server\vendor\ffmpeg-master-latest-win64-gpl\bin\ffprobe.exe
   ```

## 5. Run the dev servers

From the repo root, either one command:

```bash
npm run dev
```

or two separate terminals:

```bash
npm run dev:server   # http://localhost:5000
npm run dev:client   # http://localhost:5173 (proxies /api and /media to the server)
```

## 6. Open the app

Go to `http://localhost:5173`, click **+ New Project**, upload a video, and start editing.

## 7. Verify it's working

Upload a short video and click **Export** right away (default settings are fine). If it produces
a downloadable MP4, FFmpeg is correctly detected and the whole pipeline is working end-to-end.

## Project structure

```
client/    React app — pages/, components/{layout,sidebar,preview,timeline,common}/,
           store/ (zustand project state), api/, templates/, utils/
server/    Express app — routes/, controllers/, services/ (ffprobe, thumbnail, overlay
           rendering, asset preprocessing, filter-graph building, export orchestration),
           storage/ (uploads, thumbnails, logos, images, music, projects, exports —
           all gitignored, created automatically on first run)
```

## Troubleshooting

- **Export fails immediately / "ffmpeg not found"**: FFmpeg isn't on PATH and no `server/.env`
  is pointing at a vendored build — redo step 4.
- **Port already in use**: something else is already listening on 5000 or 5173 — stop it, or
  change the port (`server/src/config.js`'s `port`, and `client/vite.config.js`'s `server.port`).
- **Uploads/exports "disappear" after a server restart**: they don't — they're just gitignored
  local files in `server/storage/`, untouched by git operations; check that folder directly.
