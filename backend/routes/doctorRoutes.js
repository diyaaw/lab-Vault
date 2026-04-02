const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(protect);

// Pathology routes for doctor management
router.get('/', roleMiddleware('pathology'), doctorController.getDoctors);
router.post('/', roleMiddleware('pathology'), doctorController.createDoctor);
router.put('/:id', roleMiddleware('pathology'), doctorController.updateDoctor);
router.delete('/:id', roleMiddleware('pathology'), doctorController.deleteDoctor);

// Doctor-specific routes
router.get('/my-patients', roleMiddleware('doctor'), doctorController.getMyPatients);
router.get('/patient-reports/:patientId', roleMiddleware('doctor'), doctorController.getPatientReportsForDoctor);

module.exports = router;
