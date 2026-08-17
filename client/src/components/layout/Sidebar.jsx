const SECTIONS = [
  { id: 'media', label: 'Media', icon: '🎬' },
  { id: 'templates', label: 'Templates', icon: '📰' },
  { id: 'headline', label: 'Headlines', icon: '🔴' },
  { id: 'ticker', label: 'Ticker', icon: '📜' },
  { id: 'logo', label: 'Logo', icon: '🏷️' },
  { id: 'watermark', label: 'Watermark', icon: '💧' },
  { id: 'text', label: 'Text Layers', icon: '🔤' },
  { id: 'branding', label: 'Branding', icon: '📡' },
  { id: 'music', label: 'Music', icon: '🎵' },
  { id: 'export', label: 'Export', icon: '⬇️' }
];

export default function Sidebar({ active, onSelect }) {
  return (
    <nav className="flex w-full shrink-0 flex-row items-center gap-1 overflow-x-auto border-b border-news-border bg-news-panel px-2 py-2 md:h-full md:w-20 md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-0 md:py-4">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`flex w-16 shrink-0 flex-col items-center gap-1 rounded-md py-2 text-[11px] transition-colors ${
            active === s.id ? 'bg-news-accent2/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
          }`}
        >
          <span className="text-lg leading-none">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </nav>
  );
}
