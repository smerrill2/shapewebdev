const express = require('express');
const router = express.Router();
const { generateLandingPage } = require('../controllers/generateController');

// Main generation endpoint - support both GET (for SSE) and POST
router.get('/', generateLandingPage);
router.post('/', generateLandingPage);

module.exports = router; 