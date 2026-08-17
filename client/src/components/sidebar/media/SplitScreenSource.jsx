import { useState } from 'react';
import FileDropzone from '../../common/FileDropzone';
import Slider from '../../common/Slider';
import { uploadVideo } from '../../../api/videos';
import { useProjectStore } from '../../../store/useProjectStore';

function ClipSlot({ label, index }) {
  const clip = useProjectStore((s) => s.project.splitClips[index]);
  const setSplitClipVideo = useProjectStore((s) => s.setSplitClipVideo);
  const setSplitClipTrim = useProjectStore((s) => s.setSplitClipTrim);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);

  async function handleFile(file) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadVideo(file, setProgress);
      setSplitClipVideo(index, result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProgress(null);
    }
  }

  const duration = clip.sourceVideo?.metadata?.duration || 0;

  return (
    <div className="space-y-2 rounded-lg border border-news-border bg-black/20 p-3">
      <h4 className="text-xs font-semibold text-slate-300">{label}</h4>
      <FileDropzone
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
        label={clip.sourceVideo ? 'Replace clip' : 'Upload clip'}
        onFile={handleFile}
      />
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded bg-news-border">
          <div className="h-full bg-news-accent2 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}

      {clip.sourceVideo && (
        <>
          <img src={clip.sourceVideo.thumbnailUrl} alt={label} className="w-full rounded-md border border-news-border" />
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <label className="flex flex-col gap-1">
              Start (s)
              <input
                type="number"
                min={0}
                max={Math.max(0, duration - 0.5)}
                step={0.1}
                value={clip.trim.startSec}
                onChange={(e) =>
                  setSplitClipTrim(index, { startSec: Math.min(Number(e.target.value), clip.trim.endSec - 0.5) })
                }
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
                value={clip.trim.endSec}
                onChange={(e) =>
                  setSplitClipTrim(index, { endSec: Math.max(Number(e.target.value), clip.trim.startSec + 0.5) })
                }
                className="rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

export default function SplitScreenSource() {
  const project = useProjectStore((s) => s.project);
  const updateField = useProjectStore((s) => s.updateField);
  const isSequential = project.sourceMode === 'sequential';
  const vertical = project.aspectRatio === '9:16';
  const alternate = !isSequential && project.splitAlternate;

  const clipALabel = isSequential ? 'Clip A (plays first)' : alternate ? 'Clip A (plays first turn)' : 'Clip A (audio used)';
  const clipBLabel = isSequential ? 'Clip B (plays second)' : alternate ? 'Clip B (plays second turn)' : 'Clip B (muted)';

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">{isSequential ? 'Sequential' : 'Split Screen'}</h3>
      <p className="mb-2 text-xs text-slate-500">
        {isSequential
          ? "Clip A plays fully, then Clip B starts — both clips' audio is kept."
          : alternate
            ? `Both boxes stay on screen (${vertical ? 'stacked top / bottom' : 'side by side'}), but only one clip plays at a time — Clip A plays while Clip B freezes, then they swap. Audio hands off with the video.`
            : `Two clips playing at once, ${vertical ? 'stacked top / bottom' : 'side by side'}. Only Clip A's audio is used in the export.`}
      </p>
      <div className="space-y-3">
        <ClipSlot label={clipALabel} index={0} />
        <ClipSlot label={clipBLabel} index={1} />
      </div>

      {isSequential && (
        <div className="mt-4 rounded-lg border border-news-border bg-black/20 p-3">
          <h4 className="mb-2 text-xs font-semibold text-slate-300">Transition</h4>
          <div className="grid grid-cols-2 gap-2">
            {['cut', 'crossfade'].map((style) => (
              <button
                key={style}
                onClick={() => updateField('transitionStyle', style)}
                className={`rounded-md border py-1.5 text-xs capitalize ${
                  project.transitionStyle === style
                    ? 'border-news-accent2 bg-news-accent2/20 text-white'
                    : 'border-news-border text-slate-400'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isSequential && (
        <div className="mt-4 rounded-lg border border-news-border bg-black/20 p-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={project.splitAlternate}
              onChange={(e) => updateField('splitAlternate', e.target.checked)}
            />
            Alternate Playback (one clip plays, then the other — boxes stay visible throughout)
          </label>
        </div>
      )}

      {!isSequential && (
        <div className="mt-3 rounded-lg border border-news-border bg-black/20 p-3">
          <h4 className="mb-1 text-xs font-semibold text-slate-300">Text Margin</h4>
          <p className="mb-2 text-xs text-slate-500">
            Reserves a plain band so a headline/text overlay doesn't sit on top of either clip.
          </p>
          <Slider
            label="Margin Amount"
            value={project.splitMarginPct}
            min={0}
            max={0.3}
            step={0.01}
            onChange={(v) => updateField('splitMarginPct', v)}
          />
          <label className="block py-1.5">
            <span className="mb-1 block text-sm text-slate-300">Margin Position</span>
            <p className="mb-1.5 text-[11px] text-slate-500">
              Any edge works regardless of the split direction — e.g. a top/bottom split can still
              reserve its margin on the left or right.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'top', label: 'Top' },
                { id: 'bottom', label: 'Bottom' },
                { id: 'left', label: 'Left' },
                { id: 'right', label: 'Right' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => updateField('splitMarginPosition', opt.id)}
                  className={`rounded-md border py-1.5 text-xs ${
                    (project.splitMarginPosition || 'bottom') === opt.id
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
      )}
    </section>
  );
}
