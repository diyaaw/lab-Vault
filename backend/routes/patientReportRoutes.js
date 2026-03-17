const express = require('express');
const router = express.Router();
const patientReportController = require('../controllers/patientReportController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// All patient report routes require patient role
router.use(protect);
router.use(roleMiddleware('patient'));

router.get('/my-reports', patientReportController.getMyReports);
router.get('/:reportId', patientReportController.getMyReportById);
router.get('/:reportId/summary', patientReportController.summarizeReport);

module.exports = router;
