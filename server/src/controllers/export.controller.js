const path = require('path');
const { startExportJob, getJob, runOutroPreview, runStingerSfxPreview } = require('../services/exportJob.service');
const config = require('../config');

async function createExport(req, res) {
  const { projectId } = req.body;
  if (!projectId) return res.status(400).json({ error: 'projectId is required' });
  const jobId = startExportJob(projectId);
  res.status(202).json({ jobId });
}

async function previewOutro(req, res) {
  const { outro, logo, aspectRatio, resolution } = req.body;
  if (!outro) return res.status(400).json({ error: 'outro is required' });
  const result = await runOutroPreview({ outro, logo, aspectRatio, resolution });
  res.json(result);
}

async function previewStingerSfx(req, res) {
  const { soundEffect } = req.body;
  if (!soundEffect || soundEffect === 'none') return res.status(400).json({ error: 'soundEffect is required' });
  const result = await runStingerSfxPreview(soundEffect);
  res.json(result);
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

module.exports = { createExport, getExportStatus, downloadExport, previewOutro, previewStingerSfx };
