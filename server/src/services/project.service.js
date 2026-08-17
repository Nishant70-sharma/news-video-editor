const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function projectPath(id) {
  return path.join(config.storage.projects, `${id}.json`);
}

async function listProjects() {
  const files = await fs.readdir(config.storage.projects);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));
  const projects = await Promise.all(
    jsonFiles.map(async (f) => JSON.parse(await fs.readFile(path.join(config.storage.projects, f), 'utf-8')))
  );
  return projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getProject(id) {
  const raw = await fs.readFile(projectPath(id), 'utf-8');
  return JSON.parse(raw);
}

async function saveProject(project) {
  const now = project.updatedAt || new Date().toISOString();
  const id = project.id || uuidv4();
  const toSave = {
    ...project,
    id,
    createdAt: project.createdAt || now,
    updatedAt: now
  };
  await fs.writeFile(projectPath(id), JSON.stringify(toSave, null, 2), 'utf-8');
  return toSave;
}

async function deleteProject(id) {
  await fs.unlink(projectPath(id));
}

module.exports = { listProjects, getProject, saveProject, deleteProject, projectPath };
