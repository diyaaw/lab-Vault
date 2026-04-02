const express = require('express');
const router = express.Router();
const accessController = require('../controllers/accessController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(protect);

// Patient routes for access control
router.post('/grant', roleMiddleware('patient'), accessController.grantAccess);
router.post('/revoke', roleMiddleware('patient'), accessController.revokeAccess);
router.get('/list', roleMiddleware('patient'), accessController.getAccessList);

module.exports = router;
