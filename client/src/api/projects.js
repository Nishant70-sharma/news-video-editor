import { api } from './client';

export async function listProjects() {
  const { data } = await api.get('/projects');
  return data;
}

export async function getProject(id) {
  const { data } = await api.get(`/projects/${id}`);
  return data;
}

export async function saveProject(project) {
  const { data } = await api.post('/projects', project);
  return data;
}

export async function deleteProject(id) {
  await api.delete(`/projects/${id}`);
}
