const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { uploadLogo: uploadLogoMw } = require('../middleware/upload.middleware');
const { uploadLogo } = require('../controllers/logo.controller');

const router = express.Router();

router.post('/upload', uploadLogoMw.single('logo'), asyncHandler(uploadLogo));

module.exports = router;
