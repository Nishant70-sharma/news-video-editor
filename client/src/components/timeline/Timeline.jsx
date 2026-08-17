import { useProjectStore } from '../../store/useProjectStore';

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function Timeline({ videoRef }) {
  const project = useProjectStore((s) => s.project);
  const updateField = useProjectStore((s) => s.updateField);

  // Images/Split have their own per-item duration/trim controls in the Media panel — show a
  // compact read-only summary here instead of duplicating those controls.
  if (project.sourceMode === 'images') {
    const totalSec = project.images.reduce((sum, img) => sum + (img.durationSec || 3), 0);
    return (
      <div className="flex h-28 items-center justify-center border-t border-news-border bg-news-panel text-xs text-slate-500">
        {project.images.length
          ? `Slideshow: ${project.images.length} images · ${totalSec.toFixed(1)}s total`
          : 'Add images in the Media panel to begin.'}
      </div>
    );
  }

  if (project.sourceMode === 'split' || project.sourceMode === 'sequential') {
    const [a, b] = project.splitClips;
    const lenA = a.sourceVideo ? a.trim.endSec - a.trim.startSec : null;
    const lenB = b.sourceVideo ? b.trim.endSec - b.trim.startSec : null;
    const sequential = project.sourceMode === 'sequential';
    const alternate = !sequential && project.splitAlternate;
    const summary =
      lenA && lenB
        ? sequential
          ? `Sequential: Clip A ${lenA.toFixed(1)}s → Clip B ${lenB.toFixed(1)}s · ${(lenA + lenB).toFixed(1)}s total`
          : alternate
            ? `Split Screen (alternating): Clip A ${lenA.toFixed(1)}s turn → Clip B ${lenB.toFixed(1)}s turn · ${(lenA + lenB).toFixed(1)}s total`
            : `Split Screen: Clip A ${lenA.toFixed(1)}s · Clip B ${lenB.toFixed(1)}s (exported length = shorter of the two)`
        : 'Upload both clips in the Media panel to begin.';
    return (
      <div className="flex h-28 items-center justify-center border-t border-news-border bg-news-panel text-xs text-slate-500">
        {summary}
      </div>
    );
  }

  if (!project.sourceVideo) {
    return (
      <div className="flex h-28 items-center justify-center border-t border-news-border bg-news-panel text-xs text-slate-600">
        Timeline appears once a video is uploaded.
      </div>
    );
  }

  const duration = project.sourceVideo.metadata.duration;
  const { startSec, endSec } = project.trim;

  function seekTo(t) {
    if (videoRef.current) videoRef.current.currentTime = t;
  }

  return (
    <div className="flex h-28 flex-col justify-center gap-2 border-t border-news-border bg-news-panel px-6">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Clip Trim</span>
        <span>
          {formatTime(startSec)} — {formatTime(endSec)} · {formatTime(endSec - startSec)} selected
        </span>
      </div>
      <div
        className="relative h-10 rounded-md border border-news-border bg-black/40 bg-cover bg-center"
        style={{ backgroundImage: `url(${project.sourceVideo.thumbnailUrl})` }}
      >
        <div
          className="absolute inset-y-0 bg-news-accent2/25 border-x-2 border-news-accent2"
          style={{ left: `${(startSec / duration) * 100}%`, right: `${100 - (endSec / duration) * 100}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Start
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={startSec}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), endSec - 0.5);
              updateField('trim.startSec', v);
              seekTo(v);
            }}
            className="flex-1 accent-news-accent2"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400">
          End
          <input
            type="range"
            min={0}
            max={duration}
            step={0.1}
            value={endSec}
            onChange={(e) => {
              const v = Math.max(Number(e.target.value), startSec + 0.5);
              updateField('trim.endSec', v);
              seekTo(v);
            }}
            className="flex-1 accent-news-accent2"
          />
        </label>
      </div>
    </div>
  );
}
