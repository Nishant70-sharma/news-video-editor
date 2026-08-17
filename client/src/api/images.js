import { api } from './client';

export async function uploadImages(files) {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  const { data } = await api.post('/images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}
