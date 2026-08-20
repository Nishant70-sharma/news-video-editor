/**
 * Synthesized sound effects — no downloaded/licensed audio anywhere here, every option is built
 * from FFmpeg's noise/tone generator filters at export time. Shared between the Stinger's own
 * (fixed-position) sound effect and the general timeline placement feature below, so both play
 * the exact same synthesis.
 */

/** Pushes the raw (undelayed, unpadded) synthesized effect into `filters`, output at `label`. Returns false for an unknown/'none' id. */
function buildRawSoundEffect(filters, effectId, label) {
  if (effectId === 'glassBreak') {
    // Layered: a bright main crash + two quieter, higher-pitched "shard" bursts arriving a beat
    // later, approximating glass shattering into settling fragments rather than one flat hit.
    filters.push(
      `anoisesrc=d=0.35:c=white:r=44100:a=1,highpass=f=3000,afade=t=out:st=0.02:d=0.33,aformat=channel_layouts=stereo[${label}Crash]`,
      `anoisesrc=d=0.15:c=white:r=44100:a=0.5,highpass=f=5000,afade=t=out:st=0.01:d=0.14,aformat=channel_layouts=stereo,adelay=80|80[${label}Shard1]`,
      `anoisesrc=d=0.12:c=white:r=44100:a=0.35,highpass=f=6000,afade=t=out:st=0.01:d=0.11,aformat=channel_layouts=stereo,adelay=150|150[${label}Shard2]`,
      `[${label}Crash][${label}Shard1][${label}Shard2]amix=inputs=3:duration=longest:dropout_transition=0:normalize=0[${label}]`
    );
    return true;
  }
  if (effectId === 'whoosh') {
    // Three short noise bursts with progressively higher lowpass cutoff (and rising level),
    // concatenated — a cheap but effective discrete approximation of a continuous rising sweep,
    // ending in a quick fade rather than a static single-band swell.
    filters.push(
      `anoisesrc=d=0.15:c=white:r=44100:a=0.4,lowpass=f=800,aformat=channel_layouts=stereo[${label}A]`,
      `anoisesrc=d=0.15:c=white:r=44100:a=0.65,lowpass=f=2500,aformat=channel_layouts=stereo[${label}B]`,
      `anoisesrc=d=0.2:c=white:r=44100:a=0.9,lowpass=f=6000,aformat=channel_layouts=stereo[${label}C]`,
      `[${label}A][${label}B][${label}C]concat=n=3:v=0:a=1,afade=t=out:st=0.35:d=0.15[${label}]`
    );
    return true;
  }
  if (effectId === 'newsChime') {
    // Ascending three-note alert cadence. Each tone gets a very short in/out fade (10-20ms) —
    // without it, the hard on/off edges of a raw sine burst produce an audible click.
    filters.push(
      `sine=frequency=523:duration=0.15:sample_rate=44100,volume=0.7,afade=t=in:st=0:d=0.01,afade=t=out:st=0.13:d=0.02,aformat=channel_layouts=stereo[${label}A]`,
      `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=0.05[${label}Gap1]`,
      `sine=frequency=659:duration=0.15:sample_rate=44100,volume=0.7,afade=t=in:st=0:d=0.01,afade=t=out:st=0.13:d=0.02,aformat=channel_layouts=stereo[${label}B]`,
      `anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=0.05[${label}Gap2]`,
      `sine=frequency=784:duration=0.3:sample_rate=44100,volume=0.7,afade=t=in:st=0:d=0.01,afade=t=out:st=0.28:d=0.02,aformat=channel_layouts=stereo[${label}C]`,
      `[${label}A][${label}Gap1][${label}B][${label}Gap2][${label}C]concat=n=5:v=0:a=1[${label}]`
    );
    return true;
  }
  return false;
}

/** Raw effect, padded with silence to exactly `durationSec` — a drop-in audio pad the same shape as plain silence. */
function buildPaddedSoundEffect(filters, effectId, durationSec, label) {
  const rawLabel = `${label}Raw`;
  if (!buildRawSoundEffect(filters, effectId, rawLabel)) return null;
  filters.push(`[${rawLabel}]apad,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[${label}]`);
  return label;
}

/**
 * Mixes zero or more sound effects into the main content's audio at user-chosen timestamps
 * (`soundEffects: [{ effect, startSec }]`) — e.g. a glass-break at the exact moment something
 * happens on screen, rather than only ever at the fixed position of the intro stinger. Each
 * effect is delayed via `adelay` to its startSec, then layered on top of the existing audio with
 * `amix` (not replacing it). Silently drops any effect starting at/after the content's own
 * duration — nothing to place it in front of.
 */
function buildTimelineSoundEffectsAudio({ filters, mainAudioLabel, mainHasAudio, soundEffects, durationSec }) {
  const valid = (soundEffects || []).filter(
    (sfx) => sfx?.effect && sfx.effect !== 'none' && (sfx.startSec ?? 0) >= 0 && (sfx.startSec ?? 0) < durationSec
  );
  if (!valid.length) return mainAudioLabel;

  let baseLabel;
  if (mainAudioLabel) {
    filters.push(`[${mainAudioLabel}]aformat=sample_rates=44100:channel_layouts=stereo[sfxTlBase]`);
    baseLabel = 'sfxTlBase';
  } else if (mainHasAudio) {
    filters.push(`[0:a]aformat=sample_rates=44100:channel_layouts=stereo[sfxTlBase]`);
    baseLabel = 'sfxTlBase';
  } else {
    filters.push(`anullsrc=channel_layout=stereo:sample_rate=44100,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[sfxTlBase]`);
    baseLabel = 'sfxTlBase';
  }

  const mixParts = [`[${baseLabel}]`];
  valid.forEach((sfx, i) => {
    const rawLabel = `tlSfx${i}`;
    buildRawSoundEffect(filters, sfx.effect, rawLabel);
    const delayMs = Math.max(0, Math.round((sfx.startSec || 0) * 1000));
    const delayedLabel = `tlSfxDelayed${i}`;
    filters.push(`[${rawLabel}]adelay=${delayMs}|${delayMs}[${delayedLabel}]`);
    mixParts.push(`[${delayedLabel}]`);
  });

  const mixedLabel = 'sfxTimelineMixed';
  filters.push(
    `${mixParts.join('')}amix=inputs=${mixParts.length}:duration=first:dropout_transition=0:normalize=0,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[${mixedLabel}]`
  );
  return mixedLabel;
}

module.exports = { buildRawSoundEffect, buildPaddedSoundEffect, buildTimelineSoundEffectsAudio };
