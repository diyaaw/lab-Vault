const mongoose = require('mongoose');

const accessControlSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reportId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Report',
        // Optional: If null, grants access to ALL reports for this patient
        default: null,
    },
    accessGranted: {
        type: Boolean,
        default: true,
    },
    accessExpiresAt: {
        type: Date,
        // Optional: Token-like expiry for temporary access
    },
}, { timestamps: true });

// Ensure unique access mapping per doctor/patient/report combination
accessControlSchema.index({ patientId: 1, doctorId: 1, reportId: 1 }, { unique: true });

module.exports = mongoose.model('AccessControl', accessControlSchema);
