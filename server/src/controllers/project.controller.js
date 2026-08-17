const projectService = require('../services/project.service');

async function list(req, res) {
  res.json(await projectService.listProjects());
}

async function get(req, res) {
  try {
    res.json(await projectService.getProject(req.params.id));
  } catch (err) {
    res.status(404).json({ error: 'Project not found' });
  }
}

async function save(req, res) {
  const saved = await projectService.saveProject(req.body);
  res.status(201).json(saved);
}

async function remove(req, res) {
  try {
    await projectService.deleteProject(req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(404).json({ error: 'Project not found' });
  }
}

module.exports = { list, get, save, remove };
