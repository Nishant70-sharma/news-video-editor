/**
 * Mixes an uploaded background music track under the main content's audio, optionally ducking
 * (auto-lowering) the music whenever the main audio is active via sidechain compression — the
 * music track is the signal being compressed, the main audio is the detector/trigger.
 *
 * Sidechain input order matters: `[signal_to_duck][detector]sidechaincompress=...` — the music
 * goes first (it's the one getting quieter), the speech/main audio second (it's only ever read
 * to decide how much to duck, never itself modified here).
 *
 * `amix`'s default `normalize=1` would quietly attenuate the main audio too (defeating the whole
 * point of ducking), so `normalize=0` is required on the final mix.
 */
function buildDuckedAudio({ filters, mainAudioLabel, mainHasAudio, musicInputIdx, durationSec, volume, duckingEnabled }) {
  filters.push(
    `[${musicInputIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,atrim=duration=${durationSec},asetpts=PTS-STARTPTS,volume=${volume}[music_vol]`
  );

  // No main-content audio at all (silent video / images mode with no ducking target) — the
  // music track simply IS the final audio, nothing to duck against.
  if (!mainAudioLabel && !mainHasAudio) {
    return { audioLabel: 'music_vol' };
  }

  const mainSource = mainAudioLabel || '0:a';
  filters.push(
    `[${mainSource}]aformat=sample_rates=44100:channel_layouts=stereo,atrim=duration=${durationSec},asetpts=PTS-STARTPTS[mainA_norm]`
  );

  if (!duckingEnabled) {
    filters.push(`[mainA_norm][music_vol]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixedAudio]`);
    return { audioLabel: 'mixedAudio' };
  }

  filters.push(
    `[mainA_norm]asplit=2[mainA_sc][mainA_mix]`,
    `[music_vol][mainA_sc]sidechaincompress=threshold=0.05:ratio=8:attack=5:release=300[ducked_music]`,
    `[mainA_mix][ducked_music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mixedAudio]`
  );
  return { audioLabel: 'mixedAudio' };
}

module.exports = { buildDuckedAudio };
