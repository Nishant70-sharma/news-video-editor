const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

function makeStorage(destDir) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    }
  });
}

function extFilter(allowedExt) {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowedExt.includes(ext)) {
      return cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowedExt.join(', ')}`));
    }
    cb(null, true);
  };
}

const uploadVideo = multer({
  storage: makeStorage(config.storage.uploads),
  fileFilter: extFilter(config.allowedVideoExt),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
});

const uploadLogo = multer({
  storage: makeStorage(config.storage.logos),
  fileFilter: extFilter(config.allowedLogoExt),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const uploadImages = multer({
  storage: makeStorage(config.storage.images),
  fileFilter: extFilter(config.allowedImageExt),
  limits: { fileSize: 25 * 1024 * 1024, files: 20 } // 25MB each, up to 20 per request
});

const uploadMusic = multer({
  storage: makeStorage(config.storage.music),
  fileFilter: extFilter(config.allowedAudioExt),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

module.exports = { uploadVideo, uploadLogo, uploadImages, uploadMusic };
