const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/reports', require('./routes/reportRoutes'));
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/pathology/analytics', require('./routes/analyticsRoutes'));
app.use('/api/patient/reports', require('./routes/patientReportRoutes'));
app.use('/api/doctor', require('./routes/doctorRoutes')); // Management routes

// Serve uploads folder
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
