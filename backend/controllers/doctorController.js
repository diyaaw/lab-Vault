const User = require('../models/User');
const AccessControl = require('../models/AccessControl');
const Report = require('../models/Report');
const sendEmail = require('../services/emailService');

exports.getDoctors = async (req, res) => {
    try {
        const pathologyId = req.user.id;
        const doctors = await User.find({ role: 'doctor', pathologyId }).select('name email phone specialization createdAt');
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching doctors', error: error.message });
    }
};

exports.createDoctor = async (req, res) => {
    try {
        const { name, email, phone, specialization } = req.body;
        const pathologyId = req.user.id;

        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        const tempPassword = `Doc@${Math.floor(100 + Math.random() * 900)}`;

        const user = await User.create({
            name,
            email,
            phone,
            specialization,
            password: tempPassword,
            role: 'doctor',
            pathologyId,
            mustChangePassword: true
        });

        // Send Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your LabVault Doctor Account',
                message: `Hello Dr. ${user.name},\n\nYour account has been created on LabVault by a pathology lab.\n\nEmail: ${user.email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`,
                html: `
                    <h2>Hello Dr. ${user.name},</h2>
                    <p>Your account has been created on LabVault.</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                    <p>Please log in and change your password.</p>
                `
            });
        } catch (emailErr) {
            console.error('Failed to send credential email:', emailErr);
        }

        res.status(201).json({
            message: 'Doctor created successfully.',
            user: { _id: user._id, name: user.name, email: user.email, tempPassword }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error creating doctor', error: error.message });
    }
};

exports.updateDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, specialization } = req.body;
        const pathologyId = req.user.id;

        const doctor = await User.findOneAndUpdate(
            { _id: id, role: 'doctor', pathologyId },
            { name, phone, specialization },
            { new: true }
        );

        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });
        res.json(doctor);
    } catch (error) {
        res.status(500).json({ message: 'Error updating doctor', error: error.message });
    }
};

exports.deleteDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const pathologyId = req.user.id;

        const doctor = await User.findOneAndDelete({ _id: id, role: 'doctor', pathologyId });
        if (!doctor) return res.status(404).json({ message: 'Doctor not found' });

        res.json({ message: 'Doctor deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting doctor', error: error.message });
    }
};
// Get patients who have granted access to this doctor
exports.getMyPatients = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Find all active access control entries for this doctor
        const accessEntries = await AccessControl.find({
            doctorId,
            accessGranted: true
        }).distinct('patientId');

        const patients = await User.find({
            _id: { $in: accessEntries },
            role: 'patient'
        }).select('name email phone age gender patientCustomId createdAt');

        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching authorized patients', error: error.message });
    }
};

// Get reports for an authorized patient
exports.getPatientReportsForDoctor = async (req, res) => {
    try {
        const { patientId } = req.params;
        const doctorId = req.user.id;

        // 1. Check if global access is granted
        const globalAccess = await AccessControl.findOne({
            patientId,
            doctorId,
            reportId: null,
            accessGranted: true
        });

        let reports;
        if (globalAccess) {
            // If global access, doctor can see all reports for this patient
            reports = await Report.find({ patientId }).sort({ uploadDate: -1 });
        } else {
            // 2. Check for specific report access
            const specificAccessEntries = await AccessControl.find({
                patientId,
                doctorId,
                reportId: { $ne: null },
                accessGranted: true
            }).distinct('reportId');

            if (specificAccessEntries.length === 0) {
                return res.status(403).json({ message: 'Access denied. Patient has not granted you access to any reports.' });
            }

            reports = await Report.find({
                _id: { $in: specificAccessEntries },
                patientId
            }).sort({ uploadDate: -1 });
        }

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patient reports', error: error.message });
    }
};
