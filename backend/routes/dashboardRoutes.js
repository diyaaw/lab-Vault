const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(protect);
router.use(roleMiddleware('pathology'));

router.get('/analytics', dashboardController.getDashboardAnalytics);

module.exports = router;
