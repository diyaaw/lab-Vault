const express = require('express');
const router = express.Router();
const voiceController = require('../controllers/voiceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', voiceController.handleVoiceRequest);

module.exports = router;
