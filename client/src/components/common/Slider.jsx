export default function Slider({ label, value, min, max, step = 1, onChange, unit = '' }) {
  return (
    <label className="block py-1.5">
      <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span className="text-xs text-slate-400">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-news-accent2"
      />
    </label>
  );
}
