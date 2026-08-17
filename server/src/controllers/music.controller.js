const path = require('path');

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

module.exports = { uploadMusic };
