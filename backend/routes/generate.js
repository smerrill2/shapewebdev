const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');

// POST /api/generate
router.post('/', generateController);

module.exports = router; 