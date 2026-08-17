export default function WarningBanner({ warnings }) {
  if (!warnings.length) {
    return (
      <div className="rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-300">
        No pre-export issues detected.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {warnings.map((w, i) => (
        <div
          key={i}
          className={`rounded-md border px-3 py-2 text-sm ${
            w.level === 'error'
              ? 'border-red-800 bg-red-950/50 text-red-300'
              : 'border-amber-800 bg-amber-950/50 text-amber-300'
          }`}
        >
          {w.message}
        </div>
      ))}
    </div>
  );
}
