const path = require('path');

async function uploadImages(req, res) {
  const files = req.files || [];
  if (!files.length) {
    return res.status(400).json({ error: 'No image files uploaded (field name: "images")' });
  }

  const images = files.map((file) => {
    const ext = path.extname(file.originalname).toLowerCase();
    return {
      filename: file.filename,
      kind: ext.replace('.', ''),
      url: `/media/images/${file.filename}`
    };
  });

  res.status(201).json(images);
}

module.exports = { uploadImages };
