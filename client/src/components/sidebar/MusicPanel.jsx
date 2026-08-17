import { useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Slider from '../common/Slider';
import { uploadMusic } from '../../api/music';
import { useProjectStore } from '../../store/useProjectStore';

export default function MusicPanel() {
  const project = useProjectStore((s) => s.project);
  const updateField = useProjectStore((s) => s.updateField);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-4">
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
