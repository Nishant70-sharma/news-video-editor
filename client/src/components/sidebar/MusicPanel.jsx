import { useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Slider from '../common/Slider';
import AudioRecorder from '../common/AudioRecorder';
import { uploadMusic } from '../../api/music';
import { useProjectStore } from '../../store/useProjectStore';

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

  async function handleFile(file) {
    setError(null);
    setBusy(true);
    try {
      const result = await uploadMusic(file);
      updateField('music.assetUrl', result.url);
      updateField('music.kind', result.kind);
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
        <FileDropzone
          accept="audio/mpeg,audio/wav,audio/x-m4a,.mp3,.wav,.m4a"
          label={busy ? 'Uploading…' : 'Drop an audio file or click to upload'}
          sublabel="MP3, WAV, M4A"
          onFile={handleFile}
        />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {project.music.assetUrl && (
          <div className="mt-3 rounded-lg border border-news-border bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span>Track uploaded ({project.music.kind})</span>
              <button
                onClick={() => {
                  updateField('music.assetUrl', '');
                  updateField('music.kind', '');
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
