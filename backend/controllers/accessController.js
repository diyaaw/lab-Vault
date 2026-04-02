const AccessControl = require('../models/AccessControl');
const Report = require('../models/Report');
const User = require('../models/User');

// Grant access for a specific report or globally across all reports
exports.grantAccess = async (req, res) => {
    try {
        const { doctorId, reportId = null, expiresAt = null } = req.body;
        const patientId = req.user.id;

        if (!doctorId) return res.status(400).json({ message: 'Doctor ID is required' });

        // Update or create access control
        const filter = { patientId, doctorId, reportId };
        const update = { accessGranted: true, accessExpiresAt: expiresAt };
        
        await AccessControl.findOneAndUpdate(filter, update, { upsert: true, new: true });

        // Also update legacy grantedDoctors in User model for backward compatibility if needed
        if (!reportId) {
            await User.findByIdAndUpdate(patientId, { $addToSet: { grantedDoctors: doctorId } });
        }

        res.json({ message: 'Access granted successfully' });
    } catch (error) {
        console.error('[ACCESS] Grant error:', error);
        res.status(500).json({ message: 'Error granting access', error: error.message });
    }
};

// Revoke access
exports.revokeAccess = async (req, res) => {
    try {
        const { doctorId, reportId = null } = req.body;
        const patientId = req.user.id;

        await AccessControl.findOneAndUpdate(
            { patientId, doctorId, reportId },
            { accessGranted: false },
            { new: true }
        );

        // Update legacy grantedDoctors if global
        if (!reportId) {
            await User.findByIdAndUpdate(patientId, { $pull: { grantedDoctors: doctorId } });
        }

        res.json({ message: 'Access revoked successfully' });
    } catch (error) {
        console.error('[ACCESS] Revoke error:', error);
        res.status(500).json({ message: 'Error revoking access', error: error.message });
    }
};

// Get all doctors with access for a patient
exports.getAccessList = async (req, res) => {
    try {
        const patientId = req.user.id;
        const accessList = await AccessControl.find({ patientId, accessGranted: true })
            .populate('doctorId', 'name email specialization phone')
            .populate('reportId', 'reportName uploadDate');

        res.json(accessList);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching access list', error: error.message });
    }
};

// Middleware/Helper to check if a doctor has access during report retrieval
exports.verifyAccess = async (patientId, doctorId, reportId) => {
    // Check if global access is granted for this doctor
    const globalAccess = await AccessControl.findOne({ 
        patientId, 
        doctorId, 
        reportId: null, 
        accessGranted: true 
    });
    
    if (globalAccess) return true;

    // Check specific report access
    const reportAccess = await AccessControl.findOne({ 
        patientId, 
        doctorId, 
        reportId, 
        accessGranted: true 
    });

    return !!reportAccess;
};
