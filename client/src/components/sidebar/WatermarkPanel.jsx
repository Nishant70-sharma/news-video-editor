import { useState } from 'react';
import FileDropzone from '../common/FileDropzone';
import Slider from '../common/Slider';
import ColorPicker from '../common/ColorPicker';
import { uploadLogo } from '../../api/videos';
import { useProjectStore } from '../../store/useProjectStore';

const POSITIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'custom'];

export default function WatermarkPanel() {
  const watermark = useProjectStore((s) => s.project.watermark);
  const updateField = useProjectStore((s) => s.updateField);
  const set = (key, value) => updateField(`watermark.${key}`, value);
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
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Watermark Image</h3>
        <p className="mb-2 text-xs text-slate-500">Displayed for the full duration of the export.</p>
        <FileDropzone accept=".png,.svg,.gif,image/png,image/svg+xml,image/gif" label="Upload PNG, SVG or animated GIF" onFile={handleFile} />
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        {watermark.assetUrl && (
          <div className="mt-3 flex items-center gap-3 rounded-md border border-news-border bg-black/20 p-2">
            <img src={watermark.assetUrl} alt="watermark" className="h-10 w-10 object-contain" />
            <span className="text-xs text-slate-400">Watermark uploaded ({watermark.kind})</span>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Position</h3>
        <div className="grid grid-cols-2 gap-2">
          {POSITIONS.map((p) => (
            <button
              key={p}
              onClick={() => set('position', p)}
              className={`rounded-md border py-1.5 text-xs capitalize ${
                watermark.position === p ? 'border-news-accent2 bg-news-accent2/20 text-white' : 'border-news-border text-slate-400'
              }`}
            >
              {p.replace('-', ' ')}
            </button>
          ))}
        </div>
        {watermark.position === 'custom' && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Slider label="X" value={watermark.xPct ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => set('xPct', v)} />
            <Slider label="Y" value={watermark.yPct ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => set('yPct', v)} />
          </div>
        )}
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
                (watermark.shape || 'default') === s.id
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
        <Slider label="Size" value={watermark.widthPct ?? 0.08} min={0.03} max={0.25} step={0.01} onChange={(v) => set('widthPct', v)} />
        <Slider label="Opacity" value={watermark.opacity ?? 0.6} min={0.1} max={1} step={0.05} onChange={(v) => set('opacity', v)} />
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <h3 className="mb-1 text-sm font-semibold text-slate-200">Moving Text Watermark</h3>
        <p className="mb-2 text-xs text-slate-500">
          Drifts across the middle of the video like a broadcast watermark, tinted with the
          template's color — separate from the fixed-corner image above.
        </p>
        <label className="block py-1.5">
          <span className="mb-1 block text-sm text-slate-300">Text</span>
          <input
            type="text"
            value={watermark.text || ''}
            onChange={(e) => set('text', e.target.value)}
            placeholder="e.g. yourchannel.com"
            className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-news-accent2 focus:outline-none"
          />
        </label>
        {watermark.text && (
          <>
            <ColorPicker label="Text Color" value={watermark.textColor} onChange={(v) => set('textColor', v)} />
            <Slider
              label="Speed"
              value={watermark.textSpeedPxPerSec ?? 90}
              min={30}
              max={250}
              step={10}
              unit="px/s"
              onChange={(v) => set('textSpeedPxPerSec', v)}
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['ltr', 'rtl'].map((dir) => (
                <button
                  key={dir}
                  onClick={() => set('textDirection', dir)}
                  className={`rounded-md border py-1.5 text-xs uppercase ${
                    (watermark.textDirection || 'ltr') === dir
                      ? 'border-news-accent2 bg-news-accent2/20 text-white'
                      : 'border-news-border text-slate-400'
                  }`}
                >
                  {dir === 'ltr' ? 'Left → Right' : 'Right → Left'}
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
