const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    pathologyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    reportName: {
        type: String,
        required: true,
    },
    testType: {
        type: String,
        required: true,
    },
    fileUrl: {
        type: String,
        required: true,
    },
    uploadDate: {
        type: Date,
        default: Date.now,
    },
    ocrProcessed: {
        type: Boolean,
        default: false,
    },
    extractedData: {
        type: mongoose.Schema.Types.Mixed,
    },
    aiSummary: {
        type: String,
    },
    doctorComment: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);
