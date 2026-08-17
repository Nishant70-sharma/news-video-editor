import { useProjectStore, SOURCE_MODES_BY_FORMAT } from '../../store/useProjectStore';
import SingleVideoSource from './media/SingleVideoSource';
import ImagesSource from './media/ImagesSource';
import SplitScreenSource from './media/SplitScreenSource';
import PipSource from './media/PipSource';

const FORMATS = [
  { id: '9:16', label: 'Short', sublabel: '9:16 vertical' },
  { id: '16:9', label: 'Long', sublabel: '16:9 horizontal' }
];

const MODE_LABELS = {
  single: 'Single Video',
  images: 'Images to Video',
  split: 'Split Screen',
  sequential: 'Sequential',
  pip: 'Picture-in-Picture'
};

const SOURCE_PANELS = {
  single: SingleVideoSource,
  images: ImagesSource,
  split: SplitScreenSource,
  sequential: SplitScreenSource,
  pip: PipSource
};

export default function MediaPanel() {
  const project = useProjectStore((s) => s.project);
  const setFormat = useProjectStore((s) => s.setFormat);
  const setSourceMode = useProjectStore((s) => s.setSourceMode);

  const availableModes = SOURCE_MODES_BY_FORMAT[project.aspectRatio] || ['single'];
  const SourcePanel = SOURCE_PANELS[project.sourceMode] || SingleVideoSource;

  return (
    <div className="space-y-5">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Format</h3>
        <div className="grid grid-cols-2 gap-2">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`rounded-md border py-2 text-xs ${
                project.aspectRatio === f.id
                  ? 'border-news-accent2 bg-news-accent2/20 text-white'
                  : 'border-news-border text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="font-semibold">{f.label}</div>
              <div className="text-[10px] opacity-80">{f.sublabel}</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-slate-200">Source</h3>
        <div className={`grid gap-2 ${availableModes.length >= 4 ? 'grid-cols-2' : availableModes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {availableModes.map((mode) => (
            <button
              key={mode}
              onClick={() => setSourceMode(mode)}
              className={`rounded-md border py-2 text-[11px] leading-tight ${
                project.sourceMode === mode
                  ? 'border-news-accent2 bg-news-accent2/20 text-white'
                  : 'border-news-border text-slate-400 hover:text-slate-200'
              }`}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </section>

      <SourcePanel />
    </div>
  );
}
