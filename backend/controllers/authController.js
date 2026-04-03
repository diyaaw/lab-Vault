const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Signup
exports.signup = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Ensure role is valid
        const validRoles = ['patient', 'doctor', 'pathology'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ message: 'Invalid role selected.' });
        }

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ message: 'User already exists' });

        user = new User({ name, email, password, role });
        await user.save();

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'labvault_secret_2024_secure', {
            expiresIn: '30d',
        });

        res.status(201).json({
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                role: user.role,
                patientCustomId: user.patientCustomId 
            },
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Login
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user && (await user.comparePassword(password))) {
            const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'labvault_secret_2024_secure', {
                expiresIn: '30d',
            });

            res.json({
                token,
                user: { 
                    id: user._id, 
                    name: user.name, 
                    email: user.email, 
                    role: user.role,
                    phone: user.phone,
                    age: user.age,
                    gender: user.gender,
                    bloodGroup: user.bloodGroup,
                    address: user.address,
                    patientCustomId: user.patientCustomId,
                    grantedDoctors: user.grantedDoctors,
                    mustChangePassword: user.mustChangePassword 
                },
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get Me
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (error) {
        console.error('getMe error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Change Password
exports.changePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;
        const user = await User.findById(req.user.id);

        if (!user) return res.status(404).json({ message: 'User not found' });

        user.password = newPassword;
        user.mustChangePassword = false;
        await user.save();

        res.json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('changePassword error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
