const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(protect);

// Pathology routes
router.get('/search', roleMiddleware('pathology'), patientController.searchPatients);
router.post('/register', roleMiddleware('pathology'), patientController.registerPatient);
router.put('/:id', roleMiddleware('pathology'), patientController.updatePatient);
router.delete('/:id', roleMiddleware('pathology'), patientController.deletePatient);

// Patient-specific access control
router.post('/grant-access', roleMiddleware('patient'), patientController.grantAccessToDoctor);
router.post('/revoke-access', roleMiddleware('patient'), patientController.revokeAccessFromDoctor);
router.get('/granted-doctors', roleMiddleware('patient'), patientController.getGrantedDoctors);

module.exports = router;
