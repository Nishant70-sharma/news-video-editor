import { useProjectStore } from '../../store/useProjectStore';
import ColorPicker from '../common/ColorPicker';
import Slider from '../common/Slider';
import { ANIMATION_OPTIONS } from '../../utils/animation';

function newLayer() {
  return {
    id: crypto.randomUUID(),
    text: 'New text',
    xPct: 0.5,
    yPct: 0.5,
    rotationDeg: 0,
    fontSize: 32,
    color: '#ffffff',
    bgColor: '',
    opacity: 1,
    shadow: true,
    stroke: false,
    animation: 'none'
  };
}

export default function TextLayersPanel() {
  const textLayers = useProjectStore((s) => s.project.textLayers);
  const addTextLayer = useProjectStore((s) => s.addTextLayer);
  const updateTextLayer = useProjectStore((s) => s.updateTextLayer);
  const removeTextLayer = useProjectStore((s) => s.removeTextLayer);

  return (
    <div className="space-y-4">
      <button
        onClick={() => addTextLayer(newLayer())}
        className="w-full rounded-md border border-news-accent2 bg-news-accent2/10 py-2 text-sm font-medium text-white hover:bg-news-accent2/20"
      >
        + Add Text Layer
      </button>

      {textLayers.length === 0 && <p className="text-xs text-slate-500">No text layers yet.</p>}

      {textLayers.map((layer, i) => (
        <div key={layer.id} className="space-y-2 rounded-lg border border-news-border bg-black/20 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Layer {i + 1}</span>
            <button onClick={() => removeTextLayer(layer.id)} className="text-xs text-red-400 hover:text-red-300">
              Remove
            </button>
          </div>
          <input
            type="text"
            value={layer.text}
            onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })}
            className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
          />
          <div className="grid grid-cols-2 gap-2">
            <Slider label="X" value={layer.xPct} min={0} max={1} step={0.01} onChange={(v) => updateTextLayer(layer.id, { xPct: v })} />
            <Slider label="Y" value={layer.yPct} min={0} max={1} step={0.01} onChange={(v) => updateTextLayer(layer.id, { yPct: v })} />
          </div>
          <Slider label="Rotation" value={layer.rotationDeg} min={-180} max={180} onChange={(v) => updateTextLayer(layer.id, { rotationDeg: v })} unit="°" />
          <Slider label="Font Size" value={layer.fontSize} min={12} max={96} onChange={(v) => updateTextLayer(layer.id, { fontSize: v })} unit="px" />
          <Slider label="Opacity" value={layer.opacity} min={0.1} max={1} step={0.05} onChange={(v) => updateTextLayer(layer.id, { opacity: v })} />
          <ColorPicker label="Text Color" value={layer.color} onChange={(v) => updateTextLayer(layer.id, { color: v })} />
          <ColorPicker label="Background" value={layer.bgColor || '#000000'} onChange={(v) => updateTextLayer(layer.id, { bgColor: v })} />
          <label className="block py-1.5">
            <span className="mb-1 block text-sm text-slate-300">Animation</span>
            <select
              value={layer.animation || 'none'}
              onChange={(e) => updateTextLayer(layer.id, { animation: e.target.value })}
              className="w-full rounded-md border border-news-border bg-black/30 px-2 py-1.5 text-sm text-slate-100"
            >
              {ANIMATION_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={layer.shadow} onChange={(e) => updateTextLayer(layer.id, { shadow: e.target.checked })} />
              Shadow
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input type="checkbox" checked={layer.stroke} onChange={(e) => updateTextLayer(layer.id, { stroke: e.target.checked })} />
              Stroke
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}
