import { useRef, useState } from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import Slider from '../common/Slider';
import ColorPicker from '../common/ColorPicker';
import { previewOutro, previewStingerSfx } from '../../api/exportJob';

const SOUND_EFFECT_OPTIONS = [
  { id: 'none', label: 'None' },
  { id: 'glassBreak', label: 'Glass Break' },
  { id: 'whoosh', label: 'Whoosh' },
  { id: 'newsChime', label: 'News Alert Chime' }
];

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
  const addSoundEffect = useProjectStore((s) => s.addSoundEffect);
  const updateSoundEffect = useProjectStore((s) => s.updateSoundEffect);
  const removeSoundEffect = useProjectStore((s) => s.removeSoundEffect);
  const [outroPreviewUrl, setOutroPreviewUrl] = useState(null);
  const [outroPreviewBusy, setOutroPreviewBusy] = useState(false);
  const [outroPreviewError, setOutroPreviewError] = useState(null);
  const [sfxBusy, setSfxBusy] = useState(false);
  const [sfxError, setSfxError] = useState(null);
  const sfxAudioRef = useRef(null);

  async function handlePlaySfx(effectId) {
    setSfxError(null);
    setSfxBusy(true);
    try {
      const url = await previewStingerSfx(effectId);
      if (sfxAudioRef.current) {
        sfxAudioRef.current.src = `${url}?t=${Date.now()}`;
        await sfxAudioRef.current.play();
      }
    } catch (err) {
      setSfxError(err.response?.data?.error || err.message);
    } finally {
      setSfxBusy(false);
    }
  }

  const videoDurationSec = project.sourceVideo?.metadata?.duration;

  async function handlePreviewOutro() {
    setOutroPreviewError(null);
    setOutroPreviewBusy(true);
    setOutroPreviewUrl(null);
    try {
      const url = await previewOutro({
        outro: project.outro,
        logo: project.logo,
        aspectRatio: project.aspectRatio,
        resolution: '720p'
      });
      setOutroPreviewUrl(`${url}?t=${Date.now()}`);
    } catch (err) {
      setOutroPreviewError(err.response?.data?.error || err.message);
    } finally {
      setOutroPreviewBusy(false);
    }
  }

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
            <span className="mb-1 mt-2 block text-sm text-slate-300">Sound Effect</span>
            <p className="mb-2 text-xs text-slate-500">
              Synthesized on the fly (no downloaded audio) — plays once as the stinger flashes.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_EFFECT_OPTIONS.map((sfx) => (
                <button
                  key={sfx.id}
                  onClick={() => updateField('stinger.soundEffect', sfx.id)}
                  className={`rounded-md border py-1.5 text-xs ${
                    (project.stinger.soundEffect || 'none') === sfx.id
                      ? 'border-news-accent2 bg-news-accent2/20 text-white'
                      : 'border-news-border text-slate-400'
                  }`}
                >
                  {sfx.label}
                </button>
              ))}
            </div>
            {project.stinger.soundEffect && project.stinger.soundEffect !== 'none' && (
              <button
                onClick={() => handlePlaySfx(project.stinger.soundEffect)}
                disabled={sfxBusy}
                className="mt-2 w-full rounded-md border border-news-border py-2 text-xs text-slate-300 hover:border-news-accent2 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sfxBusy ? 'Generating…' : '🔊 Test Sound'}
              </button>
            )}
          </>
        )}
      </section>

      <section className="rounded-lg border border-news-border bg-black/20 p-3">
        <h3 className="mb-1 text-sm font-semibold text-slate-200">Sound Effects (anywhere in the video)</h3>
        <p className="mb-2 text-xs text-slate-500">
          Pick a moment in your video and layer one of these synthesized sounds on top of its
          existing audio — not tied to the stinger, place it wherever something happens on screen.
        </p>
        {project.soundEffects.map((sfx) => (
          <div key={sfx.id} className="mb-2 rounded-md border border-news-border bg-black/20 p-2">
            <div className="grid grid-cols-3 gap-1.5">
              {SOUND_EFFECT_OPTIONS.filter((o) => o.id !== 'none').map((o) => (
                <button
                  key={o.id}
                  onClick={() => updateSoundEffect(sfx.id, { effect: o.id })}
                  className={`rounded-md border py-1 text-[11px] leading-tight ${
                    sfx.effect === o.id
                      ? 'border-news-accent2 bg-news-accent2/20 text-white'
                      : 'border-news-border text-slate-400'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                Starts at
                <input
                  type="number"
                  min={0}
                  max={videoDurationSec || undefined}
                  step={0.1}
                  value={sfx.startSec}
                  onChange={(e) => updateSoundEffect(sfx.id, { startSec: Math.max(0, Number(e.target.value)) })}
                  className="w-20 rounded-md border border-news-border bg-black/30 px-2 py-1 text-slate-100"
                />
                sec{videoDurationSec ? ` / ${videoDurationSec.toFixed(1)}s total` : ''}
              </label>
              <button onClick={() => removeSoundEffect(sfx.id)} className="text-xs text-red-400 hover:text-red-300">
                Remove
              </button>
            </div>
            <button
              onClick={() => handlePlaySfx(sfx.effect)}
              disabled={sfxBusy}
              className="mt-2 w-full rounded-md border border-news-border py-1.5 text-xs text-slate-300 hover:border-news-accent2 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sfxBusy ? 'Generating…' : '🔊 Test'}
            </button>
          </div>
        ))}
        <button
          onClick={() => addSoundEffect({ id: crypto.randomUUID(), effect: 'glassBreak', startSec: 0 })}
          className="w-full rounded-md border border-dashed border-news-border py-2 text-xs text-slate-400 hover:border-news-accent2 hover:text-white"
        >
          + Add Sound Effect
        </button>
        {sfxError && <p className="mt-2 text-xs text-red-400">{sfxError}</p>}
        <audio ref={sfxAudioRef} className="hidden" />
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
            <button
              onClick={handlePreviewOutro}
              disabled={outroPreviewBusy}
              className="mt-2 w-full rounded-md border border-news-border py-2 text-xs text-slate-300 hover:border-news-accent2 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {outroPreviewBusy ? 'Rendering preview…' : '🔍 Preview Outro'}
            </button>
            <p className="mt-1 text-xs text-slate-500">
              Renders just this outro on its own (fast) so you can check it before it's attached
              to your full video.
            </p>
            {outroPreviewError && <p className="mt-2 text-xs text-red-400">{outroPreviewError}</p>}
            {outroPreviewUrl && (
              <video
                key={outroPreviewUrl}
                src={outroPreviewUrl}
                controls
                autoPlay
                className="mt-2 w-full rounded-md border border-news-border"
              />
            )}
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
