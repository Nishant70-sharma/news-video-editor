const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { uploadVideo: uploadVideoMw } = require('../middleware/upload.middleware');
const { uploadVideo, getVideoMetadata } = require('../controllers/video.controller');

const router = express.Router();

router.post('/upload', uploadVideoMw.single('video'), asyncHandler(uploadVideo));
router.get('/:filename/metadata', asyncHandler(getVideoMetadata));

module.exports = router;
