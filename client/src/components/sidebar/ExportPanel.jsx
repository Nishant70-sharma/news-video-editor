import { useEffect, useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import { getComplianceWarnings } from '../../utils/compliance';
import { saveProject } from '../../api/projects';
import { startExport, getExportStatus, downloadExportUrl } from '../../api/exportJob';
import WarningBanner from '../common/WarningBanner';

const RESOLUTIONS = ['720p', '1080p', '1440p', '4k'];
const FPS_OPTIONS = [24, 30, 60];
const CODECS = [
  { id: 'h264', label: 'H.264' },
  { id: 'h265', label: 'H.265' }
];

export default function ExportPanel() {
  const project = useProjectStore((s) => s.project);
  const updateField = useProjectStore((s) => s.updateField);
  const markSaved = useProjectStore((s) => s.markSaved);
  const set = (key, value) => updateField(`exportSettings.${key}`, value);

  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const pollRef = useRef(null);

  const warnings = getComplianceWarnings(project);
  const hasSource =
    project.sourceMode === 'images'
      ? project.images.length > 0
      : project.sourceMode === 'split' || project.sourceMode === 'sequential'
        ? project.splitClips.every((c) => c.sourceVideo)
        : !!project.sourceVideo;

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function handleExport() {
    setErr(null);
    setBusy(true);
    try {
      const saved = await saveProject(project);
      markSaved(saved);
      const jobId = await startExport(saved.id);
      setJob({ status: 'queued', progress: 0 });
      pollRef.current = setInterval(async () => {
        const status = await getExportStatus(jobId);
        setJob({ ...status, jobId });
        if (status.status === 'done' || status.status === 'error') {
          clearInterval(pollRef.current);
          setBusy(false);
        }
      }, 1000);
    } catch (e) {
      setErr(e.response?.data?.error || e.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Format</h3>
        <label className="mb-1 block text-sm text-slate-300">Resolution</label>
        <div className="mb-3 grid grid-cols-4 gap-2">
          {RESOLUTIONS.map((r) => (
            <button
              key={r}
              onClick={() => set('resolution', r)}
              className={`rounded-md border py-1.5 text-xs ${
                project.exportSettings.resolution === r ? 'border-news-accent2 bg-news-accent2/20 text-white' : 'border-news-border text-slate-400'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm text-slate-300">Frame Rate</label>
        <div className="mb-3 grid grid-cols-3 gap-2">
          {FPS_OPTIONS.map((f) => (
            <button
              key={f}
              onClick={() => set('fps', f)}
              className={`rounded-md border py-1.5 text-xs ${
                project.exportSettings.fps === f ? 'border-news-accent2 bg-news-accent2/20 text-white' : 'border-news-border text-slate-400'
              }`}
            >
              {f} FPS
            </button>
          ))}
        </div>

        <label className="mb-1 block text-sm text-slate-300">Codec</label>
        <div className="grid grid-cols-2 gap-2">
          {CODECS.map((c) => (
            <button
              key={c.id}
              onClick={() => set('codec', c.id)}
              className={`rounded-md border py-1.5 text-xs ${
                project.exportSettings.codec === c.id ? 'border-news-accent2 bg-news-accent2/20 text-white' : 'border-news-border text-slate-400'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Pre-export Checks</h3>
        <WarningBanner warnings={warnings} />
      </section>

      <button
        onClick={handleExport}
        disabled={busy || !hasSource}
        className="w-full rounded-md bg-news-accent py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? 'Exporting…' : 'Export Video'}
      </button>

      {err && <p className="text-xs text-red-400">{err}</p>}

      {job && (
        <div className="rounded-md border border-news-border bg-black/20 p-3 text-xs text-slate-300">
          <div className="mb-1 flex justify-between">
            <span className="capitalize">{job.status}</span>
            <span>{job.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded bg-news-border">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${job.progress ?? 0}%` }} />
          </div>
          {job.status === 'done' && (
            <a
              href={downloadExportUrl(job.jobId)}
              className="mt-3 block rounded-md bg-emerald-600 py-2 text-center font-semibold text-white hover:bg-emerald-500"
            >
              Download MP4
            </a>
          )}
          {job.status === 'error' && <p className="mt-2 text-red-400">{job.error}</p>}
        </div>
      )}
    </div>
  );
}
