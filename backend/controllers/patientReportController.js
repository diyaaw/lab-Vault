const Report = require('../models/Report');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

// Helper for localized medical explanations ( Layman terms, no emojis)
const getLocalizedExplanation = (key, metric, value, lang, status = 'safe') => {
    const defaultLang = 'en';
    const templates = {
        en: {
            hemoglobin: `Your Hemoglobin is ${value}. Think of hemoglobin as the tiny delivery trucks in your blood that carry oxygen to your whole body. ${status === 'safe' ? "💙 Everything looks great—your levels are exactly where they should be. You're doing okay!" : "It's slightly outside the usual range today, but don't worry—it's just a small point to chat with your doctor about during your next visit."}`,
            wbc: `Your White Blood Cell (WBC) count is ${value}. These are your body's brave little soldiers that fight off infections. ${status === 'safe' ? "💙 Your immune system is nice and strong. You're doing okay!" : "The count is a bit different from the standard today, so it's a good idea to let your doctor take a quick look."}`,
            rbc: `Your Red Blood Cell (RBC) count is ${value}. These cells keep your energy up by moving oxygen around. ${status === 'safe' ? "💙 Everything looks perfectly healthy here. You're doing okay!" : "This is a bit outside the typical range, which is worth a quick mention to your healthcare provider."}`,
            platelets: `Your Platelet count is ${value}. Platelets help your body heal by stopping any bleeding. ${status === 'safe' ? "💙 Your body's healing system is working beautifully. You're doing okay!" : "Your levels are a bit unusual, so your doctor can help explain what that means for you specifically."}`,
            hematocrit: `Your Hematocrit level is ${value}%. This measures how much of your blood is made of those important red cells. ${status === 'safe' ? "💙 You're in a very healthy range! You're doing okay." : "It's slightly off the standard mark, but your doctor can help you understand why."}`,
            glucose: `Your Blood Glucose (sugar) is ${value}. This is the fuel that gives you energy throughout the day. ${status === 'safe' ? "💙 Your energy levels are looking well-balanced! You're doing okay." : "The number is a bit high or low, so it might be worth discussing your diet or energy with your doctor."}`,
            cholesterol: `Your Cholesterol is ${value}. These are the fats in your blood that we keep an eye on for your heart health. ${status === 'safe' ? "💙 Your heart seems to be in great shape! You're doing okay." : "It’s a bit outside the ideal range, but there are lots of simple ways to manage this with your doctor's guidance."}`,
            sodium: `Your Sodium level is ${value}. Sodium helps keep your body's water and salt in perfect balance. ${status === 'safe' ? "💙 Your balance looks excellent! You're doing okay." : "It's a bit different from the usual, so it's something your doctor can help monitor."}`,
            potassium: `Your Potassium is ${value}. KEEPING your heart and muscles working smoothly. ${status === 'safe' ? "💙 Your levels are looking very healthy. You're doing okay!" : "It's a bit outside the typical range, so let's keep an eye on it with your doctor."}`,
            creatinine: `Your Creatinine level is ${value}. This tells us how well your kidneys are doing their important job of filtering your blood. ${status === 'safe' ? "💙 Your kidneys are working wonderfully! You're doing okay." : "The number is a bit outside the typical clinical range, which is a good reason to touch base with your doctor."}`,
            default: `Your ${metric} is ${value}. ${status === 'safe' ? "💙 This is within the healthy range! You're doing okay." : "This is a bit outside the target range, so it's best to have a friendly chat with your doctor about it."}`,
            intro: `Medical Highlights from Your `,
            recommendation: `Always consult with your doctor to discuss these results in the context of your overall clinical history.`,
            no_metrics: `The system has processed your report. While the document is available for review, we couldn't automatically highlight specific numbers for this summary.`
        },
        hi: {
            hemoglobin: `आपका हीमोग्लोबिन ${value} है। हीमोग्लोबिन आपके शरीर में ऑक्सीजन पहुँचाने का काम करता है। ${status === 'safe' ? "💙 सब कुछ बहुत अच्छा है—आप बिल्कुल ठीक हैं!" : "यह सामान्य से थोड़ा अलग है, डरो मत—बस अगली बार अपने डॉक्टर को दिखा लें।"}`,
            default: `आपका ${metric} स्तर ${value} है। ${status === 'safe' ? "💙 यह बिल्कुल सामान्य है! आप बहुत अच्छा कर रहे हैं।" : "यह थोड़ा अलग है, तो डॉक्टर से सलाह लेना बेहतर होगा।"}`
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
        en: { 
            intro: `Hello! I've thoughtfully analyzed your report for `, 
            recommendation: `You're doing a great job by staying on top of your health! These notes are here to guide you, but remember that you're more than just these numbers. For a personalized plan that fits your unique lifestyle, I encourage you to share this summary with your doctor. They'll love seeing how proactive you're being!`, 
            no_metrics: `I've looked through your report, and while I didn't find specific numbers to highlight right now, your proactive approach to health is wonderful. Feel free to check the full document for all the details!` 
        },
        hi: { 
            intro: `नमस्ते! मैंने आपकी इस रिपोर्ट का बड़े ध्यान से विश्लेषण किया है: `, 
            recommendation: `आप अपनी सेहत का ख्याल रख रहे हैं, यह बहुत अच्छी बात है! ये विवरण आपकी समझ के लिए हैं, लेकिन याद रखें कि आपकी सेहत सिर्फ इन आंकड़ों से कहीं ज्यादा है। व्यक्तिगत सलाह के लिए कृपया इसे अपने डॉक्टर के साथ साझा करें। वे आपकी इस जागरूकता की सराहना करेंगे!`, 
            no_metrics: `मैंने आपकी रिपोर्ट देखी है, और हालांकि अभी कोई विशेष आंकड़े नहीं मिले, पर आपकी यह सजगता काबिले तारीफ है। आप पूरी जानकारी के लिए मूल दस्तावेज़ देख सकते हैं।` 
        }
    };

    const t = templates[lang] || templates.en;
    let summaryText = "";
    let summaryParts = [];

    if (!report.extractedData || Object.keys(report.extractedData || {}).length === 0) {
        // Robust fallback for any report: Use a snippet or meaningful overview
        const textSnippet = report.rawText ? report.rawText.substring(0, 300).replace(/\n/g, ' ') : '';
        summaryText = textSnippet 
            ? `Report Overview: We processed your report: ${textSnippet}... Please review the full document for all clinical details.`
            : t.no_metrics;
    } else {
        Object.entries(report.extractedData).forEach(([name, value]) => {
            const metricKey = name.toLowerCase();
            const norm = metricNorms[metricKey];
            const status = (norm && (value < norm.min || value > norm.max)) ? 'abnormal' : 'normal';
            
            summaryParts.push(`${getLocalizedExplanation(metricKey, name, value, lang, status)}`);
        });
        
        const intro = lang === 'hi' ? `${t.intro}\n\n` : `${t.intro}${report.reportName || 'Clinical Analysis'}\n\n`;
        summaryText = intro + summaryParts.join("\n\n") + `\n\nRecommendation: ${t.recommendation}`;
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
