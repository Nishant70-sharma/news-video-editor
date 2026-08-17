export default function ColorPicker({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-slate-300">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#ffffff'}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-7 cursor-pointer rounded border border-news-border bg-transparent p-0"
        />
        <span className="w-16 text-xs text-slate-400">{value}</span>
      </span>
    </label>
  );
}
