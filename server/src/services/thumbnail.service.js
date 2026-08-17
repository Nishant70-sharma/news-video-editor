const path = require('path');
const ffmpeg = require('./ffmpegBinary');
const config = require('../config');

/** Generate a single-frame JPEG thumbnail for a video, returning the output filename. */
function generateThumbnail(filePath, videoId, durationSec) {
  const filename = `${videoId}.jpg`;
  const timemark = Math.min(1, Math.max(0, (durationSec || 2) * 0.1));

  return new Promise((resolve, reject) => {
    ffmpeg(filePath)
      .on('end', () => resolve(filename))
      .on('error', reject)
      .screenshots({
        count: 1,
        timemarks: [timemark],
        filename,
        folder: config.storage.thumbnails,
        size: '480x?'
      });
  });
}

module.exports = { generateThumbnail };
