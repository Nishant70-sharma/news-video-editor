/**
 * Wraps the main content's video/audio labels with an optional "Breaking News" intro stinger
 * and/or "Subscribe/Like/Share" outro sequence via `concat`. The stinger is a single opaque PNG
 * card (overlayRenderer.service.js's renderStingerCard); the outro is built from SEPARATE layers
 * (renderOutroAssets) composited here with staggered "pop in" timing so it plays like a small
 * animated bumper clip — logo, then each icon, then the channel text, each scaling up + fading in
 * one after another — rather than one static card that just zooms as a whole. Both segments'
 * audio is a generated silent track since neither is real footage.
 *
 * concat requires every segment's audio as a real named filter pad — the main content's audio
 * may not have one yet (single/images/non-alternate-split modes fall back to the raw `-map 0:a?`
 * mapping when they have no overlay work to do), so this function is the one place that forces a
 * named `[mainA]` pad into existence, using `mainHasAudio` (probed fresh on the resolved main
 * content path) to decide between referencing the real `[0:a]` stream and no-op'ing into silence
 * — referencing `[0:a]` in a filter graph hard-fails if that stream doesn't actually exist.
 */

/**
 * Every "-loop 1"/"-stream_loop -1" input starts decoding at t=0 of the OVERALL ffmpeg process,
 * independent of where `concat` later places its frames in the output timeline — so `st=`/`t<`
 * entrance timings below are always relative to "the start of this segment's own footage", not
 * "the moment it becomes visible on screen", and stay correct regardless of what else (a stinger,
 * the main video) precedes this segment in the concat chain.
 */
function popInOverlay({ inputs, filters, current, assetPath, cx, cy, targetSize, delay, growDuration = 0.28, isAnimated = false }) {
  const idx = inputs.length;
  inputs.push({ path: assetPath, options: isAnimated ? ['-stream_loop', '-1'] : ['-loop', '1'] });
  const scaledLabel = `pop${idx}`;
  // Grows from a 1px sliver to targetSize over `growDuration`, staying at 1px (and fully
  // transparent, via the paired fade) before `delay` — `max(1, ...)` avoids ever asking scale
  // for a zero/negative dimension. `eval=frame` is what makes `t` available inside the expression.
  filters.push(
    `[${idx}:v]scale=w='if(lt(t,${delay}),1,if(lt(t,${delay + growDuration}),max(1,${targetSize}*((t-${delay})/${growDuration})),${targetSize}))':h=-1:eval=frame,fade=t=in:st=${delay}:d=${growDuration}:alpha=1[${scaledLabel}]`
  );
  const nextLabel = `withPop${idx}`;
  // Recentered every frame on (cx, cy) using the overlay's OWN current (post-scale) w/h, so the
  // element grows outward from its target center instead of drifting as it scales up.
  filters.push(`[${current}][${scaledLabel}]overlay=x='${cx}-w/2':y='${cy}-h/2':eval=frame[${nextLabel}]`);
  return nextLabel;
}

/**
 * Builds the animated outro's video (bare label, not yet trimmed to its final duration by the
 * caller's concat bookkeeping — this DOES do its own final `trim`/`setpts` so it's directly
 * concat-ready) — shared between the real export's concat and the standalone outro-preview
 * endpoint, so both play out identically.
 */
function buildAnimatedOutroLayer({ inputs, filters, outroAssets, logoAsset, durationSec, outW, outH, fps }) {
  const bgIdx = inputs.length;
  inputs.push({ path: outroAssets.backgroundPath, options: ['-loop', '1'] });
  filters.push(`[${bgIdx}:v]scale=${outW}:${outH},setsar=1,fps=${fps},format=yuv420p[outroBg]`);
  let current = 'outroBg';

  if (logoAsset) {
    current = popInOverlay({
      inputs,
      filters,
      current,
      assetPath: logoAsset.path,
      cx: outroAssets.logo.cx,
      cy: outroAssets.logo.cy,
      targetSize: outroAssets.logo.size,
      delay: 0.15,
      isAnimated: logoAsset.isAnimated
    });
  }

  const badgeDelays = [0.5, 0.68, 0.86];
  outroAssets.badges.forEach((badge, i) => {
    current = popInOverlay({
      inputs,
      filters,
      current,
      assetPath: badge.path,
      cx: badge.cx,
      cy: badge.cy,
      targetSize: outroAssets.badgeW,
      delay: badgeDelays[i]
    });
  });

  // Channel text just fades in (no scale-grow) — a growing line of text reads as jittery/blurry
  // where a growing icon reads as a deliberate "pop", so it gets simpler treatment.
  const textIdx = inputs.length;
  inputs.push({ path: outroAssets.textPath, options: ['-loop', '1'] });
  const textDelay = 1.05;
  filters.push(`[${textIdx}:v]fade=t=in:st=${textDelay}:d=0.3:alpha=1[outroTextFaded]`);
  const withText = 'outroWithText';
  filters.push(`[${current}][outroTextFaded]overlay=x=0:y=${Math.round(outroAssets.textCy - outroAssets.textH / 2)}[${withText}]`);

  filters.push(`[${withText}]trim=duration=${durationSec},setpts=PTS-STARTPTS,format=yuv420p[outroV]`);
  filters.push(`anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[outroA]`);
  return { videoLabel: 'outroV', audioLabel: 'outroA' };
}

function buildStingerOutroConcat({ project, inputs, filters, videoLabel, audioLabel, mainHasAudio, mainDurationSec, outW, outH, fps, assets }) {
  const stingerOn = !!(project.stinger?.enabled && assets.stingerPngPath);
  const outroOn = !!(project.outro?.enabled && assets.outroAssets);

  if (!stingerOn && !outroOn) {
    return { videoLabel, audioLabel, totalDurationSec: mainDurationSec };
  }

  filters.push(`[${videoLabel}]trim=duration=${mainDurationSec},setpts=PTS-STARTPTS,format=yuv420p[mainV]`);

  if (audioLabel) {
    filters.push(`[${audioLabel}]atrim=duration=${mainDurationSec},asetpts=PTS-STARTPTS[mainA]`);
  } else if (mainHasAudio) {
    filters.push(
      `[0:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=duration=${mainDurationSec},asetpts=PTS-STARTPTS[mainA]`
    );
  } else {
    filters.push(`anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${mainDurationSec},asetpts=PTS-STARTPTS[mainA]`);
  }

  const segments = [];

  if (stingerOn) {
    const idx = inputs.length;
    inputs.push({ path: assets.stingerPngPath, options: ['-loop', '1'] });
    const d = project.stinger.durationSec || 1.5;
    filters.push(
      `[${idx}:v]scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps},format=yuv420p,trim=duration=${d},setpts=PTS-STARTPTS[stingerV]`,
      `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${d},asetpts=PTS-STARTPTS[stingerA]`
    );
    segments.push({ v: 'stingerV', a: 'stingerA', d });
  }

  segments.push({ v: 'mainV', a: 'mainA', d: mainDurationSec });

  if (outroOn) {
    const d = project.outro.durationSec || 5;
    const outro = buildAnimatedOutroLayer({
      inputs,
      filters,
      outroAssets: assets.outroAssets,
      logoAsset: assets.outroLogoAsset || null,
      durationSec: d,
      outW,
      outH,
      fps
    });
    segments.push({ v: outro.videoLabel, a: outro.audioLabel, d });
  }

  const concatInputsStr = segments.map((s) => `[${s.v}][${s.a}]`).join('');
  filters.push(`${concatInputsStr}concat=n=${segments.length}:v=1:a=1[finalV][finalA]`);

  const totalDurationSec = segments.reduce((sum, s) => sum + s.d, 0);
  return { videoLabel: 'finalV', audioLabel: 'finalA', totalDurationSec };
}

module.exports = { buildStingerOutroConcat, buildAnimatedOutroLayer };
