import { useState } from 'react';
import FileDropzone from '../../common/FileDropzone';
import { uploadVideo } from '../../../api/videos';
import { useProjectStore } from '../../../store/useProjectStore';

export default function SingleVideoSource() {
  const project = useProjectStore((s) => s.project);
  const setSourceVideo = useProjectStore((s) => s.setSourceVideo);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);

  async function handleFile(file) {
    setError(null);
    setProgress(0);
    try {
      const result = await uploadVideo(file, setProgress);
      setSourceVideo(result);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Source Video</h3>
      <FileDropzone
        accept="video/mp4,video/quicktime,video/x-matroska,video/webm,.mp4,.mov,.mkv,.webm"
        label="Drop a video or click to upload"
        sublabel="MP4, MOV, MKV, WEBM"
        onFile={handleFile}
      />
      {progress !== null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-news-border">
          <div className="h-full bg-news-accent2 transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {project.sourceVideo && (
        <div className="mt-3 rounded-lg border border-news-border bg-black/20 p-3">
          <img
            src={project.sourceVideo.thumbnailUrl}
            alt="thumbnail"
            className="mb-3 w-full rounded-md border border-news-border"
          />
          <dl className="grid grid-cols-2 gap-y-1 text-xs text-slate-400">
            <dt>Duration</dt>
            <dd className="text-right text-slate-200">{project.sourceVideo.metadata.duration.toFixed(1)}s</dd>
            <dt>Resolution</dt>
            <dd className="text-right text-slate-200">
              {project.sourceVideo.metadata.width}×{project.sourceVideo.metadata.height}
            </dd>
            <dt>Frame rate</dt>
            <dd className="text-right text-slate-200">{project.sourceVideo.metadata.fps} fps</dd>
            <dt>File size</dt>
            <dd className="text-right text-slate-200">
              {(project.sourceVideo.metadata.size / (1024 * 1024)).toFixed(1)} MB
            </dd>
          </dl>
        </div>
      )}
    </section>
  );
}
