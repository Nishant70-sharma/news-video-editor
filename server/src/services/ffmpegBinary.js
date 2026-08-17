const ffmpeg = require('fluent-ffmpeg');
const config = require('../config');

if (config.ffmpegPath) ffmpeg.setFfmpegPath(config.ffmpegPath);
if (config.ffprobePath) ffmpeg.setFfprobePath(config.ffprobePath);

module.exports = ffmpeg;
