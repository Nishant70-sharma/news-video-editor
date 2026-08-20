const path = require('path');
const { generateBackgroundMusic, PRESETS } = require('../services/backgroundMusic.service');

async function uploadMusic(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file uploaded (field name: "music")' });
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  res.status(201).json({
    filename: req.file.filename,
    kind: ext.replace('.', ''),
    url: `/media/music/${req.file.filename}`
  });
}

async function listPresets(req, res) {
  res.json(Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label })));
}

async function generatePreset(req, res) {
  const { style } = req.body;
  if (!style) return res.status(400).json({ error: 'style is required' });
  const result = await generateBackgroundMusic(style);
  res.status(201).json(result);
}

module.exports = { uploadMusic, listPresets, generatePreset };
