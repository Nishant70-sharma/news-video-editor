import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProjects, deleteProject } from '../api/projects';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    listProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  async function handleDelete(id) {
    await deleteProject(id);
    refresh();
  }

  return (
    <div className="min-h-screen bg-news-bg px-4 py-6 text-slate-100 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">News Studio</h1>
            <p className="text-sm text-slate-500">Broadcast-style news video editor</p>
          </div>
          <Link
            to="/editor/new"
            className="rounded-md bg-news-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            + New Project
          </Link>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading projects…</p>}
        {!loading && projects.length === 0 && (
          <div className="rounded-lg border border-dashed border-news-border p-10 text-center text-slate-500">
            No projects yet. Create your first news-style video.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border border-news-border bg-news-panel p-4">
              <div className="mb-3 aspect-video overflow-hidden rounded-md bg-black/40">
                {p.sourceVideo?.thumbnailUrl ? (
                  <img src={p.sourceVideo.thumbnailUrl} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-600">No preview</div>
                )}
              </div>
              <h2 className="truncate text-sm font-medium text-slate-100">{p.name}</h2>
              <p className="mb-3 text-xs text-slate-500">{new Date(p.updatedAt).toLocaleString()}</p>
              <div className="flex gap-2">
                <Link
                  to={`/editor/${p.id}`}
                  className="flex-1 rounded-md bg-news-accent2/20 py-1.5 text-center text-xs font-medium text-news-accent2 hover:bg-news-accent2/30"
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="rounded-md border border-news-border px-3 py-1.5 text-xs text-slate-400 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
