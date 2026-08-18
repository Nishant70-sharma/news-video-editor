import { api } from './client';

export async function uploadMusic(file, filename) {
  const form = new FormData();
  // Explicit filename matters for recorded Blobs (no inherent name/extension) — the backend
  // validates upload type by file extension, so a Blob sent without one would be rejected.
  if (filename) form.append('music', file, filename);
  else form.append('music', file);
  const { data } = await api.post('/music/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
