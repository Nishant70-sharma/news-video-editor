const path = require('path');

async function uploadLogo(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No logo file uploaded (field name: "logo")' });
  }
  const ext = path.extname(req.file.originalname).toLowerCase();
  res.status(201).json({
    filename: req.file.filename,
    kind: ext.replace('.', ''),
    url: `/media/logos/${req.file.filename}`
  });
}

module.exports = { uploadLogo };
