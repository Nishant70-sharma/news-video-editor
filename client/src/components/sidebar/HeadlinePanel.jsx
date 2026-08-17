import { useProjectStore } from '../../store/useProjectStore';
import ColorPicker from '../common/ColorPicker';
import Slider from '../common/Slider';
import { ANIMATION_OPTIONS } from '../../utils/animation';

function TextField({ label, value, onChange, placeholder }) {
  return (
    <label className="block py-1.5">
      <span className="mb-1 block text-sm text-slate-300">{label}</span>
      <input
        type="text"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-news-accent2 focus:outline-none"
      />
    </label>
  );
}

export default function HeadlinePanel() {
  const headline = useProjectStore((s) => s.project.headline);
  const updateField = useProjectStore((s) => s.updateField);
  const set = (key, value) => updateField(`headline.${key}`, value);

  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Text</h3>
        <TextField label="Main Headline" value={headline.main} onChange={(v) => set('main', v)} placeholder="BREAKING: ..." />
        <TextField label="Sub-headline" value={headline.sub} onChange={(v) => set('sub', v)} />
        <TextField label="Location Tag" value={headline.location} onChange={(v) => set('location', v)} placeholder="New Delhi" />
        <TextField label="Reporter Tag" value={headline.reporter} onChange={(v) => set('reporter', v)} placeholder="Jane Doe" />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Style</h3>
        <ColorPicker label="Background Color" value={headline.bgColor} onChange={(v) => set('bgColor', v)} />
        <Slider label="Opacity" value={headline.opacity ?? 0.85} min={0.1} max={1} step={0.05} onChange={(v) => set('opacity', v)} />
        <Slider label="Font Size" value={headline.fontSize ?? 40} min={20} max={72} onChange={(v) => set('fontSize', v)} unit="px" />
        <Slider label="Padding" value={headline.padding ?? 18} min={0} max={48} onChange={(v) => set('padding', v)} unit="px" />
        <Slider label="Border Radius" value={headline.borderRadius ?? 8} min={0} max={40} onChange={(v) => set('borderRadius', v)} unit="px" />
        <Slider label="Box Width" value={headline.widthPct ?? 1} min={0.3} max={1} step={0.01} onChange={(v) => set('widthPct', v)} />
        <Slider label="Box Height" value={headline.heightPct ?? 0.16} min={0.06} max={0.5} step={0.01} onChange={(v) => set('heightPct', v)} />

        <label className="block py-1.5">
          <span className="mb-1 block text-sm text-slate-300">Font</span>
          <select
            value={headline.fontFamily || 'display'}
            onChange={(e) => set('fontFamily', e.target.value)}
            className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
          >
            <option value="display">Anton (impact)</option>
            <option value="alt">Bebas Neue</option>
          </select>
        </label>

        <label className="block py-1.5">
          <span className="mb-1 block text-sm text-slate-300">Animation</span>
          <select
            value={headline.animation || 'none'}
            onChange={(e) => set('animation', e.target.value)}
            className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
          >
            {ANIMATION_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block py-1.5">
          <span className="mb-1 block text-sm text-slate-300">Position</span>
          <div className="grid grid-cols-2 gap-2">
            {['lower-third', 'top'].map((p) => (
              <button
                key={p}
                onClick={() => set('position', p)}
                className={`rounded-md border py-1.5 text-xs capitalize ${
                  headline.position === p
                    ? 'border-news-accent2 bg-news-accent2/20 text-white'
                    : 'border-news-border text-slate-400'
                }`}
              >
                {p.replace('-', ' ')}
              </button>
            ))}
          </div>
        </label>
      </section>
    </div>
  );
}
