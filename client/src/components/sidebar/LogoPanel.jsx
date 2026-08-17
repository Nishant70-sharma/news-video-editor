import { useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Slider from '../common/Slider';
import { uploadLogo } from '../../api/videos';
import { useProjectStore } from '../../store/useProjectStore';

const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

export default function LogoPanel() {
  const logo = useProjectStore((s) => s.project.logo);
  const updateField = useProjectStore((s) => s.updateField);
  const set = (key, value) => updateField(`logo.${key}`, value);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    setError(null);
    try {
      const result = await uploadLogo(file);
      set('assetUrl', result.url);
      set('kind', result.kind);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
  }

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Logo Image</h3>
        <FileDropzone accept=".png,.svg,.gif,image/png,image/svg+xml,image/gif" label="Upload PNG, SVG or animated GIF" onFile={handleFile} />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {logo.assetUrl && (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-news-border bg-black/20 p-2">
            <img src={logo.assetUrl} alt="logo" className="h-10 w-10 object-contain" />
            <span className="text-xs text-slate-400">Logo uploaded ({logo.kind})</span>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Placement</h3>
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => set('position', p)}
              className={`rounded-md border py-1.5 text-xs capitalize ${
                logo.position === p ? 'border-news-accent2 bg-news-accent2/20 text-white' : 'border-news-border text-slate-400'
              }`}
            >
              {p.replace('-', ' ')}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={!!logo.safeAreaSnap}
            onChange={(e) => set('safeAreaSnap', e.target.checked)}
          />
          Snap to safe area
        </label>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Shape</h3>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'default', label: 'Original' },
            { id: 'circle', label: 'Circle' }
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => set('shape', s.id)}
              className={`rounded-md border py-1.5 text-xs ${
                (logo.shape || 'default') === s.id
                  ? 'border-news-accent2 bg-news-accent2/20 text-white'
                  : 'border-news-border text-slate-400'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Adjust</h3>
        <Slider label="Size" value={logo.widthPct ?? 0.1} min={0.03} max={0.35} step={0.01} onChange={(v) => set('widthPct', v)} />
        <Slider label="Opacity" value={logo.opacity ?? 1} min={0.1} max={1} step={0.05} onChange={(v) => set('opacity', v)} />
        <Slider label="Margin" value={logo.marginPx ?? 24} min={0} max={80} onChange={(v) => set('marginPx', v)} unit="px" />
      </section>
    </div>
  );
}
