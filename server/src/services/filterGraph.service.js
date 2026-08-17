const { resolveBoxPx, subscribeBarBox, watermarkTextBox } = require('../utils/overlayGeometry');

/** Color grading presets, applied once to the whole base video before any overlay compositing. */
const COLOR_GRADE_FILTERS = {
  newsBlue: 'eq=contrast=1.08:saturation=0.9:brightness=0.01,colorbalance=rs=-0.08:gs=-0.02:bs=0.12:rm=-0.05:bm=0.08',
  warm: 'eq=contrast=1.05:saturation=1.1:brightness=0.02,colorbalance=rs=0.1:gs=0.03:bs=-0.08',
  highContrast: 'eq=contrast=1.25:saturation=1.15:brightness=-0.02'
};

/**
 * Entrance-animation duration for headline/ticker/text-layer overlays, in seconds. Must match
 * client/src/utils/animation.js's ENTRANCE_DURATION so the export's timing matches what the
 * live preview showed.
 */
const ENTRANCE_DURATION = 0.6;

/**
 * Crossfade duration (seconds) for Images-to-Video / Sequential transitions. Any boundary where
 * either adjacent clip/image is shorter than 2x this falls back to a hard cut instead — a
 * transition can't consume more than half of either side without invalid math.
 */
const TRANSITION_DURATION = 0.6;

/** Ken Burns zoom-per-frame rate — chosen so a ~3-4s image visibly zooms without feeling frantic. */
const KEN_BURNS_ZOOM_RATE = 0.0015;
const KEN_BURNS_MAX_ZOOM = 1.5;

/**
 * Any non-'none' animation gets an alpha fade-in on the source pad — the client's slide
 * keyframes animate opacity 0->1 alongside the transform in the same keyframe, so a slide
 * entrance without this would pop in at full opacity instead of fading in like the preview did.
 * Returns the new label to composite from, or `sourceLabel` unchanged if animation is 'none'.
 */
function withEntranceFade(filters, sourceLabel, animation, tag) {
  if (!animation || animation === 'none') return sourceLabel;
  const outLabel = `${tag}_faded`;
  filters.push(`[${sourceLabel}]fade=t=in:st=0:d=${ENTRANCE_DURATION}:alpha=1[${outLabel}]`);
  return outLabel;
}

/**
 * Overlay x/y expressions for a directional slide entrance: the source PNG is a full-canvas
 * transparent image with content already baked in at its final on-canvas position, so "sliding"
 * just means offsetting the whole overlay's (x,y) from off-screen back to (finalX,finalY) over
 * ENTRANCE_DURATION seconds — identical in spirit to the client's translateX/Y keyframes.
 */
function entranceOverlayXY(animation, canvasW, canvasH, finalX, finalY) {
  const D = ENTRANCE_DURATION;
  const horizontalOffset = Math.round(canvasW * 0.35);
  const verticalOffset = Math.round(canvasH * 0.35);

  switch (animation) {
    case 'slide-left': // enters from the right, slides left into place
      return { x: `if(lt(t,${D}),${finalX}+${horizontalOffset}*(1-t/${D}),${finalX})`, y: String(finalY), needsEval: true };
    case 'slide-right': // enters from the left, slides right into place
      return { x: `if(lt(t,${D}),${finalX}-${horizontalOffset}*(1-t/${D}),${finalX})`, y: String(finalY), needsEval: true };
    case 'slide-up': // enters from below, slides up into place
      return { x: String(finalX), y: `if(lt(t,${D}),${finalY}+${verticalOffset}*(1-t/${D}),${finalY})`, needsEval: true };
    case 'slide-down': // enters from above, slides down into place
      return { x: String(finalX), y: `if(lt(t,${D}),${finalY}-${verticalOffset}*(1-t/${D}),${finalY})`, needsEval: true };
    default:
      return { x: String(finalX), y: String(finalY), needsEval: false };
  }
}

/** Builds the `overlay=x=...:y=...[:eval=frame]` fragment (without the leading `[in][in2]`). */
function overlayPositionFragment(pos) {
  const x = pos.needsEval ? `'${pos.x}'` : pos.x;
  const y = pos.needsEval ? `'${pos.y}'` : pos.y;
  return `x=${x}:y=${y}${pos.needsEval ? ':eval=frame' : ''}`;
}

const RESOLUTIONS = {
  '16:9': { '720p': [1280, 720], '1080p': [1920, 1080], '1440p': [2560, 1440], '4k': [3840, 2160] },
  '9:16': { '720p': [720, 1280], '1080p': [1080, 1920], '1440p': [1440, 2560], '4k': [2160, 3840] },
  '1:1': { '720p': [720, 720], '1080p': [1080, 1080], '1440p': [1440, 1440], '4k': [2160, 2160] },
  '4:5': { '720p': [864, 1080], '1080p': [1080, 1350], '1440p': [1440, 1800], '4k': [2160, 2700] }
};

function resolveOutputSize(aspectRatio, resolution) {
  const byAspect = RESOLUTIONS[aspectRatio] || RESOLUTIONS['16:9'];
  return byAspect[resolution] || byAspect['1080p'];
}

function logoOverlayPosition(logo, canvasW, canvasH) {
  const widthPx = Math.round((logo.widthPct ?? 0.15) * canvasW);
  // Circle shape forces a square footprint (heightPx == widthPx) so bottom/right anchors are
  // computed against the image's actual on-screen size instead of assuming zero height.
  const heightPct = logo.shape === 'circle' ? widthPx / canvasH : 0;
  const box = resolveBoxPx(
    { position: logo.position, xPct: logo.xPct, yPct: logo.yPct, widthPct: logo.widthPct ?? 0.15, heightPct, marginPx: logo.marginPx ?? 24 },
    canvasW,
    canvasH
  );
  return { x: box.x, y: box.y, widthPx };
}

function trimInputOptions(clip) {
  const start = clip.startSec ?? 0;
  const end = clip.endSec ?? 0;
  const options = [];
  if (start > 0) options.push('-ss', String(start));
  options.push('-t', String(Math.max(0.1, end - start)));
  return options;
}

/**
 * Pushes whatever inputs/filters are needed to build the "base" video layer — everything
 * downstream (banner/ticker/text/logo/watermark) composes on top of this one label regardless
 * of source mode, so only this function needs to know about `single` vs `images` vs `split` vs
 * `sequential`. Returns `{ videoLabel, audioLabel }` — `audioLabel` is null for modes that
 * should fall back to the default `-map 0:a?` (single/images/split all keep input 0's audio,
 * or have none), and set for `sequential`, whose audio is synthesized from both clips.
 */
function buildBaseVideoStream(project, baseSources, inputs, filters, outW, outH) {
  const mode = project.sourceMode || 'single';

  if (mode === 'images') {
    const images = baseSources;
    const fps = project.exportSettings?.fps || 30;
    const kenBurns = !!project.imagesKenBurns;
    const crossfade = project.transitionStyle === 'crossfade' && images.length > 1;
    const D = TRANSITION_DURATION;

    const labels = [];
    const durations = [];
    images.forEach((img, i) => {
      const idx = inputs.length;
      const durationSec = Math.max(0.1, img.durationSec || 3);
      durations.push(durationSec);
      inputs.push({ path: img.path, options: ['-loop', '1', '-t', String(durationSec)] });
      const label = `img${i}`;
      if (kenBurns) {
        // scale=8000:-1 upscales well past canvas size first so zoompan has headroom to zoom
        // into without visible pixelation; `d` (frame count) + the trim/setpts pair after it are
        // what make the per-image frame count deterministic and safe to concat/xfade afterward.
        const frames = Math.max(1, Math.round(durationSec * fps));
        filters.push(
          `[${idx}:v]scale=8000:-1,zoompan=z='min(zoom+${KEN_BURNS_ZOOM_RATE},${KEN_BURNS_MAX_ZOOM})':d=${frames}:s=${outW}x${outH}:fps=${fps},trim=duration=${durationSec},setpts=PTS-STARTPTS,setsar=1[${label}]`
        );
      } else {
        // fps= normalizes every image (each independently decoded by the png/jpeg demuxer at its
        // own nominal rate) onto one common frame rate before concat, which expects matching
        // stream parameters across all its inputs.
        filters.push(
          `[${idx}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}[${label}]`
        );
      }
      labels.push(label);
    });

    if (!crossfade) {
      const joined = labels.map((l) => `[${l}]`).join('');
      filters.push(`${joined}concat=n=${images.length}:v=1:a=0[base]`);
      return { videoLabel: 'base', audioLabel: null };
    }

    // Pairwise xfade chain. Each successful crossfade shrinks the running total by D (the two
    // clips overlap for D seconds instead of playing back to back), so `accumulatedLen` must
    // track that shrinkage for the NEXT boundary's offset to land correctly — using the
    // original (unshrunk) durations here would drift more with every extra image.
    let current = labels[0];
    let accumulatedLen = durations[0];
    for (let i = 1; i < labels.length; i++) {
      const next = labels[i];
      const outLabel = `imgTrans${i}`;
      const canCrossfade = durations[i - 1] >= 2 * D && durations[i] >= 2 * D;
      if (canCrossfade) {
        const offset = Math.max(0, accumulatedLen - D);
        filters.push(`[${current}][${next}]xfade=transition=fade:duration=${D}:offset=${offset}[${outLabel}]`);
        accumulatedLen = accumulatedLen + durations[i] - D;
      } else {
        filters.push(`[${current}][${next}]concat=n=2:v=1:a=0[${outLabel}]`);
        accumulatedLen += durations[i];
      }
      current = outLabel;
    }
    return { videoLabel: current, audioLabel: null };
  }

  if (mode === 'split') {
    const clips = baseSources;
    // Short (9:16) stacks clips top/bottom; Long (16:9) places them side by side — the split
    // direction is implied by the format, not a separate user choice.
    const vertical = project.aspectRatio === '9:16';

    // The margin band can sit on ANY of the 4 edges, independent of the stack direction above —
    // e.g. a top/bottom split can still reserve its text margin on the left or right edge.
    // First carve the margin band off one full edge of the canvas, then stack the two clips
    // within whatever "content area" remains.
    const marginPosition = project.splitMarginPosition || 'bottom';
    const marginOnHorizontalEdge = marginPosition === 'top' || marginPosition === 'bottom';
    const marginPx = Math.round((marginOnHorizontalEdge ? outH : outW) * (project.splitMarginPct || 0));

    const contentW = marginOnHorizontalEdge ? outW : outW - marginPx;
    const contentH = marginOnHorizontalEdge ? outH - marginPx : outH;
    const contentX = marginPosition === 'left' ? marginPx : 0;
    const contentY = marginPosition === 'top' ? marginPx : 0;

    const stackDim = vertical ? contentH : contentW;
    const gapPx = Math.round(stackDim * 0.008); // thin fixed divider between the two feeds
    const halfDim = Math.floor(Math.max(2, stackDim - gapPx) / 2);
    const halfW = vertical ? contentW : halfDim;
    const halfH = vertical ? halfDim : contentH;
    const clipAOffset = 0;
    const clipBOffset = halfDim + gapPx;

    // A synthetic black canvas as the compositing base — lets clips be placed with an explicit
    // margin/gap via `overlay`, which vstack/hstack can't express.
    filters.push(`color=c=black:s=${outW}x${outH}:r=${project.exportSettings?.fps || 30}[splitBg]`);
    let current = 'splitBg';

    // Alternate Playback: both boxes stay visible for the WHOLE video (unlike Sequential, which
    // is full-screen one clip at a time), but only one clip is actually moving at a time — the
    // other freezes on its edge frame via `tpad` (clone = repeat that frame) until its turn.
    const alternate = !!project.splitAlternate;
    const durations = clips.map((c) => Math.max(0.1, (c.endSec ?? 0) - (c.startSec ?? 0)));
    const clipInputIdx = [];

    clips.forEach((clip, i) => {
      const idx = inputs.length;
      clipInputIdx.push(idx);
      inputs.push({ path: clip.path, options: trimInputOptions(clip) });
      const rawLabel = `clip${i}raw`;
      // Cover-fit crop (not letterbox) so each feed fills its half with no black bars inside
      // its own box, matching the classic broadcast "two feeds side by side" convention.
      filters.push(
        `[${idx}:v]scale=${halfW}:${halfH}:force_original_aspect_ratio=increase,crop=${halfW}:${halfH},setsar=1[${rawLabel}]`
      );

      let label = rawLabel;
      if (alternate) {
        label = `clip${i}`;
        const otherDuration = durations[i === 0 ? 1 : 0];
        const tpad =
          i === 0
            ? `tpad=stop_mode=clone:stop_duration=${otherDuration}` // A plays, then freezes while B's turn runs
            : `tpad=start_mode=clone:start_duration=${otherDuration}`; // B frozen during A's turn, then plays
        filters.push(`[${rawLabel}]${tpad}[${label}]`);
      }

      const offset = i === 0 ? clipAOffset : clipBOffset;
      const x = contentX + (vertical ? 0 : offset);
      const y = contentY + (vertical ? offset : 0);
      const next = `splitWith${i}`;
      filters.push(`[${current}][${label}]overlay=x=${x}:y=${y}[${next}]`);
      current = next;
    });

    if (!alternate) return { videoLabel: current, audioLabel: null };

    // Audio hands off in lockstep with which clip is actively playing: A's audio for its turn,
    // then B's — a plain concat (not the simultaneous mix a non-alternating split screen keeps
    // to Clip A only), matching the visual handoff.
    filters.push(
      `[${clipInputIdx[0]}:a]aformat=sample_rates=44100:channel_layouts=stereo[splitA0]`,
      `[${clipInputIdx[1]}:a]aformat=sample_rates=44100:channel_layouts=stereo[splitA1]`,
      `[splitA0][splitA1]concat=n=2:v=0:a=1[splitAudio]`
    );
    return { videoLabel: current, audioLabel: 'splitAudio' };
  }

  if (mode === 'sequential') {
    const clips = baseSources;
    const fps = project.exportSettings?.fps || 30;
    const durations = clips.map((c) => Math.max(0.1, (c.endSec ?? 0) - (c.startSec ?? 0)));
    const vLabels = [];
    const aLabels = [];
    clips.forEach((clip, i) => {
      const idx = inputs.length;
      inputs.push({ path: clip.path, options: trimInputOptions(clip) });
      const vLabel = `seqV${i}`;
      const aLabel = `seqA${i}`;
      filters.push(
        `[${idx}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps}[${vLabel}]`
      );
      // Normalize sample rate/channel layout before concat — the two clips may have been
      // recorded with different audio formats, and concat requires matching parameters.
      filters.push(`[${idx}:a]aformat=sample_rates=44100:channel_layouts=stereo[${aLabel}]`);
      vLabels.push(vLabel);
      aLabels.push(aLabel);
    });

    const D = TRANSITION_DURATION;
    const canCrossfade =
      project.transitionStyle === 'crossfade' && clips.length === 2 && durations[0] >= 2 * D && durations[1] >= 2 * D;

    if (canCrossfade) {
      const offset = Math.max(0, durations[0] - D);
      filters.push(`[${vLabels[0]}][${vLabels[1]}]xfade=transition=fade:duration=${D}:offset=${offset}[base]`);
      // acrossfade (unlike xfade) takes no `offset` — it always crossfades over its own tail/head.
      filters.push(`[${aLabels[0]}][${aLabels[1]}]acrossfade=d=${D}[baseAudio]`);
      return { videoLabel: 'base', audioLabel: 'baseAudio' };
    }

    const parts = vLabels.map((v, i) => `[${v}][${aLabels[i]}]`).join('');
    filters.push(`${parts}concat=n=${clips.length}:v=1:a=1[base][baseAudio]`);
    return { videoLabel: 'base', audioLabel: 'baseAudio' };
  }

  if (mode === 'pip') {
    const mainIdx = inputs.length;
    inputs.push({ path: baseSources.main.path, options: trimInputOptions(baseSources.main) });
    filters.push(
      `[${mainIdx}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black[pipBase]`
    );

    // The small clip is muted by default (matches Split Screen's "Clip A audio only" precedent):
    // its audio input is never referenced anywhere in the graph or the final -map, so it's simply
    // dropped. If the small clip is shorter than the main clip, overlay's default repeatlast=1
    // freezes on its final frame for the remainder rather than disappearing.
    const pipIdx = inputs.length;
    inputs.push({ path: baseSources.pip.path, options: trimInputOptions(baseSources.pip) });

    const pip = project.pipClip || {};
    const sizePct = pip.sizePct ?? 0.3;
    const pipW = Math.round(outW * sizePct);
    const pipH = Math.round(outH * sizePct);
    // Cover-fit crop (not letterbox) so the small box has no black bars inside it.
    filters.push(
      `[${pipIdx}:v]scale=${pipW}:${pipH}:force_original_aspect_ratio=increase,crop=${pipW}:${pipH},setsar=1[pipClip]`
    );

    const marginPx = Math.round(outW * 0.03);
    const box = resolveBoxPx(
      { position: pip.position || 'bottom-right', widthPct: sizePct, heightPct: sizePct, marginPx },
      outW,
      outH
    );
    filters.push(`[pipBase][pipClip]overlay=x=${box.x}:y=${box.y}[withPip]`);
    return { videoLabel: 'withPip', audioLabel: null };
  }

  // single (default) — unchanged from the original implementation
  const idx = inputs.length;
  inputs.push({ path: baseSources.path, options: trimInputOptions(baseSources) });
  filters.push(
    `[${idx}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black[base]`
  );
  return { videoLabel: 'base', audioLabel: null };
}

/**
 * Build the fluent-ffmpeg input list + complexFilter array for one export.
 * `assets` = { bannerPngPath, tickerPngPath, textLayerPngPaths: [], logoAsset, watermarkAsset }
 * Each *Asset is `{ path, isAnimated }` or null if that layer isn't configured.
 * Layer order (back to front): base video -> banner -> ticker -> text layers -> logo -> watermark.
 */
function buildFilterGraph(project, assets, baseSources) {
  const [outW, outH] = resolveOutputSize(project.aspectRatio, project.exportSettings?.resolution || '1080p');

  const inputs = [];
  const filters = [];
  let hasLoopedInput = false;

  const base = buildBaseVideoStream(project, baseSources, inputs, filters, outW, outH);
  let current = base.videoLabel;

  // Color grading applies once to the whole frame before any overlay compositing, so banner/
  // ticker/logo colors aren't affected by it.
  const gradeFilter = COLOR_GRADE_FILTERS[project.colorGrade];
  if (gradeFilter) {
    filters.push(`[${current}]${gradeFilter}[graded]`);
    current = 'graded';
  }

  if (assets.bannerPngPath) {
    const idx = inputs.length;
    // -loop 1: without it, a still-image input only ever produces ONE frame (at t=0) — any
    // time-based filter upstream of overlay (fade) would then compute its output using just
    // that single t=0 frame (fade progress 0 => fully transparent) and overlay's repeatlast
    // would hold THAT frame for the whole clip, making the overlay invisible for its entire
    // duration instead of just fading in. Looping first gives fade a proper advancing pts.
    inputs.push({ path: assets.bannerPngPath, options: ['-loop', '1'] });
    const animation = project.headline?.animation;
    const srcLabel = withEntranceFade(filters, `${idx}:v`, animation, 'banner');
    const pos = entranceOverlayXY(animation, outW, outH, 0, 0);
    filters.push(`[${current}][${srcLabel}]overlay=${overlayPositionFragment(pos)}[withBanner]`);
    current = 'withBanner';
  }

  if (assets.tickerPngPath && project.ticker?.text) {
    const idx = inputs.length;
    inputs.push({ path: assets.tickerPngPath, options: ['-loop', '1'] });
    // Only a fade entrance is offered for the ticker (see TICKER_ANIMATION_OPTIONS client-side)
    // — a directional slide would fight the continuous scroll motion below.
    const srcLabel = withEntranceFade(filters, `${idx}:v`, project.ticker.animation, 'ticker');
    const speed = project.ticker.speedPxPerSec || 120;
    const xExpr =
      project.ticker.direction === 'ltr'
        ? `mod(t*${speed},W+w)-w`
        : `W-mod(t*${speed},W+w)`;
    const box = resolveBoxPx({ xPct: 0, yPct: 0.92, widthPct: 1, heightPct: 0.08 }, outW, outH);
    filters.push(`[${current}][${srcLabel}]overlay=x='${xExpr}':y=${box.y}:eval=frame[withTicker]`);
    current = 'withTicker';
  }

  if (assets.subscribeBarPngPath) {
    const idx = inputs.length;
    inputs.push({ path: assets.subscribeBarPngPath, options: ['-loop', '1'] });
    const box = resolveBoxPx(subscribeBarBox(), outW, outH);
    filters.push(`[${current}][${idx}:v]overlay=x=0:y=${box.y}[withSubscribeBar]`);
    current = 'withSubscribeBar';
  }

  if (assets.liveBadgePngPath) {
    const idx = inputs.length;
    inputs.push({ path: assets.liveBadgePngPath, options: ['-loop', '1'] });
    // Hard on/off blink (visible 0.9s of every 1.2s) rather than a smooth per-frame alpha
    // expression — simpler and more robust, and matches how real broadcast LIVE badges blink.
    filters.push(`[${current}][${idx}:v]overlay=x=0:y=0:enable='lt(mod(t,1.2),0.9)'[withLiveBadge]`);
    current = 'withLiveBadge';
  }

  if (assets.dateTimeStampPngPath) {
    const idx = inputs.length;
    inputs.push({ path: assets.dateTimeStampPngPath, options: ['-loop', '1'] });
    filters.push(`[${current}][${idx}:v]overlay=x=0:y=0[withDateTime]`);
    current = 'withDateTime';
  }

  (assets.textLayerPngPaths || []).forEach((layerPng, i) => {
    const idx = inputs.length;
    inputs.push({ path: layerPng, options: ['-loop', '1'] });
    const animation = (project.textLayers || [])[i]?.animation;
    const srcLabel = withEntranceFade(filters, `${idx}:v`, animation, `text${i}`);
    const pos = entranceOverlayXY(animation, outW, outH, 0, 0);
    const next = `withText${i}`;
    filters.push(`[${current}][${srcLabel}]overlay=${overlayPositionFragment(pos)}[${next}]`);
    current = next;
  });

  function overlayImageAsset(asset, position, label) {
    if (!asset) return;
    const idx = inputs.length;
    const inputOptions = asset.isAnimated ? ['-stream_loop', '-1'] : [];
    if (asset.isAnimated) hasLoopedInput = true;
    inputs.push({ path: asset.path, options: inputOptions });

    // Circular clipping (when position.shape === 'circle') is already baked into the asset's
    // pixels by assetPreprocess.service.js's applyCircularMask before it ever reaches here, so
    // this stays a single plain scale+opacity+overlay path regardless of shape.
    const opacity = position.opacity ?? 1;
    const opLabel = `${label}_op`;
    const { x, y, widthPx } = logoOverlayPosition(position, outW, outH);
    filters.push(`[${idx}:v]format=rgba,colorchannelmixer=aa=${opacity},scale=${widthPx}:-1[${opLabel}]`);

    const next = `with${label}`;
    filters.push(`[${current}][${opLabel}]overlay=x=${x}:y=${y}[${next}]`);
    current = next;
  }

  overlayImageAsset(assets.logoAsset, project.logo || {}, 'Logo');
  overlayImageAsset(assets.watermarkAsset, project.watermark || {}, 'Watermark');

  if (assets.watermarkTextPngPath) {
    const idx = inputs.length;
    inputs.push({ path: assets.watermarkTextPngPath, options: ['-loop', '1'] });
    // Same drift-across technique as the news ticker: the whole strip (band + text) scrolls, so
    // it periodically crosses the middle rather than sitting fixed like the corner watermark.
    const speed = project.watermark?.textSpeedPxPerSec || 90;
    const xExpr =
      project.watermark?.textDirection === 'rtl' ? `W-mod(t*${speed},W+w)` : `mod(t*${speed},W+w)-w`;
    const box = resolveBoxPx(watermarkTextBox(), outW, outH);
    filters.push(`[${current}][${idx}:v]overlay=x='${xExpr}':y=${box.y}:eval=frame[withWatermarkText]`);
    current = 'withWatermarkText';
  }

  const outputLabel = `[${current}]`;
  return { inputs, filters, outputLabel, outW, outH, hasLoopedInput, audioLabel: base.audioLabel };
}

module.exports = { buildFilterGraph, resolveOutputSize, RESOLUTIONS, TRANSITION_DURATION };
