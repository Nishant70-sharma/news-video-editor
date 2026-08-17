import { useProjectStore } from '../../store/useProjectStore';
import ColorPicker from '../common/ColorPicker';
import Slider from '../common/Slider';
import { TICKER_ANIMATION_OPTIONS } from '../../utils/animation';

export default function TickerPanel() {
  const ticker = useProjectStore((s) => s.project.ticker);
  const updateField = useProjectStore((s) => s.updateField);
  const set = (key, value) => updateField(`ticker.${key}`, value);

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Ticker Text</h3>
        <textarea
          value={ticker.text || ''}
          onChange={(e) => set('text', e.target.value)}
          rows={3}
          placeholder="Scrolling news text..."
          className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-news-accent2 focus:outline-none"
        />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Motion</h3>
        <div className="grid grid-cols-2 gap-2">
          {['ltr', 'rtl'].map((d) => (
            <button
              key={d}
              onClick={() => set('direction', d)}
              className={`rounded-md border py-1.5 text-xs uppercase ${
                ticker.direction === d
                  ? 'border-news-accent2 bg-news-accent2/20 text-white'
                  : 'border-news-border text-slate-400'
              }`}
            >
              {d === 'ltr' ? 'Left → Right' : 'Right → Left'}
            </button>
          ))}
        </div>
        <Slider label="Speed" value={ticker.speedPxPerSec ?? 120} min={30} max={400} step={10} onChange={(v) => set('speedPxPerSec', v)} unit="px/s" />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Style</h3>
        <ColorPicker label="Background Color" value={ticker.bgColor} onChange={(v) => set('bgColor', v)} />
        <ColorPicker label="Text Color" value={ticker.textColor} onChange={(v) => set('textColor', v)} />
        <Slider label="Font Size" value={ticker.fontSize ?? 28} min={16} max={48} onChange={(v) => set('fontSize', v)} unit="px" />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Animation</h3>
        <p className="mb-2 text-xs text-slate-500">
          The scrolling motion always runs; this only controls how the ticker bar itself enters.
        </p>
        <select
          value={ticker.animation || 'none'}
          onChange={(e) => set('animation', e.target.value)}
          className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
        >
          {TICKER_ANIMATION_OPTIONS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
      </section>
    </div>
  );
}
