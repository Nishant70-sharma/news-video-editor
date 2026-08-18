import { api } from './client';

export async function startExport(projectId) {
  const { data } = await api.post('/export', { projectId });
  return data.jobId;
}

export async function getExportStatus(jobId) {
  const { data } = await api.get(`/export/${jobId}/status`);
  return data;
}

export function downloadExportUrl(jobId) {
  return `/api/export/${jobId}/download`;
}

export async function previewOutro({ outro, logo, aspectRatio, resolution }) {
  const { data } = await api.post('/export/preview-outro', { outro, logo, aspectRatio, resolution });
  return data.url;
}
