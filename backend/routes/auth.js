const express = require('express');
const router = express.Router();
const { signup, login, getMe, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);

module.exports = router;
