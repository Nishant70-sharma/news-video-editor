import { Link } from 'react-router-dom';

export default function DashboardLayout({ projectName, onNameChange, onSave, saving, children }) {
  return (
    <div className="flex h-screen w-screen flex-col bg-news-bg text-slate-100">
      <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-news-border bg-news-panel px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Link to="/" className="shrink-0 text-sm text-slate-400 hover:text-slate-200">
            ←<span className="hidden sm:inline"> Projects</span>
          </Link>
          <input
            value={projectName}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full min-w-0 rounded-md bg-transparent px-2 py-1 text-sm font-medium text-slate-100 focus:bg-black/30 focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span className="hidden text-xs uppercase tracking-wider text-slate-500 md:inline">News Studio</span>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-md bg-news-accent2 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-col overflow-y-auto md:flex-row md:overflow-hidden">{children}</div>
    </div>
  );
}
