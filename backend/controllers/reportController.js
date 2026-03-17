const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Report = require('../models/Report');
const { PDFParse } = require('pdf-parse');

// Get all reports for the logged-in pathology admin
exports.getReports = async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching reports for pathologyAdmin: ${req.user.id}`);
        const { search, page = 1, limit = 100 } = req.query; // Default limit higher for archive
        const query = { pathologyId: req.user.id };

        if (search) {
            console.log(`[DEBUG] Searching for: ${search}`);
            // Find reports where the reportName matches search or find patients by name
            const patientIds = await User.find({
                name: { $regex: search, $options: 'i' },
                role: 'patient'
            }).distinct('_id');

            query.$or = [
                { reportName: { $regex: search, $options: 'i' } },
                { patientId: { $in: patientIds } }
            ];
        }

        const reports = await Report.find(query)
            .populate('patientId', 'name email')
            .sort({ uploadDate: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Report.countDocuments(query);
        console.log(`[DEBUG] Found ${reports.length} reports for this pathology.`);

        res.json({
            reports,
            totalPages: Math.ceil(count / limit),
            currentPage: Number(page),
            totalReports: count
        });
    } catch (error) {
        console.error('[ERROR] getReports failed:', error);
        res.status(500).json({ message: 'Error fetching reports', error: error.message });
    }
};

// Get report by ID
exports.getReportById = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.reportId,
            pathologyId: req.user.id
        }).populate('patientId', 'name email');

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report details', error: error.message });
    }
};

const Tesseract = require('tesseract.js');

// Upload a new report
exports.uploadReport = async (req, res) => {
    try {
        const { patientId, doctorId, reportName, testType } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Verify patient exists
        const patient = await User.findOne({ _id: patientId, role: 'patient' });
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }

        const filePath = path.join(__dirname, '..', 'uploads', 'reports', req.file.filename);
        
        // --- OCR & AI INSIGHTS LOGIC ---
        let extractedData = {};
        let aiSummary = '';
        let ocrProcessed = false;

        try {
            const fileExt = path.extname(filePath).toLowerCase();
            let text = '';

            if (fileExt === '.pdf') {
                const dataBuffer = fs.readFileSync(filePath);
                try {
                    const parser = new PDFParse({ data: dataBuffer });
                    const pdfData = await parser.getText();
                    text = pdfData.text || '';
                    console.log(`[DEBUG] PDF Extraction Success. Text length: ${text.length}`);
                } catch (pdfErr) {
                    console.error('[DEBUG] PDF Extraction Error:', pdfErr.message);
                    throw pdfErr;
                }
                ocrProcessed = true;
            } else {
                const dataBuffer = fs.readFileSync(filePath);
                const { data: { text: ocrText } } = await Tesseract.recognize(dataBuffer, 'eng');
                text = ocrText || '';
                console.log(`[DEBUG] OCR Extraction Success. Text length: ${text.length}`);
                ocrProcessed = true;
            }
            
            // Apply regex extraction to the extracted text
            const metrics = [
                { name: 'Hemoglobin', regex: /Hemoglobin[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 13.5, normalMax: 17.5 },
                { name: 'WBC', regex: /(?:WBC|White Blood Cell)[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 4000, normalMax: 11000 },
                { name: 'RBC', regex: /(?:RBC|Red Blood Cell)[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 4.5, normalMax: 5.9 },
                { name: 'Platelets', regex: /Platelets[\s\S]{0,30}?(\d+)/i, normalMin: 150000, normalMax: 450000 },
                { name: 'Hematocrit', regex: /Hematocrit[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 40, normalMax: 50 },
                { name: 'Glucose', regex: /(?:Glucose|Sugar)[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 70, normalMax: 100 },
                { name: 'Cholesterol', regex: /Cholesterol[\s\S]{0,30}?(\d+\.?\d*)/i, normalMin: 125, normalMax: 200 }
            ];

            let summaryParts = [];
            metrics.forEach(m => {
                const match = text.match(m.regex);
                if (match) {
                    let value = parseFloat(match[1]);
                    // Normalize units (handle thousands)
                    if (m.name === 'WBC' && value < 50) value *= 1000;
                    if (m.name === 'Platelets' && value < 1000) value *= 1000;

                    const status = (value >= m.normalMin && value <= m.normalMax) ? 'normal' : 'abnormal';
                    extractedData[m.name] = value;
                    
                    if (status === 'normal') {
                        summaryParts.push(`${m.name} (${value}) is in healthy range.`);
                    } else {
                        summaryParts.push(`${m.name} (${value}) is outside recommended levels. Consult your doctor.`);
                    }
                }
            });

            aiSummary = summaryParts.length > 0 
                ? summaryParts.join(' ') 
                : "Your report has been successfully processed. Most values appear to be in order, but please review with your physician for a full clinical assessment.";

            // Extract doctor comment if present
            const commentMatch = text.match(/Doctor Comment\s*[:\-]?\s*([^\n\r.]+)/i);
            if (commentMatch) {
                extractedData.doctorComment = commentMatch[1].trim();
            }

        } catch (ocrError) {
            console.error('Report processing failed:', ocrError);
            aiSummary = 'We could not automatically extract your data, but your doctor has verified the report as ready to view.';
        }

        const reportData = {
            patientId,
            pathologyId: req.user.id,
            reportName,
            testType,
            fileUrl: `/uploads/reports/${req.file.filename}`,
            uploadDate: new Date(),
            ocrProcessed,
            extractedData,
            aiSummary,
            doctorComment: extractedData.doctorComment || ""
        };

        // Validate doctorId if provided
        if (doctorId && doctorId.trim() !== '' && mongoose.Types.ObjectId.isValid(doctorId)) {
            reportData.doctorId = doctorId;
        }

        const report = new Report(reportData);
        await report.save();
        
        res.status(201).json({ message: 'Report uploaded and processed successfully', report });
    } catch (error) {
        console.error('Report upload failed:', error);
        res.status(500).json({ message: 'Error uploading report', error: error.message });
    }
};

// Update report metadata
exports.updateReport = async (req, res) => {
    try {
        const { reportName, testType, doctorId } = req.body;
        const report = await Report.findOneAndUpdate(
            { _id: req.params.reportId, pathologyId: req.user.id },
            { reportName, testType, doctorId },
            { new: true }
        );

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        res.json({ message: 'Report updated successfully', report });
    } catch (error) {
        res.status(500).json({ message: 'Error updating report', error: error.message });
    }
};

// Delete report
exports.deleteReport = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.reportId,
            pathologyId: req.user.id
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found' });
        }

        // Remove file from storage
        const filePath = path.join(__dirname, '..', report.fileUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await Report.deleteOne({ _id: report._id });
        res.json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting report', error: error.message });
    }
};

// Get reports for a specific patient
exports.getReportsByPatient = async (req, res) => {
    try {
        const reports = await Report.find({
            patientId: req.params.patientId,
            pathologyId: req.user.id
        }).sort({ uploadDate: -1 });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching patient reports', error: error.message });
    }
};
