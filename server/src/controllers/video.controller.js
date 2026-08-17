const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { probeVideo } = require('../services/ffprobe.service');
const { generateThumbnail } = require('../services/thumbnail.service');
const config = require('../config');

async function uploadVideo(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded (field name: "video")' });
  }

  const id = uuidv4();
  const metadata = await probeVideo(req.file.path);
  const thumbnailFilename = await generateThumbnail(req.file.path, id, metadata.duration);

  res.status(201).json({
    id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    url: `/media/uploads/${req.file.filename}`,
    thumbnailUrl: `/media/thumbnails/${thumbnailFilename}`,
    metadata
  });
}

async function getVideoMetadata(req, res) {
  const filename = req.params.filename;
  const filePath = path.join(config.storage.uploads, filename);
  const metadata = await probeVideo(filePath);
  res.json({ filename, metadata });
}

module.exports = { uploadVideo, getVideoMetadata };
