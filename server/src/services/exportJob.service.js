const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('./ffmpegBinary');
const config = require('../config');
const projectService = require('./project.service');
const overlayRenderer = require('./overlayRenderer.service');
const { prepareImageAsset } = require('./assetPreprocess.service');
const { buildFilterGraph, resolveOutputSize, TRANSITION_DURATION } = require('./filterGraph.service');
const { buildStingerOutroConcat, buildAnimatedOutroLayer, buildStingerSoundEffectLabel } = require('./introOutro.service');
const { buildDuckedAudio } = require('./audioMix.service');
const { buildTimelineSoundEffectsAudio } = require('./soundEffects.service');
const { probeHasAudio } = require('./ffprobe.service');
const { getFontScale } = require('../utils/overlayGeometry');

const jobs = new Map();
const queue = [];
let running = false;

function setJob(jobId, patch) {
  jobs.set(jobId, { ...jobs.get(jobId), ...patch });
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

async function renderOverlayAssets(project, outW, outH, tmpDir) {
  const assets = { textLayerPngPaths: [] };
  const fontScale = getFontScale(project.aspectRatio, outW);

  if (project.headline?.main || project.headline?.sub) {
    const bannerPath = path.join(tmpDir, 'banner.png');
    await overlayRenderer.renderHeadlineBanner(project.headline, outW, outH, bannerPath, fontScale);
    assets.bannerPngPath = bannerPath;
  }

  if (project.ticker?.text) {
    const tickerPath = path.join(tmpDir, 'ticker.png');
    await overlayRenderer.renderTicker(project.ticker, outW, outH, tickerPath, fontScale);
    assets.tickerPngPath = tickerPath;
  }

  if (project.nameplate?.enabled && (project.nameplate?.name || project.nameplate?.title)) {
    const nameplatePath = path.join(tmpDir, 'nameplate.png');
    await overlayRenderer.renderNameplate(project.nameplate, project.headline?.bgColor, outW, outH, nameplatePath, fontScale);
    assets.nameplatePngPath = nameplatePath;
  }

  if (project.subscribeBar?.enabled) {
    const subscribeBarPath = path.join(tmpDir, 'subscribe-bar.png');
    await overlayRenderer.renderSubscribeBar(project.subscribeBar, outW, outH, subscribeBarPath);
    assets.subscribeBarPngPath = subscribeBarPath;
  }

  if (project.liveBadge?.enabled) {
    const liveBadgePath = path.join(tmpDir, 'live-badge.png');
    await overlayRenderer.renderLiveBadge(outW, outH, liveBadgePath);
    assets.liveBadgePngPath = liveBadgePath;
  }

  if (project.dateTimeStamp?.enabled) {
    const dateTimePath = path.join(tmpDir, 'date-time.png');
    await overlayRenderer.renderDateTimeStamp(project.dateTimeStamp, outW, outH, dateTimePath);
    assets.dateTimeStampPngPath = dateTimePath;
  }

  if (project.stinger?.enabled) {
    const stingerPath = path.join(tmpDir, 'stinger.png');
    await overlayRenderer.renderStingerCard(project.stinger, outW, outH, stingerPath);
    assets.stingerPngPath = stingerPath;
  }

  if (project.outro?.enabled) {
    if (project.logo?.assetUrl) {
      // Sized generously for a card badge, independent of the corner logo's own (often much
      // smaller) widthPct — the outro isn't constrained by needing to stay out of the way of
      // other overlays the way the persistent corner logo is. Always circular here regardless of
      // the corner logo's own shape setting — a circular avatar badge is the natural fit for
      // this "channel identity" placement.
      const logoWidthPx = Math.round(outH * 0.22);
      assets.outroLogoAsset = await prepareImageAsset(
        resolveMediaPath(project.logo.assetUrl),
        project.logo.kind,
        logoWidthPx,
        tmpDir,
        'outro-logo',
        'circle'
      );
    }
    assets.outroAssets = await overlayRenderer.renderOutroAssets(project.outro, outW, outH, tmpDir);
  }

  for (let i = 0; i < (project.textLayers || []).length; i++) {
    const layerPath = path.join(tmpDir, `text_${i}.png`);
    await overlayRenderer.renderTextLayer(project.textLayers[i], outW, outH, layerPath, fontScale);
    assets.textLayerPngPaths.push(layerPath);
  }

  if (project.logo?.assetUrl) {
    const widthPx = Math.round((project.logo.widthPct ?? 0.15) * outW);
    assets.logoAsset = await prepareImageAsset(
      resolveMediaPath(project.logo.assetUrl),
      project.logo.kind,
      widthPx,
      tmpDir,
      'logo',
      project.logo.shape
    );
  }

  if (project.watermark?.assetUrl) {
    const widthPx = Math.round((project.watermark.widthPct ?? 0.1) * outW);
    assets.watermarkAsset = await prepareImageAsset(
      resolveMediaPath(project.watermark.assetUrl),
      project.watermark.kind,
      widthPx,
      tmpDir,
      'watermark',
      project.watermark.shape
    );
  }

  if (project.watermark?.text) {
    const watermarkTextPath = path.join(tmpDir, 'watermark-text.png');
    // Tinted with the current template's accent color so the drifting watermark reads as
    // branded rather than a plain gray bar.
    await overlayRenderer.renderWatermarkText(project.watermark, project.headline?.bgColor, outW, outH, watermarkTextPath, fontScale);
    assets.watermarkTextPngPath = watermarkTextPath;
  }

  return assets;
}

function resolveMediaPath(assetUrl) {
  // assetUrl looks like "/media/logos/<file>" or "/media/uploads/<file>"
  const parts = assetUrl.split('/').filter(Boolean); // ["media","logos","<file>"]
  const [, category, filename] = parts;
  return path.join(config.storage[category], filename);
}

/**
 * Resolves each source-mode's on-disk paths + timing into the shape
 * filterGraph.service.js's buildBaseVideoStream expects. Keeping this resolution here (rather
 * than inside filterGraph.service.js) keeps that module a pure function of already-resolved
 * data, consistent with how the single-video path always worked.
 */
function resolveBaseSources(project) {
  const mode = project.sourceMode || 'single';

  if (mode === 'images') {
    return (project.images || []).map((img) => ({
      path: resolveMediaPath(img.url),
      durationSec: img.durationSec || 3
    }));
  }

  if (mode === 'split' || mode === 'sequential') {
    return (project.splitClips || []).slice(0, 2).map((clip) => ({
      path: resolveMediaPath(clip.sourceVideo.url || `/media/uploads/${clip.sourceVideo.filename}`),
      startSec: clip.trim?.startSec ?? 0,
      endSec: clip.trim?.endSec ?? clip.sourceVideo.metadata?.duration ?? 0
    }));
  }

  if (mode === 'pip') {
    const pipClip = project.pipClip || {};
    return {
      main: {
        path: resolveMediaPath(project.sourceVideo.url || `/media/uploads/${project.sourceVideo.filename}`),
        startSec: project.trim?.startSec ?? 0,
        endSec: project.trim?.endSec ?? project.sourceVideo.metadata?.duration ?? 0
      },
      pip: {
        path: resolveMediaPath(pipClip.sourceVideo.url || `/media/uploads/${pipClip.sourceVideo.filename}`),
        startSec: pipClip.trim?.startSec ?? 0,
        endSec: pipClip.trim?.endSec ?? pipClip.sourceVideo.metadata?.duration ?? 0
      }
    };
  }

  return {
    path: resolveMediaPath(project.sourceVideo.url || `/media/uploads/${project.sourceVideo.filename}`),
    startSec: project.trim?.startSec ?? 0,
    endSec: project.trim?.endSec ?? project.sourceVideo.metadata?.duration ?? 0
  };
}

/** Overall exported duration, by source mode. */
function computeDurationSec(project, baseSources) {
  const mode = project.sourceMode || 'single';

  if (mode === 'images') {
    const durations = baseSources.map((img) => Math.max(0.1, img.durationSec || 3));
    if (project.transitionStyle !== 'crossfade' || durations.length < 2) {
      return Math.max(0.1, durations.reduce((sum, d) => sum + d, 0));
    }
    // Mirrors filterGraph.service.js's per-boundary crossfade guard exactly — a hard cut (no
    // shrinkage) at any boundary where either side is too short for a full transition.
    const D = TRANSITION_DURATION;
    let total = durations[0];
    for (let i = 1; i < durations.length; i++) {
      total += durations[i - 1] >= 2 * D && durations[i] >= 2 * D ? durations[i] - D : durations[i];
    }
    return Math.max(0.1, total);
  }

  if (mode === 'split') {
    const lengths = baseSources.map((c) => (c.endSec ?? 0) - (c.startSec ?? 0));
    if (project.splitAlternate) {
      // Alternate Playback hands off turn-by-turn (A plays, freezes; B freezes, plays) — total
      // length is the sum of both turns, matching Sequential's timing.
      return Math.max(0.1, lengths.reduce((sum, l) => sum + l, 0));
    }
    // Simultaneous split screen: the shorter of the two trimmed clips, since both play at
    // once — neither track should freeze on its last frame while the other keeps playing.
    return Math.max(0.1, Math.min(...lengths));
  }

  if (mode === 'sequential') {
    // Clip A plays fully, then Clip B — total length is the sum, not the shorter of the two.
    const lengths = baseSources.map((c) => (c.endSec ?? 0) - (c.startSec ?? 0));
    const D = TRANSITION_DURATION;
    const crossfading =
      project.transitionStyle === 'crossfade' && lengths.length === 2 && lengths[0] >= 2 * D && lengths[1] >= 2 * D;
    if (crossfading) return Math.max(0.1, lengths[0] + lengths[1] - D);
    return Math.max(0.1, lengths.reduce((sum, l) => sum + l, 0));
  }

  if (mode === 'pip') {
    // The small clip's own length never extends the export — it freezes on its last frame (via
    // overlay's default repeatlast) if shorter, and simply gets cut off with everything else if
    // longer. Only the main clip's trim governs the overall duration.
    return Math.max(0.1, (baseSources.main.endSec ?? 0) - (baseSources.main.startSec ?? 0));
  }

  return Math.max(0.1, (baseSources.endSec ?? 0) - (baseSources.startSec ?? 0));
}

async function runExport(jobId, projectId) {
  setJob(jobId, { status: 'processing', progress: 0 });

  const project = await projectService.getProject(projectId);
  const tmpDir = path.join(config.storage.tmp, jobId);
  await fsp.mkdir(tmpDir, { recursive: true });

  const [outW, outH] = resolveOutputSize(project.aspectRatio, project.exportSettings?.resolution || '1080p');
  const baseSources = resolveBaseSources(project);

  const assets = await renderOverlayAssets(project, outW, outH, tmpDir);
  const { inputs, filters, outputLabel, hasLoopedInput, audioLabel } = buildFilterGraph(project, assets, baseSources);

  const durationSec = computeDurationSec(project, baseSources);
  const fps = project.exportSettings?.fps || 30;
  const codec = project.exportSettings?.codec === 'h265' ? 'libx265' : 'libx264';
  const outputFilename = `${jobId}.mp4`;
  const outputPath = path.join(config.storage.exports, outputFilename);

  // Bare (unbracketed) labels throughout — buildFilterGraph's outputLabel already comes back
  // wrapped as "[xxx]" for direct use in -map, so it's the one exception that needs stripping.
  let mainVideoLabel = outputLabel.slice(1, -1);
  let mainAudioLabel = audioLabel;
  let finalDurationSec = durationSec;

  // Referencing "[0:a]" inside complexFilter hard-fails if that stream doesn't exist (unlike
  // "-map 0:a?", which safely no-ops) — probed lazily and only once, since both music mixing and
  // stinger/outro concat need the same answer for modes that fell back to the raw input-0 audio.
  let mainHasAudioCache = null;
  async function mainHasAudio() {
    if (mainHasAudioCache !== null) return mainHasAudioCache;
    const mode = project.sourceMode || 'single';
    if (mode === 'images') mainHasAudioCache = false;
    else if (mode === 'split') mainHasAudioCache = await probeHasAudio(baseSources[0].path);
    else if (mode === 'pip') mainHasAudioCache = await probeHasAudio(baseSources.main.path);
    else mainHasAudioCache = await probeHasAudio(baseSources.path);
    return mainHasAudioCache;
  }

  // Custom Audio Replacement: entirely discards whatever audio the source video/clips carried
  // (named pad or raw input-0 stream alike — replacing mainAudioLabel here means neither is ever
  // referenced downstream) and substitutes the uploaded track instead. Runs BEFORE music mixing
  // so a background-music track, if also enabled, ducks under this replacement audio exactly like
  // it would duck under the original speech — voiceover-over-video is the intended use case.
  if (project.customAudio?.assetUrl) {
    const customIdx = inputs.length;
    inputs.push({ path: resolveMediaPath(project.customAudio.assetUrl), options: ['-stream_loop', '-1'] });
    filters.push(
      `[${customIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[customAudio]`
    );
    mainAudioLabel = 'customAudio';
  }

  if (project.music?.assetUrl) {
    const musicIdx = inputs.length;
    inputs.push({ path: resolveMediaPath(project.music.assetUrl), options: ['-stream_loop', '-1'] });
    const mixed = buildDuckedAudio({
      filters,
      mainAudioLabel,
      mainHasAudio: mainAudioLabel ? true : await mainHasAudio(),
      musicInputIdx: musicIdx,
      durationSec,
      volume: project.music.volume ?? 0.3,
      duckingEnabled: project.music.duckingEnabled !== false
    });
    mainAudioLabel = mixed.audioLabel;
  }

  // Timeline sound effects (user-placed, at a chosen startSec) — mixed in on top of whatever
  // audio survived the stages above, so they layer over ducked music/voiceover/original speech
  // alike. Runs on the main-content-only timeline, before any stinger prepends time in front of
  // it, so a chosen startSec always means "N seconds into the main video" regardless of stinger.
  if (project.soundEffects?.length) {
    mainAudioLabel = buildTimelineSoundEffectsAudio({
      filters,
      mainAudioLabel,
      mainHasAudio: mainAudioLabel ? true : await mainHasAudio(),
      soundEffects: project.soundEffects,
      durationSec
    });
  }

  if (project.stinger?.enabled || project.outro?.enabled) {
    const wrapped = buildStingerOutroConcat({
      project,
      inputs,
      filters,
      videoLabel: mainVideoLabel,
      audioLabel: mainAudioLabel,
      mainHasAudio: mainAudioLabel ? true : await mainHasAudio(),
      mainDurationSec: durationSec,
      outW,
      outH,
      fps,
      assets
    });
    mainVideoLabel = wrapped.videoLabel;
    mainAudioLabel = wrapped.audioLabel;
    finalDurationSec = wrapped.totalDurationSec;
  }

  await new Promise((resolve, reject) => {
    const command = ffmpeg();

    inputs.forEach((input) => {
      command.input(input.path);
      if (input.options.length) command.inputOptions(input.options);
    });

    // Sequential mode (and now stinger/outro concat) synthesizes its own named audio pad via
    // filterGraph.service.js / introOutro.service.js, so it maps that labeled pad instead of
    // input 0's audio directly.
    const audioMapArgs = mainAudioLabel ? ['-map', `[${mainAudioLabel}]`] : ['-map', '0:a?'];

    const outputOptions = [
      '-map', `[${mainVideoLabel}]`,
      ...audioMapArgs,
      '-c:v', codec,
      '-preset', 'medium',
      '-crf', codec === 'libx265' ? '24' : '20',
      '-r', String(fps),
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-t', String(finalDurationSec)
    ];
    if (codec === 'libx265') outputOptions.push('-tag:v', 'hvc1');
    if (hasLoopedInput) outputOptions.push('-shortest');

    command
      .complexFilter(filters)
      .outputOptions(outputOptions)
      .on('progress', (p) => {
        const percent = p.percent
          ? Math.min(99, Math.round(p.percent))
          : Math.min(99, Math.round(((p.timemark ? timemarkToSeconds(p.timemark) : 0) / finalDurationSec) * 100));
        setJob(jobId, { progress: percent });
      })
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(outputPath);
  });

  await fsp.rm(tmpDir, { recursive: true, force: true });
  setJob(jobId, { status: 'done', progress: 100, outputFilename, downloadUrl: `/api/export/${jobId}/download` });
}

function timemarkToSeconds(timemark) {
  const parts = timemark.split(':').map(Number);
  return parts.reduceRight((acc, val, i, arr) => acc + val * Math.pow(60, arr.length - 1 - i), 0);
}

function processQueue() {
  if (running || queue.length === 0) return;
  running = true;
  const { jobId, projectId } = queue.shift();

  runExport(jobId, projectId)
    .catch((err) => setJob(jobId, { status: 'error', error: err.message }))
    .finally(() => {
      running = false;
      processQueue();
    });
}

/**
 * Renders JUST the animated outro sequence (no main video needed at all) so it can be checked
 * on its own before being attached to a full export — reuses the exact same
 * introOutro.service.js compositing as the real export, so what's previewed here is pixel-for-
 * pixel what a real export's outro segment would look like. Runs synchronously (outro clips are
 * only a few seconds, fast to render) rather than going through the job-queue/polling machinery
 * the main export uses.
 */
async function runOutroPreview({ outro, logo, aspectRatio, resolution }) {
  const previewId = uuidv4();
  const tmpDir = path.join(config.storage.tmp, `outro-preview-${previewId}`);
  await fsp.mkdir(tmpDir, { recursive: true });

  try {
    const [outW, outH] = resolveOutputSize(aspectRatio || '16:9', resolution || '720p');
    const fps = 30;
    const durationSec = outro?.durationSec || 5;

    const outroAssets = await overlayRenderer.renderOutroAssets(outro || {}, outW, outH, tmpDir);
    let outroLogoAsset = null;
    if (logo?.assetUrl) {
      const logoWidthPx = Math.round(outH * 0.22);
      outroLogoAsset = await prepareImageAsset(resolveMediaPath(logo.assetUrl), logo.kind, logoWidthPx, tmpDir, 'outro-logo', 'circle');
    }

    const inputs = [];
    const filters = [];
    const { videoLabel, audioLabel } = buildAnimatedOutroLayer({
      inputs,
      filters,
      outroAssets,
      logoAsset: outroLogoAsset,
      durationSec,
      outW,
      outH,
      fps
    });

    const outputFilename = `outro-preview-${previewId}.mp4`;
    const outputPath = path.join(config.storage.exports, outputFilename);

    await new Promise((resolve, reject) => {
      const command = ffmpeg();
      inputs.forEach((input) => {
        command.input(input.path);
        if (input.options.length) command.inputOptions(input.options);
      });
      command
        .complexFilter(filters)
        .outputOptions([
          '-map', `[${videoLabel}]`,
          '-map', `[${audioLabel}]`,
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-r', String(fps),
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-t', String(durationSec)
        ])
        .on('error', (err) => reject(err))
        .on('end', () => resolve())
        .save(outputPath);
    });

    return { url: `/media/exports/${outputFilename}` };
  } finally {
    await fsp.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Renders JUST a stinger sound effect on its own — no video, no real file inputs at all (every
 * option is a synthetic FFmpeg generator filter: noise/tone sources, not a downloaded/licensed
 * sample) — so it can be auditioned instantly before deciding to attach it to the stinger. Shares
 * `buildStingerSoundEffectLabel` with the real export, so what's previewed here is exactly what
 * would play in the actual output.
 */
async function runStingerSfxPreview(soundEffect) {
  const filters = [];
  const previewDurationSec = 1.2;
  const label = buildStingerSoundEffectLabel(filters, soundEffect, previewDurationSec);
  if (!label) throw new Error(`Unknown sound effect: ${soundEffect}`);

  const previewId = uuidv4();
  const outputFilename = `sfx-preview-${previewId}.mp3`;
  const outputPath = path.join(config.storage.exports, outputFilename);

  await new Promise((resolve, reject) => {
    ffmpeg()
      .complexFilter(filters)
      .outputOptions(['-map', `[${label}]`, '-c:a', 'libmp3lame', '-t', String(previewDurationSec)])
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(outputPath);
  });

  return { url: `/media/exports/${outputFilename}` };
}

function startExportJob(projectId) {
  const jobId = uuidv4();
  jobs.set(jobId, { status: 'queued', progress: 0 });
  queue.push({ jobId, projectId });
  processQueue();
  return jobId;
}

module.exports = { startExportJob, getJob, runOutroPreview, runStingerSfxPreview };
