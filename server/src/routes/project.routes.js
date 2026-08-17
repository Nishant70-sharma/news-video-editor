const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { list, get, save, remove } = require('../controllers/project.controller');

const router = express.Router();

router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(get));
router.post('/', asyncHandler(save));
router.delete('/:id', asyncHandler(remove));

module.exports = router;
