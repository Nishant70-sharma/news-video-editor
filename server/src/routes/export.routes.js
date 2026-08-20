const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { createExport, getExportStatus, downloadExport, previewOutro, previewStingerSfx } = require('../controllers/export.controller');

const router = express.Router();

router.post('/preview-outro', asyncHandler(previewOutro));
router.post('/preview-stinger-sfx', asyncHandler(previewStingerSfx));
router.post('/', asyncHandler(createExport));
router.get('/:jobId/status', asyncHandler(getExportStatus));
router.get('/:jobId/download', asyncHandler(downloadExport));

module.exports = router;
