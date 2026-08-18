const path = require('path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');
const STORAGE = path.join(ROOT, 'storage');

module.exports = {
  port: process.env.PORT || 5000,
  ffmpegPath: process.env.FFMPEG_PATH || null,
  ffprobePath: process.env.FFPROBE_PATH || null,
  storage: {
    uploads: path.join(STORAGE, 'uploads'),
    thumbnails: path.join(STORAGE, 'thumbnails'),
    logos: path.join(STORAGE, 'logos'),
    images: path.join(STORAGE, 'images'),
    music: path.join(STORAGE, 'music'),
    projects: path.join(STORAGE, 'projects'),
    exports: path.join(STORAGE, 'exports'),
    tmp: path.join(STORAGE, 'tmp')
  },
  fontsDir: path.join(__dirname, 'assets', 'fonts'),
  fonts: {
    display: path.join(__dirname, 'assets', 'fonts', 'Anton-Regular.ttf'),
    displayAlt: path.join(__dirname, 'assets', 'fonts', 'BebasNeue-Regular.ttf'),
    body: 'Arial'
  },
  allowedVideoExt: ['.mp4', '.mov', '.mkv', '.webm'],
  allowedLogoExt: ['.png', '.svg', '.gif'],
  allowedImageExt: ['.jpg', '.jpeg', '.png', '.webp'],
  allowedAudioExt: ['.mp3', '.wav', '.m4a', '.webm', '.ogg', '.mp4']
};
