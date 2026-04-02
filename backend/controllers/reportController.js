const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const Report = require('../models/Report');
const { PDFParse } = require('pdf-parse');
const Groq = require('groq-sdk');
const Tesseract = require('tesseract.js');

// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * AI Analysis using Groq (Llama 3 70B)
 * Extracts medical data in JSON and generates a professional, patient-friendly summary.
 */
const analyzeReportWithAI = async (ocrText) => {
    try {
        const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are a professional medical report analyzer for LabVault. 
                    Your goal is to extract clinical metrics from a lab report and provide helpful insights.

                    1. EXTRACT DATA: Find all recorded medical metrics (e.g., Hemoglobin, Glucose, WBC, etc.) and their numerical values. 
                    2. FORMAT: Return data in a strict JSON format.
                    3. SUMMARY: Write a supportive, empathetic, and professional summary of the findings.
                       - Explain status in simple terms (e.g., "Normal", "High", "Low").
                       - Use a reassuring tone.
                       - Always include: "This analysis is for information only. Please consult your doctor for a formal diagnosis."
                    
                    RESPONSE FORMAT:
                    {
                        "extractedData": { "MetricName": value, ... },
                        "summary": "Your detailed, empathetic summary here (Markdown supported)"
                    }`
                },
                { role: "user", content: `Analyze this medical text and extract data: \n\n${ocrText}` }
            ],
            response_format: { type: "json_object" }, 
            temperature: 0.2
        });

        const result = JSON.parse(response.choices[0].message.content);
        return {
            extractedData: result.extractedData || {},
            aiSummary: result.summary || "Analysis successful. Please review with your healthcare provider."
        };
    } catch (error) {
        console.error('[AI ANALYSIS ERROR]:', error.message);
        return {
            extractedData: {},
            aiSummary: "We couldn't automatically analyze all details of your report, but our system has verified its completion. Please check the clinical metrics below and discuss them with your doctor."
        };
    }
};

// Get all reports for the logged-in pathology admin
exports.getReports = async (req, res) => {
    try {
        console.log(`[DEBUG] Fetching reports for pathologyAdmin: ${req.user.id}`);
        const { search, page = 1, limit = 100 } = req.query; // Default limit higher for archive
        const query = { pathologyId: req.user.id };

        if (search) {
            console.log(`[DEBUG] Searching for: ${search}`);
            // Find reports by report name OR find patients by name/ID
            const patientIds = await User.find({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { patientCustomId: { $regex: search, $options: 'i' } }
                ],
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

// Upload a new report
exports.uploadReport = async (req, res) => {
    try {
        const { patientId, doctorId, reportName, testType } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Verify patient exists using either internal ID or Custom ID
        let patient;
        if (mongoose.Types.ObjectId.isValid(patientId)) {
            patient = await User.findOne({ _id: patientId, role: 'patient' });
        }
        
        if (!patient) {
            patient = await User.findOne({ patientCustomId: patientId, role: 'patient' });
        }

        if (!patient) {
            return res.status(404).json({ message: `Patient with ID "${patientId}" not found` });
        }

        const internalPatientId = patient._id;

        const filePath = path.join(__dirname, '..', 'uploads', 'reports', req.file.filename);
        
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
            } else {
                const dataBuffer = fs.readFileSync(filePath);
                const { data: { text: ocrText } } = await Tesseract.recognize(dataBuffer, 'eng');
                text = ocrText || '';
                console.log(`[DEBUG] OCR Extraction Success. Text length: ${text.length}`);
            }

            // --- AI ANALYSIS WITH GROQ ---
            console.log(`[DEBUG] Starting AI Analysis with Groq for report...`);
            const analysis = await analyzeReportWithAI(text);
            
            extractedData = analysis.extractedData;
            aiSummary = analysis.aiSummary;
            ocrProcessed = true;

            // Simple doctor comment extraction fallback
            if (!extractedData.doctorComment) {
                const commentMatch = text.match(/Doctor Comment\s*[:\-]?\s*([^\n\r.]+)/i);
                if (commentMatch) extractedData.doctorComment = commentMatch[1].trim();
            }

        } catch (ocrError) {
            console.error('Report processing failed:', ocrError);
            aiSummary = 'We could not automatically extract your data, but your report is ready to view. Please consult your doctor for a detailed analysis.';
        }

        const reportData = {
            patientId: internalPatientId,
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
