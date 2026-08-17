const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { createExport, getExportStatus, downloadExport } = require('../controllers/export.controller');

const router = express.Router();

router.post('/', asyncHandler(createExport));
router.get('/:jobId/status', asyncHandler(getExportStatus));
router.get('/:jobId/download', asyncHandler(downloadExport));

module.exports = router;
