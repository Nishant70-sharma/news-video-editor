const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { uploadMusic: uploadMusicMw } = require('../middleware/upload.middleware');
const { uploadMusic } = require('../controllers/music.controller');

const router = express.Router();

router.post('/upload', uploadMusicMw.single('music'), asyncHandler(uploadMusic));

module.exports = router;
