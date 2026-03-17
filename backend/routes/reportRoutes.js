const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const upload = require('../middleware/upload');

// All report routes require pathology role
router.use(protect);
router.use(roleMiddleware('pathology'));

router.post('/upload', upload.single('report'), reportController.uploadReport);
router.get('/', reportController.getReports);
router.get('/:reportId', reportController.getReportById);
router.put('/:reportId', reportController.updateReport);
router.delete('/:reportId', reportController.deleteReport);
router.get('/patient/:patientId', reportController.getReportsByPatient);

module.exports = router;
