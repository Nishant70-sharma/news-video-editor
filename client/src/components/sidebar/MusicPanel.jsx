import { useRef, useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Slider from '../common/Slider';
import AudioRecorder from '../common/AudioRecorder';
import { uploadMusic, generateBackgroundMusic } from '../../api/music';
import { useProjectStore } from '../../store/useProjectStore';

const AMBIENT_PRESETS = [
  { id: 'newsroomAmbient', label: 'Newsroom Ambient', description: 'Calm, neutral pad — general coverage.' },
  { id: 'calmCorporate', label: 'Calm Corporate', description: 'A touch brighter — explainers, business news.' },
  { id: 'urgentPulse', label: 'Urgent Pulse', description: 'Tense rhythmic pulse — breaking/developing stories.' }
];

export default function MusicPanel({ videoRef }) {
  const project = useProjectStore((s) => s.project);
  // The recorder can only auto-play/sync a real videoRef-backed <video> element, which only
  // exists in 'single'/'pip' source mode (see VideoPreview.jsx) — elsewhere it still records
  // fine, just without the auto-play-along convenience.
  const syncableVideoRef = project.sourceMode === 'single' || project.sourceMode === 'pip' ? videoRef : null;
  const updateField = useProjectStore((s) => s.updateField);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [customBusy, setCustomBusy] = useState(false);
  const [ambientBusyId, setAmbientBusyId] = useState(null);
  const [ambientError, setAmbientError] = useState(null);
  const ambientPreviewRef = useRef(null);

  async function handlePreviewAmbient(style) {
    setAmbientError(null);
    setAmbientBusyId(style);
    try {
      const result = await generateBackgroundMusic(style);
      if (ambientPreviewRef.current) {
        ambientPreviewRef.current.src = `${result.url}?t=${Date.now()}`;
        await ambientPreviewRef.current.play();
      }
    } catch (err) {
      setAmbientError(err.response?.data?.error || err.message);
    } finally {
      setAmbientBusyId(null);
    }
  }

  async function handleUseAmbient(style) {
    setAmbientError(null);
    setAmbientBusyId(style);
    try {
      const result = await generateBackgroundMusic(style);
      updateField('music.assetUrl', result.url);
      updateField('music.kind', result.kind);
      updateField('music.presetId', style);
    } catch (err) {
      setAmbientError(err.response?.data?.error || err.message);
    } finally {
      setAmbientBusyId(null);
    }
  }

  async function handleFile(file) {
    setError(null);
    setBusy(true);
    try {
      const result = await uploadMusic(file);
      updateField('music.assetUrl', result.url);
      updateField('music.kind', result.kind);
      updateField('music.presetId', '');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCustomAudioFile(file, filename) {
    setCustomError(null);
    setCustomBusy(true);
    try {
      const result = await uploadMusic(file, filename);
      updateField('customAudio.assetUrl', result.url);
      updateField('customAudio.kind', result.kind);
    } catch (err) {
      setCustomError(err.response?.data?.error || err.message);
    } finally {
      setCustomBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <h3 className="mb-1 text-sm font-semibold text-slate-200">Replace Video Audio</h3>
        <p className="mb-2 text-xs text-slate-500">
          Mutes the uploaded video's own sound entirely and uses this track instead — for adding
          your own voiceover/commentary over silent or unwanted-audio footage.
        </p>
        <FileDropzone
          accept="audio/mpeg,audio/wav,audio/x-m4a,.mp3,.wav,.m4a"
          label={customBusy ? 'Uploading…' : 'Drop an audio file or click to upload'}
          sublabel="MP3, WAV, M4A"
          onFile={handleCustomAudioFile}
        />
        <AudioRecorder onRecorded={handleCustomAudioFile} videoRef={syncableVideoRef} />
        {customBusy && <p className="mt-2 text-xs text-slate-400">Uploading recorded audio…</p>}
        {customError && <p className="mt-2 text-xs text-red-400">{customError}</p>}

        {project.customAudio.assetUrl && (
          <div className="mt-3 rounded-lg border border-news-border bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span>Replacement audio uploaded ({project.customAudio.kind})</span>
              <button
                onClick={() => {
                  updateField('customAudio.assetUrl', '');
                  updateField('customAudio.kind', '');
                }}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <audio src={project.customAudio.assetUrl} controls className="w-full" />
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Background Music</h3>

        <div className="mb-3 rounded-lg border border-news-border bg-black/20 p-3">
          <h4 className="mb-1 text-xs font-semibold text-slate-300">Built-in News Ambient Tracks</h4>
          <p className="mb-2 text-xs text-slate-500">
            Synthesized on the fly (no licensed music) — a soft bed that loops for your whole
            video's length, same as an uploaded track.
          </p>
          {AMBIENT_PRESETS.map((preset) => {
            const isActive = project.music.assetUrl && project.music.presetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`mb-2 rounded-md border p-2 ${isActive ? 'border-emerald-500 bg-emerald-500/10' : 'border-news-border bg-black/20'}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-200">{preset.label}</span>
                  {isActive && <span className="text-[11px] font-semibold text-emerald-400">✓ Currently Active</span>}
                </div>
                <p className="mb-2 text-[11px] text-slate-500">{preset.description}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePreviewAmbient(preset.id)}
                    disabled={ambientBusyId === preset.id}
                    className="flex-1 rounded-md border border-news-border py-1.5 text-xs text-slate-300 hover:border-news-accent2 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {ambientBusyId === preset.id ? 'Generating…' : '🔊 Preview'}
                  </button>
                  <button
                    onClick={() => handleUseAmbient(preset.id)}
                    disabled={ambientBusyId === preset.id}
                    className={`flex-1 rounded-md border py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-600/20 text-emerald-300'
                        : 'border-news-accent2 bg-news-accent2/10 text-white hover:bg-news-accent2/20'
                    }`}
                  >
                    {ambientBusyId === preset.id ? 'Applying…' : isActive ? '✓ In Use' : 'Use This Track'}
                  </button>
                </div>
              </div>
            );
          })}
          {ambientError && <p className="mt-1 text-xs text-red-400">{ambientError}</p>}
          <audio ref={ambientPreviewRef} className="hidden" />
        </div>

        <p className="mb-2 text-xs text-slate-500">Or upload your own:</p>
        <FileDropzone
          accept="audio/mpeg,audio/wav,audio/x-m4a,.mp3,.wav,.m4a"
          label={busy ? 'Uploading…' : 'Drop an audio file or click to upload'}
          sublabel="MP3, WAV, M4A"
          onFile={handleFile}
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {project.music.assetUrl && (
          <div className="mt-3 rounded-lg border border-emerald-600 bg-emerald-500/10 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-200">
              <span>
                ✓ Currently set as your Background Music —{' '}
                {project.music.presetId
                  ? AMBIENT_PRESETS.find((p) => p.id === project.music.presetId)?.label || 'built-in track'
                  : `your upload (${project.music.kind})`}
              </span>
              <button
                onClick={() => {
                  updateField('music.assetUrl', '');
                  updateField('music.kind', '');
                  updateField('music.presetId', '');
                }}
                className="text-red-400 hover:text-red-300"
              >
                Remove
              </button>
            </div>
            <audio src={project.music.assetUrl} controls className="w-full" />
          </div>
        )}
      </section>

      {project.music.assetUrl && (
        <section className="rounded-lg border border-news-border bg-black/20 p-3">
          <Slider
            label="Music Volume"
            value={project.music.volume}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateField('music.volume', v)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={project.music.duckingEnabled}
              onChange={(e) => updateField('music.duckingEnabled', e.target.checked)}
            />
            Duck music under speech
          </label>
          <p className="mt-1 text-xs text-slate-500">
            Automatically lowers the music whenever your video's own audio is playing.
          </p>
        </section>
      )}
    </div>
  );
}
