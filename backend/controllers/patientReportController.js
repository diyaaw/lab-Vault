const Report = require('../models/Report');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

// Helper for localized medical explanations ( Layman terms, no emojis)
const getLocalizedExplanation = (key, metric, value, lang, status = 'normal') => {
    const defaultLang = 'en';
    const templates = {
        en: {
            hemoglobin: `Hemoglobin: Measured at ${value}. Hemoglobin helps carry oxygen from your lungs to the rest of your body. Your current level is ${status === 'normal' ? 'within the normal range' : 'outside the typical range, which you should discuss with your doctor'}.`,
            wbc: `WBC Count: Measured at ${value}. White Blood Cells are part of your immune system that helps fight infections. Your current count is ${status === 'normal' ? 'in a healthy range' : 'outside the usual range and may need medical review'}.`,
            rbc: `RBC Count: Measured at ${value}. Red Blood Cells are important for carrying oxygen throughout your body. Your results are ${status === 'normal' ? 'within normal limits' : 'outside the standard range'}.`,
            platelets: `Platelets: Measured at ${value}. Platelets help your blood clot to stop bleeding. Your level is ${status === 'normal' ? 'considered normal' : 'outside the reference range; a doctor can help explain what this means for you'}.`,
            hematocrit: `Hematocrit: Measured at ${value}%. This shows how much of your blood is made up of red blood cells. Your level is ${status === 'normal' ? 'within the healthy range' : 'outside the standard limits'}.`,
            glucose: `Blood Glucose: Measured at ${value}. This measures the sugar in your blood, which is your body's main source of energy. Your level is ${status === 'normal' ? 'within a healthy range' : 'outside the recommended limits'}.`,
            cholesterol: `Cholesterol: Measured at ${value}. This measures fats in your blood. Your results are ${status === 'normal' ? 'within the healthy clinical range' : 'outside the ideal range; please consult your doctor about these results'}.`,
            sodium: `Sodium: Measured at ${value}. Sodium helps balance water and salt in your body and helps your nerves and muscles work. Your level is ${status === 'normal' ? 'within the normal range' : 'outside the standard range'}.`,
            potassium: `Potassium: Measured at ${value}. Potassium is important for your heart and muscle function. Your level is ${status === 'normal' ? 'within the normal range' : 'outside the standard range'}.`,
            chloride: `Chloride: Measured at ${value}. Chloride helps maintain proper fluid balance in your body. Your results are ${status === 'normal' ? 'within normal limits' : 'outside the typical range'}.`,
            calcium: `Calcium: Measured at ${value}. Calcium is vital for your bones, heart, and nerves. Your level is ${status === 'normal' ? 'considered healthy' : 'outside the reference range'}.`,
            creatinine: `Creatinine: Measured at ${value}. This measures how well your kidneys are filtering your blood. Your level is ${status === 'normal' ? 'within the healthy range' : 'outside the typical clinical range'}.`,
            urea: `Blood Urea: Measured at ${value}. This is a waste product filtered by your kidneys. Your level is ${status === 'normal' ? 'within normal limits' : 'outside the standard range'}.`,
            uricacid: `Uric Acid: Measured at ${value}. High levels can sometimes lead to issues like gout. Your current level is ${status === 'normal' ? 'within the healthy range' : 'outside the recommended limits'}.`,
            default: `${metric}: Measured at ${value}. This value is ${status === 'normal' ? 'within standard limits' : 'outside the target range. It is best to discuss this with your doctor'}.`,
            intro: `Medical Summary of Your Results: `,
            recommendation: `\n\nNote: These descriptions are for informational purposes. Please consult with your doctor to discuss these results in the context of your overall health.`,
            no_metrics: `The system has processed your report. While the document is available for review, we couldn't automatically highlight specific numbers for this summary.`
        }
    };

    const t = templates[lang] || templates[defaultLang];
    return t[key] || t.default;
};

// Get all reports for the logged-in patient
exports.getMyReports = async (req, res) => {
    try {
        const reports = await Report.find({
            patientId: req.user.id
        })
            .populate('pathologyId', 'name email')
            .populate('doctorId', 'name email')
            .sort({ uploadDate: -1 });

        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching your reports', error: error.message });
    }
};

// Get a specific report by ID
exports.getMyReportById = async (req, res) => {
    try {
        const report = await Report.findOne({
            _id: req.params.reportId,
            patientId: req.user.id
        })
            .populate('pathologyId', 'name email')
            .populate('doctorId', 'name email');

        if (!report) {
            return res.status(404).json({ message: 'Report not found or access denied' });
        }

        res.json(report);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching report details', error: error.message });
    }
};

// Generate or fetch AI summary for a report (Multilingual)
exports.summarizeReport = async (req, res) => {
    try {
        const lang = req.query.lang || 'en';
        const force = req.query.force === 'true';
        console.log(`[DEBUG] Multilingual summary request (${lang}, force=${force}) for report: ${req.params.reportId}`);
        
        const report = await Report.findOne({
            _id: req.params.reportId,
            patientId: req.user.id
        });

        if (!report) {
            return res.status(404).json({ message: 'Report not found or access denied' });
        }

        // --- PERFORM OCR IF DATA IS MISSING OR FORCED ---
        if (force || !report.ocrProcessed || !report.extractedData || Object.keys(report.extractedData || {}).length === 0) {
            const relativeUrl = report.fileUrl.startsWith('/') ? report.fileUrl.substring(1) : report.fileUrl;
            const filePath = path.join(__dirname, '..', relativeUrl);
            
            console.log(`[DEBUG] Attempting extraction from: ${filePath}`);

            if (fs.existsSync(filePath)) {
                try {
                    const fileExt = path.extname(filePath).toLowerCase();
                    let text = '';
                    const dataBuffer = fs.readFileSync(filePath); // Read file once

                    if (fileExt === '.pdf') {
                        console.log(`[DEBUG] Parsing PDF...`);
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
                        console.log(`[DEBUG] Running OCR on image...`);
                        const result = await Tesseract.recognize(dataBuffer, 'eng');
                        text = result.data.text;
                        console.log(`[DEBUG] OCR Extraction Success. Text length: ${text?.length}`);
                    }
                    
                    console.log(`[DEBUG] Extracted text snippet: ${text?.substring(0, 200)}...`);

                    const metrics = [
                        { name: 'Hemoglobin', regex: /Hemoglobin[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'hemoglobin' },
                        { name: 'WBC', regex: /(?:WBC|White Blood Cell)[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'wbc' },
                        { name: 'RBC', regex: /(?:RBC|Red Blood Cell)[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'rbc' },
                        { name: 'Platelets', regex: /Platelets[\s\S]{0,30}?(\d+)/i, key: 'platelets' },
                        { name: 'Hematocrit', regex: /Hematocrit[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'hematocrit' },
                        { name: 'Glucose', regex: /(?:Glucose|Sugar)[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'glucose' },
                        { name: 'Cholesterol', regex: /Cholesterol[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'cholesterol' },
                        { name: 'Sodium', regex: /Sodium[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'sodium' },
                        { name: 'Potassium', regex: /Potassium[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'potassium' },
                        { name: 'Chloride', regex: /Chloride[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'chloride' },
                        { name: 'Calcium', regex: /Calcium[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'calcium' },
                        { name: 'Creatinine', regex: /Creatinine[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'creatinine' },
                        { name: 'Urea', regex: /(?:Urea)[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'urea' },
                        { name: 'Uric Acid', regex: /Uric Acid[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'uricacid' }
                    ];

                    let extractedData = {};
                    metrics.forEach(m => {
                        const match = text.match(m.regex);
                        if (match) {
                            let val = parseFloat(match[1]);
                            // Normalize units (handle thousands)
                            if (m.key === 'wbc' && val < 50) val *= 1000;
                            if (m.key === 'platelets' && val < 1000) val *= 1000;
                            extractedData[m.name] = val;
                        }
                    });

                    const commentMatch = text.match(/Doctor Comment\s*[:\-]?\s*([^\n\r.]+)/i);
                    if (commentMatch) {
                        report.doctorComment = commentMatch[1].trim();
                    }

                    report.extractedData = extractedData;
                    report.ocrProcessed = true;
                    report.rawText = text; // Store raw text for fallback summary
                } catch (ocrErr) {
                    console.error('[DEBUG] PDFA/OCR extraction failed inner:', ocrErr.message);
                }
            }
        }

        const metricNorms = {
            hemoglobin: { min: 13.5, max: 17.5 },
            wbc: { min: 4000, max: 11000 },
            rbc: { min: 4.5, max: 5.9 },
            platelets: { min: 150000, max: 450000 },
            hematocrit: { min: 40, max: 50 },
            glucose: { min: 70, max: 100 },
            cholesterol: { min: 125, max: 200 },
            sodium: { min: 136, max: 145 },
            potassium: { min: 3.5, max: 5.2 },
            chloride: { min: 96, max: 108 },
            calcium: { min: 8.5, max: 10.5 },
            creatinine: { min: 0.70, max: 1.40 },
            urea: { min: 4, max: 40 },
            uricacid: { min: 2.7, max: 7.0 }
        };

        const templates = {
            en: { intro: `Simplified Medical Analysis of `, recommendation: `\n\nNext Step: While these notes help explain the terms, please talk to your doctor for a complete medical plan.`, no_metrics: `We recommend checking the original document for full details as we couldn't automatically highlight specific numbers.` },
            hi: { intro: `नमस्ते! आपकी रिपोर्ट का सरल विश्लेषण: `, recommendation: `\n\nअगला कदम: कृपया पूर्ण चिकित्सा योजना के लिए अपने डॉक्टर से बात करें।`, no_metrics: `कोई पहचान योग्य नैदानिक मेट्रिक्स नहीं मिला।` }
        };

        const t = templates[lang] || templates.en;
        let summaryText = "";
        let summaryParts = [];

        if (!report.extractedData || Object.keys(report.extractedData || {}).length === 0) {
            // Robust fallback for any report: Use a snippet or meaningful overview
            const textSnippet = report.rawText ? report.rawText.substring(0, 300).replace(/\n/g, ' ') : '';
            summaryText = textSnippet 
                ? `We processed your report: ${textSnippet}... Please review the full document for all clinical details.`
                : t.no_metrics;
        } else {
            Object.entries(report.extractedData).forEach(([name, value]) => {
                const metricKey = name.toLowerCase();
                const norm = metricNorms[metricKey];
                const status = (norm && (value < norm.min || value > norm.max)) ? 'abnormal' : 'normal';
                
                summaryParts.push(getLocalizedExplanation(metricKey, name, value, lang, status));
            });
            
            const intro = lang === 'hi' ? t.intro : `${t.intro}${report.reportName || 'Report'}:\n\n`;
            summaryText = intro + summaryParts.join("\n\n") + t.recommendation;
        }
 
        // Always save if we extracted new data during this call or forced
        const hasExtractedData = Object.keys(report.extractedData || {}).length > 0;

        if (force || hasExtractedData || !report.aiSummary) {
            report.aiSummary = summaryText;
            report.markModified('extractedData');
            await report.save();
        }
 
        res.json({ 
            summary: summaryText, 
            extractedData: report.extractedData 
        });
    } catch (error) {
        console.error('CRITICAL: Error in summarizeReport:', error);
        res.status(500).json({ message: 'Error generating summary', error: error.message });
    }
};
