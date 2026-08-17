import { NEWS_TEMPLATES } from '../../templates/newsTemplates';
import { useProjectStore } from '../../store/useProjectStore';

export default function TemplatesPanel() {
  const project = useProjectStore((s) => s.project);
  const applyTemplate = useProjectStore((s) => s.applyTemplate);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-200">News Templates</h3>
      <p className="text-xs text-slate-500">
        Applies banner colors, ticker style, and logo placement. Everything stays fully editable after.
      </p>
      {NEWS_TEMPLATES.map((t) => (
        <button
          key={t.id}
          onClick={() => applyTemplate(t.id)}
          className={`block w-full rounded-lg border p-3 text-left transition-colors ${
            project.template === t.id
              ? 'border-news-accent2 bg-news-accent2/10'
              : 'border-news-border hover:border-slate-500'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded" style={{ backgroundColor: t.headline.bgColor }} />
            <span className="text-sm font-medium text-slate-200">{t.label}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{t.description}</p>
        </button>
      ))}
    </div>
  );
}
