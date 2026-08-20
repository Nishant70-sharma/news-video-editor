const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { uploadMusic: uploadMusicMw } = require('../middleware/upload.middleware');
const { uploadMusic, listPresets, generatePreset } = require('../controllers/music.controller');

const router = express.Router();

router.post('/upload', uploadMusicMw.single('music'), asyncHandler(uploadMusic));
router.get('/presets', asyncHandler(listPresets));
router.post('/generate', asyncHandler(generatePreset));

module.exports = router;
