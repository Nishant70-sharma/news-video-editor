import { useState } from 'react';
import FileDropzone from '../../common/FileDropzone';
import Slider from '../../common/Slider';
import { uploadVideo } from '../../../api/videos';
import { useProjectStore } from '../../../store/useProjectStore';

function MainClipSlot() {
  const project = useProjectStore((s) => s.project);
  const setSourceVideo = useProjectStore((s) => s.setSourceVideo);
  const updateField = useProjectStore((s) => s.updateField);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  async function handleFile(file) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadVideo(file, setProgress);
      setSourceVideo(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProgress(null);
    }
  }

  const duration = project.sourceVideo?.metadata?.duration || 0;

  return (
    <div className="space-y-2 rounded-lg border border-news-border bg-black/20 p-3">
      <h4 className="text-xs font-semibold text-slate-300">Main Video</h4>
      <FileDropzone
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
        label={project.sourceVideo ? 'Replace video' : 'Upload main video'}
        onFile={handleFile}
      />
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded bg-news-border">
          <div className="h-full bg-news-accent2 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {project.sourceVideo && (
        <>
          <img src={project.sourceVideo.thumbnailUrl} alt="Main video" className="w-full rounded-md border border-news-border" />
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <label className="flex flex-col gap-1">
              Start (s)
              <input
                type="number"
                min={0}
                max={Math.max(0, duration - 0.5)}
                step={0.1}
                value={project.trim.startSec}
                onChange={(e) => updateField('trim.startSec', Math.min(Number(e.target.value), project.trim.endSec - 0.5))}
                className="rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              End (s)
              <input
                type="number"
                min={0.5}
                max={duration}
                step={0.1}
                value={project.trim.endSec}
                onChange={(e) => updateField('trim.endSec', Math.max(Number(e.target.value), project.trim.startSec + 0.5))}
                className="rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

function PipClipSlot() {
  const pipClip = useProjectStore((s) => s.project.pipClip);
  const setPipClipVideo = useProjectStore((s) => s.setPipClipVideo);
  const setPipClipTrim = useProjectStore((s) => s.setPipClipTrim);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  async function handleFile(file) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadVideo(file, setProgress);
      setPipClipVideo(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProgress(null);
    }
  }

  const duration = pipClip.sourceVideo?.metadata?.duration || 0;

  return (
    <div className="space-y-2 rounded-lg border border-news-border bg-black/20 p-3">
      <h4 className="text-xs font-semibold text-slate-300">Picture-in-Picture Clip (muted)</h4>
      <FileDropzone
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
        label={pipClip.sourceVideo ? 'Replace clip' : 'Upload PiP clip'}
        onFile={handleFile}
      />
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded bg-news-border">
          <div className="h-full bg-news-accent2 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {pipClip.sourceVideo && (
        <>
          <img src={pipClip.sourceVideo.thumbnailUrl} alt="PiP clip" className="w-full rounded-md border border-news-border" />
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <label className="flex flex-col gap-1">
              Start (s)
              <input
                type="number"
                min={0}
                max={Math.max(0, duration - 0.5)}
                step={0.1}
                value={pipClip.trim.startSec}
                onChange={(e) => setPipClipTrim({ startSec: Math.min(Number(e.target.value), pipClip.trim.endSec - 0.5) })}
                className="rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
              />
            </label>
            <label className="flex flex-col gap-1">
              End (s)
              <input
                type="number"
                min={0.5}
                max={duration}
                step={0.1}
                value={pipClip.trim.endSec}
                onChange={(e) => setPipClipTrim({ endSec: Math.max(Number(e.target.value), pipClip.trim.startSec + 0.5) })}
                className="rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export default function PipSource() {
  const pipClip = useProjectStore((s) => s.project.pipClip);
  const updateField = useProjectStore((s) => s.updateField);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Picture-in-Picture</h3>
      <p className="mb-2 text-xs text-slate-500">
        The main video plays full-screen with a small second clip in a corner — the small clip's
        audio is always muted.
      </p>
      <div className="space-y-3">
        <MainClipSlot />
        <PipClipSlot />
      </div>

      <div className="mt-4 rounded-lg border border-news-border bg-black/20 p-3">
        <Slider
          label="PiP Box Size"
          value={pipClip.sizePct}
          min={0.15}
          max={0.5}
          step={0.01}
          onChange={(v) => updateField('pipClip.sizePct', v)}
        />
        <label className="block py-1.5">
          <span className="mb-1 block text-sm text-slate-300">Position</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'top-left', label: 'Top Left' },
              { id: 'top-right', label: 'Top Right' },
              { id: 'bottom-left', label: 'Bottom Left' },
              { id: 'bottom-right', label: 'Bottom Right' }
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => updateField('pipClip.position', opt.id)}
                className={`rounded-md border py-1.5 text-xs ${
                  pipClip.position === opt.id
                    ? 'border-news-accent2 bg-news-accent2/20 text-white'
                    : 'border-news-border text-slate-400'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </label>
      </div>
    </section>
  );
}
