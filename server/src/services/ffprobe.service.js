const fs = require('fs');
const ffmpeg = require('./ffmpegBinary');

/** Parse an "num/den" frame-rate string (e.g. "30000/1001") into a rounded fps number. */
function parseFrameRate(rate) {
  if (!rate) return null;
  const [num, den] = rate.split('/').map(Number);
  if (!den) return num;
  return Math.round((num / den) * 100) / 100;
}

function probeVideo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found in uploaded file'));

      const duration = Number(data.format.duration || videoStream.duration || 0);
      const size = fs.statSync(filePath).size;
      const hasAudio = data.streams.some((s) => s.codec_type === 'audio');

      resolve({
        duration,
        width: videoStream.width,
        height: videoStream.height,
        fps: parseFrameRate(videoStream.r_frame_rate),
        size,
        hasAudio
      });
    });
  });
}

/** Lightweight probe used at export time to check audio presence on the resolved main-content file. */
function probeHasAudio(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);
      resolve(data.streams.some((s) => s.codec_type === 'audio'));
    });
  });
}

module.exports = { probeVideo, parseFrameRate, probeHasAudio };
