import { useState } from 'react';
import FileDropzone from '../../common/FileDropzone';
import { uploadImages } from '../../../api/images';
import { useProjectStore } from '../../../store/useProjectStore';

export default function ImagesSource() {
  const images = useProjectStore((s) => s.project.images);
  const imagesKenBurns = useProjectStore((s) => s.project.imagesKenBurns);
  const transitionStyle = useProjectStore((s) => s.project.transitionStyle);
  const updateField = useProjectStore((s) => s.updateField);
  const addImages = useProjectStore((s) => s.addImages);
  const updateImage = useProjectStore((s) => s.updateImage);
  const removeImage = useProjectStore((s) => s.removeImage);
  const moveImage = useProjectStore((s) => s.moveImage);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files) {
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadImages(files);
      addImages(uploaded);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setUploading(false);
    }
  }

  const totalSec = images.reduce((sum, img) => sum + (img.durationSec || 3), 0);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Images</h3>
      <p className="mb-2 text-xs text-slate-500">
        Select multiple photos to build a slideshow video — each shown for its own duration, hard
        cut between them.
      </p>
      <FileDropzone
        accept="image/png,image/jpeg,image/webp"
        label={uploading ? 'Uploading…' : 'Drop images or click to select (multiple allowed)'}
        multiple
        onFiles={handleFiles}
      />
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 space-y-3 rounded-lg border border-news-border bg-black/20 p-3">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={imagesKenBurns}
            onChange={(e) => updateField('imagesKenBurns', e.target.checked)}
          />
          Ken Burns zoom
        </label>
        <div>
          <span className="mb-1 block text-sm text-slate-300">Transition</span>
          <div className="grid grid-cols-2 gap-2">
            {['cut', 'crossfade'].map((style) => (
              <button
                key={style}
                onClick={() => updateField('transitionStyle', style)}
                className={`rounded-md border py-1.5 text-xs capitalize ${
                  transitionStyle === style
                    ? 'border-news-accent2 bg-news-accent2/20 text-white'
                    : 'border-news-border text-slate-400'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>

      {images.length === 0 && <p className="mt-3 text-xs text-slate-500">No images added yet.</p>}

      {images.length > 0 && (
        <>
          <p className="mt-3 text-xs text-slate-400">
            {images.length} image{images.length === 1 ? '' : 's'} · {totalSec.toFixed(1)}s total
          </p>
          <div className="mt-2 space-y-2">
            {images.map((img, i) => (
              <div key={img.id} className="flex items-center gap-2 rounded-md border border-news-border bg-black/20 p-2">
                <img src={img.url} alt={`Image ${i + 1}`} className="h-10 w-10 shrink-0 rounded object-cover" />
                <div className="flex flex-1 items-center gap-1">
                  <input
                    type="number"
                    min={0.5}
                    max={30}
                    step={0.5}
                    value={img.durationSec}
                    onChange={(e) => updateImage(img.id, { durationSec: Math.max(0.5, Number(e.target.value)) })}
                    className="w-16 rounded-md border border-news-border bg-black/30 px-2 py-1 text-xs text-slate-100"
                  />
                  <span className="text-xs text-slate-500">sec</span>
                </div>
                <button
                  onClick={() => moveImage(img.id, -1)}
                  disabled={i === 0}
                  className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  title="Move earlier"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveImage(img.id, 1)}
                  disabled={i === images.length - 1}
                  className="text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30"
                  title="Move later"
                >
                  ↓
                </button>
                <button onClick={() => removeImage(img.id)} className="text-xs text-red-400 hover:text-red-300">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
