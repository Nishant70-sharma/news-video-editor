import { useProjectStore } from '../../store/useProjectStore';
import Slider from '../common/Slider';
import ColorPicker from '../common/ColorPicker';

const COLOR_GRADES = [
  { id: 'none', label: 'None' },
  { id: 'newsBlue', label: 'News Blue' },
  { id: 'warm', label: 'Warm' },
  { id: 'highContrast', label: 'High Contrast' }
];

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

function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export default function BrandingPanel() {
  const project = useProjectStore((s) => s.project);
  const updateField = useProjectStore((s) => s.updateField);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="Breaking News Stinger (intro flash)"
          checked={project.stinger.enabled}
          onChange={(v) => updateField('stinger.enabled', v)}
        />
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Plays before the main video — not shown in the live preview, only in the export.
        </p>
        {project.stinger.enabled && (
          <>
            <TextField label="Stinger Text" value={project.stinger.text} onChange={(v) => updateField('stinger.text', v)} />
            <Slider
              label="Duration"
              value={project.stinger.durationSec}
              min={0.5}
              max={4}
              step={0.5}
              unit="s"
              onChange={(v) => updateField('stinger.durationSec', v)}
            />
          </>
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="Subscribe/Like/Share Outro"
          checked={project.outro.enabled}
          onChange={(v) => updateField('outro.enabled', v)}
        />
        <p className="mb-2 mt-1 text-xs text-slate-500">
          Appended after the main video — not shown in the live preview, only in the export.
        </p>
        {project.outro.enabled && (
          <>
            <TextField
              label="Channel Name (optional)"
              value={project.outro.channelText}
              onChange={(v) => updateField('outro.channelText', v)}
              placeholder="Your Channel Name"
            />
            <Slider
              label="Duration"
              value={project.outro.durationSec}
              min={2}
              max={10}
              step={0.5}
              unit="s"
              onChange={(v) => updateField('outro.durationSec', v)}
            />
          </>
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="Lower Third Nameplate (reporter/expert name)"
          checked={project.nameplate.enabled}
          onChange={(v) => updateField('nameplate.enabled', v)}
        />
        <p className="mb-2 mt-1 text-xs text-slate-500">
          A small name + title card, separate from the headline banner — classic broadcast style.
        </p>
        {project.nameplate.enabled && (
          <>
            <TextField label="Name" value={project.nameplate.name} onChange={(v) => updateField('nameplate.name', v)} placeholder="Rahul Sharma" />
            <TextField
              label="Title / Location"
              value={project.nameplate.title}
              onChange={(v) => updateField('nameplate.title', v)}
              placeholder="Reporting from Delhi"
            />
            <div className="mt-2 grid grid-cols-2 gap-2">
              {['bottom-left', 'bottom-right'].map((p) => (
                <button
                  key={p}
                  onClick={() => updateField('nameplate.position', p)}
                  className={`rounded-md border py-1.5 text-xs capitalize ${
                    project.nameplate.position === p
                      ? 'border-news-accent2 bg-news-accent2/20 text-white'
                      : 'border-news-border text-slate-400'
                  }`}
                >
                  {p.replace('-', ' ')}
                </button>
              ))}
            </div>
            <Slider
              label="Show For (0 = whole video)"
              value={project.nameplate.durationSec}
              min={0}
              max={15}
              step={1}
              unit="s"
              onChange={(v) => updateField('nameplate.durationSec', v)}
            />
            <ColorPicker
              label="Card Color"
              value={project.nameplate.bgColor || project.headline.bgColor}
              onChange={(v) => updateField('nameplate.bgColor', v)}
            />
          </>
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="LIVE Badge (blinking)"
          checked={project.liveBadge.enabled}
          onChange={(v) => updateField('liveBadge.enabled', v)}
        />
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="Date/Time Stamp"
          checked={project.dateTimeStamp.enabled}
          onChange={(v) => updateField('dateTimeStamp.enabled', v)}
        />
        {project.dateTimeStamp.enabled && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((p) => (
              <button
                key={p}
                onClick={() => updateField('dateTimeStamp.position', p)}
                className={`rounded-md border py-1.5 text-xs capitalize ${
                  project.dateTimeStamp.position === p
                    ? 'border-news-accent2 bg-news-accent2/20 text-white'
                    : 'border-news-border text-slate-400'
                }`}
              >
                {p.replace('-', ' ')}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <Toggle
          label="Persistent Subscribe Bar"
          checked={project.subscribeBar.enabled}
          onChange={(v) => updateField('subscribeBar.enabled', v)}
        />
        <p className="mb-2 mt-1 text-xs text-slate-500">Runs along the bottom for the whole video.</p>
        {project.subscribeBar.enabled && (
          <TextField label="Bar Text" value={project.subscribeBar.text} onChange={(v) => updateField('subscribeBar.text', v)} />
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <h4 className="mb-2 text-sm font-semibold text-slate-200">Color Grade</h4>
        <div className="grid grid-cols-2 gap-2">
          {COLOR_GRADES.map((g) => (
            <button
              key={g.id}
              onClick={() => updateField('colorGrade', g.id)}
              className={`rounded-md border py-1.5 text-xs ${
                project.colorGrade === g.id
                  ? 'border-news-accent2 bg-news-accent2/20 text-white'
                  : 'border-news-border text-slate-400'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
