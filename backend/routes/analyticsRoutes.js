const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Route: GET /api/pathology/analytics
// Description: Get advanced analytics for pathology
// Access: Private (Pathology)
router.get('/', protect, roleMiddleware('pathology'), analyticsController.getAnalytics);

module.exports = router;
