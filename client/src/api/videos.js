import { api } from './client';

export async function uploadVideo(file, onProgress) {
  const form = new FormData();
  form.append('video', file);
  const { data } = await api.post('/videos/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => onProgress?.(Math.round((evt.loaded / evt.total) * 100))
  });
  return data;
}

export async function uploadLogo(file) {
  const form = new FormData();
  form.append('logo', file);
  const { data } = await api.post('/logos/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
