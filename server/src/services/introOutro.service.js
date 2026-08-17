/**
 * Wraps the main content's video/audio labels with an optional "Breaking News" intro stinger
 * and/or "Subscribe/Like/Share" outro card via `concat`. Both cards are pre-rendered opaque PNGs
 * (overlayRenderer.service.js's renderStingerCard/renderOutroCard); their audio is a generated
 * silent track since they're static cards, not real footage.
 *
 * concat requires every segment's audio as a real named filter pad — the main content's audio
 * may not have one yet (single/images/non-alternate-split modes fall back to the raw `-map 0:a?`
 * mapping when they have no overlay work to do), so this function is the one place that forces a
 * named `[mainA]` pad into existence, using `mainHasAudio` (probed fresh on the resolved main
 * content path) to decide between referencing the real `[0:a]` stream and no-op'ing into silence
 * — referencing `[0:a]` in a filter graph hard-fails if that stream doesn't actually exist.
 */
function buildStingerOutroConcat({ project, inputs, filters, videoLabel, audioLabel, mainHasAudio, mainDurationSec, outW, outH, fps, assets }) {
  const stingerOn = !!(project.stinger?.enabled && assets.stingerPngPath);
  const outroOn = !!(project.outro?.enabled && assets.outroPngPath);

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
    const idx = inputs.length;
    inputs.push({ path: assets.outroPngPath, options: ['-loop', '1'] });
    const d = project.outro.durationSec || 5;
    // A gentle continuous zoom (same zoompan+trim recipe as Images-to-Video's Ken Burns effect,
    // just a much subtler max zoom since this is a UI card, not a photo) plus a quick fade-in so
    // the card doesn't just hard-cut into a static frame — real motion instead of a still image.
    const frames = Math.max(1, Math.round(d * fps));
    filters.push(
      `[${idx}:v]scale=8000:-1,zoompan=z='min(zoom+0.0008,1.15)':d=${frames}:s=${outW}x${outH}:fps=${fps},trim=duration=${d},setpts=PTS-STARTPTS,setsar=1,format=yuv420p,fade=t=in:st=0:d=0.4[outroV]`,
      `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${d},asetpts=PTS-STARTPTS[outroA]`
    );
    segments.push({ v: 'outroV', a: 'outroA', d });
  }

  const concatInputsStr = segments.map((s) => `[${s.v}][${s.a}]`).join('');
  filters.push(`${concatInputsStr}concat=n=${segments.length}:v=1:a=1[finalV][finalA]`);

  const totalDurationSec = segments.reduce((sum, s) => sum + s.d, 0);
  return { videoLabel: 'finalV', audioLabel: 'finalA', totalDurationSec };
}

module.exports = { buildStingerOutroConcat };
