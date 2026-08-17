import { api } from './client';

export async function uploadMusic(file) {
  const form = new FormData();
  form.append('music', file);
  const { data } = await api.post('/music/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
