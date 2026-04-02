const User = require('../models/User');
const sendEmail = require('../services/emailService');

exports.searchPatients = async (req, res) => {
    try {
        const { query } = req.query;
        const pathologyId = req.user.id;
        
        console.log(`[SEARCH] Query: "${query}", AdminId: ${pathologyId}`);

        // Base query: patients only
        let searchQuery = { role: 'patient' };

        // pathologyId logic: must match OR be legacy (no id)
        const pathologyFilter = {
            $or: [
                { pathologyId: pathologyId },
                { pathologyId: { $exists: false } },
                { pathologyId: null }
            ]
        };

        // Combine into $and
        searchQuery.$and = [pathologyFilter];

        if (query) {
            searchQuery.$and.push({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { email: { $regex: query, $options: 'i' } },
                    { phone: { $regex: query, $options: 'i' } },
                    { patientCustomId: { $regex: query, $options: 'i' } }
                ]
            });
        }

        const patients = await User.find(searchQuery)
            .limit(10)
            .select('name email phone age gender patientCustomId createdAt');
        
        console.log(`[SEARCH] Found: ${patients.length} patients`);
        res.json(patients);
    } catch (error) {
        res.status(500).json({ message: 'Error searching patients', error: error.message });
    }
};

exports.registerPatient = async (req, res) => {
    try {
        const { name, email, phone, age, gender } = req.body;
        const pathologyId = req.user.id;

        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ message: 'Name and email are required' });
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Generate temporary password
        const tempPassword = `Temp@${Math.floor(100 + Math.random() * 900)}`;

        const user = await User.create({
            name,
            email,
            phone,
            age,
            gender,
            password: tempPassword,
            role: 'patient',
            pathologyId,
            mustChangePassword: true
        });

        // Send Email
        try {
            await sendEmail({
                email: user.email,
                subject: 'Your LabVault Account',
                message: `Hello ${user.name},\n\nYour account has been created on LabVault.\n\nEmail: ${user.email}\nTemporary Password: ${tempPassword}\n\nPlease log in and change your password.`,
                html: `
                    <h2>Hello ${user.name},</h2>
                    <p>Your account has been created on LabVault.</p>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                    <p>Please log in and change your password.</p>
                `
            });
        } catch (emailErr) {
            console.error('Failed to send credential email:', emailErr);
            // We still return 201 because the user was created
        }

        res.status(201).json({
            message: 'Patient registered successfully. Credentials sent via email.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                patientCustomId: user.patientCustomId,
                tempPassword // Returning for convenience in dev/testing if email fails
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Error registering patient', error: error.message });
    }
};

// Update Patient
exports.updatePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, phone, age, gender } = req.body;
        const pathologyId = req.user.id;

        const patient = await User.findOneAndUpdate(
            { _id: id, role: 'patient', pathologyId },
            { name, phone, age, gender },
            { new: true }
        );

        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        res.json(patient);
    } catch (error) {
        res.status(500).json({ message: 'Error updating patient', error: error.message });
    }
};

// Delete Patient
exports.deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        const pathologyId = req.user.id;

        const patient = await User.findOneAndDelete({ _id: id, role: 'patient', pathologyId });
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        res.json({ message: 'Patient deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting patient', error: error.message });
    }
};
// Grant access to a doctor
exports.grantAccessToDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const patientId = req.user.id;

        if (!doctorId) return res.status(400).json({ message: 'Doctor ID is required' });

        const patient = await User.findById(patientId);
        if (!patient || patient.role !== 'patient') {
            return res.status(404).json({ message: 'Patient not found' });
        }

        if (patient.grantedDoctors.includes(doctorId)) {
            return res.status(400).json({ message: 'Access already granted to this doctor' });
        }

        patient.grantedDoctors.push(doctorId);
        await patient.save();

        res.json({ message: 'Access granted to doctor successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error granting access', error: error.message });
    }
};

// Revoke access from a doctor
exports.revokeAccessFromDoctor = async (req, res) => {
    try {
        const { doctorId } = req.body;
        const patientId = req.user.id;

        const patient = await User.findById(patientId);
        if (!patient) return res.status(404).json({ message: 'Patient not found' });

        patient.grantedDoctors = patient.grantedDoctors.filter(id => id.toString() !== doctorId);
        await patient.save();

        res.json({ message: 'Access revoked from doctor successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error revoking access', error: error.message });
    }
};

// Get granted doctors for a patient
exports.getGrantedDoctors = async (req, res) => {
    try {
        const patientId = req.user.id;
        const patient = await User.findById(patientId).populate('grantedDoctors', 'name email specialization phone');
        
        if (!patient) return res.status(404).json({ message: 'Patient not found' });
        
        res.json(patient.grantedDoctors);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching granted doctors', error: error.message });
    }
};
