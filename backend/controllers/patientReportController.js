const Report = require('../models/Report');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

// Helper for localized medical explanations (Formal tone, no emojis)
const getLocalizedExplanation = (key, metric, value, lang, status = 'normal') => {
    const defaultLang = 'en';
    const templates = {
        en: {
            hemoglobin: `Hemoglobin: Measured at ${value}. Hemoglobin is the protein in red blood cells responsible for oxygen transport throughout the body. Your current level is ${status === 'normal' ? 'within the standard reference range' : 'outside the recommended clinical range, which may require medical review'}.`,
            wbc: `WBC Count: Measured at ${value}. White Blood Cells are essential components of the immune system. Your current count is ${status === 'normal' ? 'within stable physiological limits' : 'outside the typical reference range and should be discussed with a clinician'}.`,
            rbc: `RBC Count: Measured at ${value}. Red Blood Cells are critical for maintaining systemic oxygenation. Your results are ${status === 'normal' ? 'within normal parameters' : 'outside the standard medical range'}.`,
            platelets: `Platelets: Measured at ${value}. Platelets are necessary for proper blood coagulation and wound healing. Your level is ${status === 'normal' ? 'considered normal' : 'outside the reference range; clinical consultation is advised'}.`,
            hematocrit: `Hematocrit: Measured at ${value}%. This represents the proportion of red blood cells in your total blood volume. Your level is ${status === 'normal' ? 'within the expected medical range' : 'outside standard reference limits'}.`,
            glucose: `Blood Glucose: Measured at ${value}. This indicates the concentration of sugar in the blood, which serves as the primary energy source. Your level is ${status === 'normal' ? 'within the healthy fasting range' : 'outside the recommended glycemic limits'}.`,
            cholesterol: `Cholesterol: Measured at ${value}. This measures the lipid levels in your bloodstream. Your results are ${status === 'normal' ? 'within the optimal clinical range' : 'associated with increased clinical risk; please consult a healthcare professional'}.`,
            default: `${metric}: Measured at ${value}. This value is ${status === 'normal' ? 'within standard medical limits' : 'outside the target reference range. Professional consultation is recommended'}.`,
            intro: `Clinical Summary of Test Results: `,
            recommendation: `\n\nNote: These descriptions are for informational purposes. Please consult with a qualified healthcare professional to discuss these results within the context of your overall health.`,
            no_metrics: `The system has processed your report. While the document is available for review, automated clinical metric extraction did not yield specific values for this summary.`
        },
        hi: {
            hemoglobin: `हीमोग्लोबिन: आपका स्तर ${value} है। हीमोग्लोबिन रक्त में ऑक्सीजन के परिवहन के लिए जिम्मेदार प्रोटीन है। आपका वर्तमान स्तर ${status === 'normal' ? 'मानक संदर्भ सीमा के भीतर' : 'नैदानिक सीमा से बाहर'} है।`,
            cholesterol: `कोलेस्ट्रॉल: आपका स्तर ${value} है। यह आपके रक्त प्रवाह में लिपिड के स्तर को मापता है। आपके परिणाम ${status === 'normal' ? 'इष्टतम नैदानिक सीमा के भीतर' : 'चिकित्सा परामर्श की आवश्यकता'} हैं।`,
            wbc: `WBC काउंट: आपका स्तर ${value} है। श्वेत रक्त कोशिकाएं प्रतिरक्षा प्रणाली के आवश्यक घटक हैं। आपकी वर्तमान संख्या ${status === 'normal' ? 'स्थिर शारीरिक सीमा के भीतर' : 'चिकित्सा समीक्षा की आवश्यकता'} है।`,
            glucose: `ब्लड ग्लूकोज: आपका स्तर ${value} है। यह रक्त में शर्करा की सांद्रता को दर्शाता है। आपका स्तर ${status === 'normal' ? 'स्वस्थ सीमा के भीतर' : 'अनुशंसित सीमा से बाहर'} है।`,
            default: `${metric}: आपका स्तर ${value} है। यह ${status === 'normal' ? 'सामान्य सीमा के भीतर' : 'चिकित्सा परामर्श की आवश्यकता'} है।`,
            intro: `परीक्षण परिणामों का नैदानिक सारांश: `,
            recommendation: `\n\nनोट: ये विवरण केवल सूचना के उद्देश्यों के लिए हैं। कृपया अपने डॉक्टर से परामर्श करें।`,
            no_metrics: `प्रणाली ने आपकी रिपोर्ट संसाधित कर दी है, लेकिन हम स्वचालित रूप से विशिष्ट डेटा नहीं निकाल सके।`
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
                        { name: 'Cholesterol', regex: /Cholesterol[\s\S]{0,30}?(\d+\.?\d*)/i, key: 'cholesterol' }
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
            cholesterol: { min: 125, max: 200 }
        };

        const templates = {
            en: { intro: `Simplified Medical Analysis of `, recommendation: `\n\n💡 **Next Step:** While these notes help explain the terms, please talk to your doctor for a complete medical plan.`, no_metrics: `We recommend checking the original document for full details as we couldn't automatically highlight specific numbers.` },
            hi: { intro: `नमस्ते! आपकी रिपोर्ट का सरल विश्लेषण: `, recommendation: `\n\n💡 **अगला कदम:** कृपया पूर्ण चिकित्सा योजना के लिए अपने डॉक्टर से बात करें।`, no_metrics: `कोई पहचान योग्य नैदानिक मेट्रिक्स नहीं मिला।` }
        };

        const t = templates[lang] || templates.en;
        let summaryText = "";
        let summaryParts = [];

        if (!report.extractedData || Object.keys(report.extractedData || {}).length === 0) {
            summaryText = t.no_metrics;
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
