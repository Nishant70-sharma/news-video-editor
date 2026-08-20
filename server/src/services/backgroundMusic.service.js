const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('./ffmpegBinary');
const config = require('../config');

/**
 * Synthesized "news ambient" background music beds — no licensed/downloaded music anywhere here.
 * Each note in the chord is TWO slightly-detuned sine oscillators (~0.3%) mixed together, which
 * beat against each other naturally — the classic trick for turning a flat, clinical pure tone
 * into something that reads as a lush analog-style pad. A quiet sub-bass an octave below the
 * root adds warmth/weight, and a short diffuse `aecho` gives it a sense of space instead of
 * sounding perfectly dry. Deliberately quiet (~0.14-0.16 linear) since this sits BEHIND a news
 * anchor's voice, not competing with it — the existing Background Music volume/ducking controls
 * still apply on top of whatever level is baked in here.
 */
const PRESETS = {
  newsroomAmbient: {
    label: 'Newsroom Ambient',
    notes: [130.81, 164.81, 196.0], // C3 major triad — calm, neutral
    volume: 0.14,
    tremoloFreq: 0.2,
    tremoloDepth: 0.15,
    lowpass: 2200
  },
  calmCorporate: {
    label: 'Calm Corporate',
    notes: [146.83, 185.0, 220.0], // D3 major triad — a touch brighter/more "upbeat"
    volume: 0.14,
    tremoloFreq: 0.35,
    tremoloDepth: 0.2,
    lowpass: 2800
  },
  urgentPulse: {
    label: 'Urgent Pulse',
    notes: [110.0, 164.81], // low A2 drone + fifth — tense, for breaking/developing stories
    volume: 0.16,
    tremoloFreq: 2,
    tremoloDepth: 0.55,
    lowpass: 1800
  }
};

const LOOP_DURATION_SEC = 24;

/** One chord voice: two oscillators ~0.3% apart, mixed — a natural chorus/beating shimmer instead of one flat tone. */
function buildDetunedVoice(filters, freq, durationSec, volume, label) {
  filters.push(
    `sine=frequency=${freq.toFixed(3)}:duration=${durationSec}:sample_rate=44100,volume=${volume},aformat=channel_layouts=stereo[${label}A]`,
    `sine=frequency=${(freq * 1.003).toFixed(3)}:duration=${durationSec}:sample_rate=44100,volume=${volume},aformat=channel_layouts=stereo[${label}B]`,
    `[${label}A][${label}B]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[${label}]`
  );
}

/** Pushes the synthesized ambient bed into `filters`, output at `label`. Returns false for an unknown style. */
function buildAmbientLabel(filters, style, durationSec, label) {
  const preset = PRESETS[style];
  if (!preset) return false;

  const voiceLabels = preset.notes.map((freq, i) => {
    const voiceLabel = `${label}Voice${i}`;
    buildDetunedVoice(filters, freq, durationSec, preset.volume * 0.55, voiceLabel);
    return voiceLabel;
  });

  // Sub-bass an octave below the root — quiet, just adds foundation/weight beneath the chord.
  const subLabel = `${label}Sub`;
  buildDetunedVoice(filters, preset.notes[0] / 2, durationSec, preset.volume * 0.4, subLabel);

  const allLabels = [...voiceLabels, subLabel];
  const mixedLabel = `${label}Mixed`;
  filters.push(
    `${allLabels.map((l) => `[${l}]`).join('')}amix=inputs=${allLabels.length}:duration=first:dropout_transition=0:normalize=0[${mixedLabel}]`
  );

  // aecho gives a cheap-but-effective sense of room/space (a genuine reverb needs a convolution
  // filter FFmpeg doesn't ship by default) — two short, quiet, close-together taps read as
  // ambience rather than a distinct slap-back echo. highpass cleans up sub-rumble below the
  // intentional sub-bass layer; a 0.6s attack swell (not the previous instant 0.15s) makes it
  // feel like a genuine pad coming in rather than a sample just starting.
  filters.push(
    `[${mixedLabel}]aecho=0.75:0.6:70|140:0.25|0.15,highpass=f=45,lowpass=f=${preset.lowpass},tremolo=f=${preset.tremoloFreq}:d=${preset.tremoloDepth},afade=t=in:st=0:d=0.6,afade=t=out:st=${durationSec - 0.4}:d=0.4[${label}]`
  );
  return true;
}

/**
 * Renders a preset to an actual file in `config.storage.music` — the SAME folder/URL shape as an
 * uploaded track — so it can be set as `project.music.assetUrl` directly, with zero changes to
 * the existing looping/ducking/volume mixing pipeline (audioMix.service.js).
 */
async function generateBackgroundMusic(style) {
  const filters = [];
  const label = 'ambient';
  if (!buildAmbientLabel(filters, style, LOOP_DURATION_SEC, label)) {
    throw new Error(`Unknown background music style: ${style}`);
  }

  const filename = `${uuidv4()}.mp3`;
  const outputPath = path.join(config.storage.music, filename);

  await new Promise((resolve, reject) => {
    ffmpeg()
      .complexFilter(filters)
      .outputOptions(['-map', `[${label}]`, '-c:a', 'libmp3lame', '-t', String(LOOP_DURATION_SEC)])
      .on('error', (err) => reject(err))
      .on('end', () => resolve())
      .save(outputPath);
  });

  return { filename, kind: 'mp3', url: `/media/music/${filename}` };
}

module.exports = { PRESETS, generateBackgroundMusic };
