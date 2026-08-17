const path = require('path');
const { startExportJob, getJob } = require('../services/exportJob.service');
const config = require('../config');

async function createExport(req, res) {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  const jobId = startExportJob(projectId);
  res.status(202).json({ jobId });
}

async function getExportStatus(req, res) {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Export job not found' });
  res.json(job);
}

async function downloadExport(req, res) {
  const job = getJob(req.params.jobId);
  if (!job || job.status !== 'done') {
    return res.status(404).json({ error: 'Export not ready or not found' });
  }
  res.download(path.join(config.storage.exports, job.outputFilename));
}

module.exports = { createExport, getExportStatus, downloadExport };
