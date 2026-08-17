const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { uploadImages: uploadImagesMw } = require('../middleware/upload.middleware');
const { uploadImages } = require('../controllers/image.controller');

const router = express.Router();

router.post('/upload', uploadImagesMw.array('images', 20), asyncHandler(uploadImages));

module.exports = router;
