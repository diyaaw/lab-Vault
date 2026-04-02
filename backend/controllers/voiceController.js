const { GoogleGenerativeAI } = require("@google/generative-ai");
const Report = require('../models/Report');

/**
 * Main request handler: Uses Gemini 2.0 Flash to Summarize, Translate, 
 * and generate Native Audio in a single call.
 */
exports.handleVoiceRequest = async (req, res) => {
    try {
        const { text, reportId, language = 'English' } = req.body;

        // --- 1. Hardened API Key Check ---
        const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
        if (!apiKey || apiKey === 'your_key_here') {
            return res.status(401).json({
                message: 'Google AI Studio API Key is missing or invalid.',
                tip: 'Please add and save GOOGLE_AI_STUDIO_API_KEY to your .env file and restart the server.'
            });
        }

        let contentToProcess = text;

        // Fetch report context if reportId is provided
        if (!text && reportId) {
            const report = await Report.findById(reportId);
            if (!report) return res.status(404).json({ message: 'Report not found' });
            contentToProcess = report.aiSummary || report.reportName;
        }

        if (!contentToProcess) {
            return res.status(400).json({ message: 'No content provided to process' });
        }

        console.log(`[VOICE] Gemini Native Audio Processing | Lang: ${language} | Target: ${contentToProcess.substring(0, 50)}...`);

        // --- 2. Initialize Gemini (Force v1beta for Native Audio support) ---
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            apiVersion: "v1beta"
        });

        // Prompt Gemini to process and output audio
        const prompt = `
            You are a helpful medical assistant.
            1. Summarize the following pathology report concisely (under 100 words).
            2. Translate that summary into ${language}.
            3. Keep the tone reassuring and professional.
            
            Report Content:
            ${contentToProcess}
        `;

        console.log(`[VOICE] Gemini Native Audio Processing (v1beta) | Lang: ${language}`);

        // --- 3. Request both TEXT and AUDIO (Required by some API keys to avoid 400) ---
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ["TEXT", "AUDIO"],
            }
        });

        const response = result.response;

        // Extract the audio buffer from the multimodal response
        const audioPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith("audio/"));

        if (!audioPart) {
            throw new Error("Gemini returned text but failed to generate audio modality.");
        }

        const audioBuffer = Buffer.from(audioPart.inlineData.data, "base64");
        console.log(`[VOICE] Success: Gemini Native Audio Generated (${audioBuffer.length} bytes)`);

        // --- 4. Return Audio Buffer ---
        res.set({
            'Content-Type': 'audio/wav',
            'X-Voice-Type': 'native',
            'X-Voice-Provider': 'Google Gemini 2.0 (v1beta)'
        });

        return res.send(audioBuffer);

    } catch (error) {
        console.error('[VOICE CONTROLLER CRITICAL ERROR]:', error);

        // Detailed error extraction for Google AI Studio
        let errorMessage = error.message || 'Gemini Voice processing failed';
        let statusCode = 500;

        if (error.status === 400 || (error.message && error.message.includes("400"))) {
            errorMessage = 'Gemini 2.0 Flash request rejected (400). This usually means the modality (AUDIO) is restricted for this API key or the model name is incorrect.';
            statusCode = 400;
        } else if (error.status === 401 || (error.message && error.message.includes("401"))) {
            errorMessage = 'Google AI Studio API Key is invalid or expired.';
            statusCode = 401;
        } else if (error.status === 403 || (error.message && error.message.includes("403"))) {
            errorMessage = 'Access denied (403). Please ensure "Generative Language API" is enabled in Google Cloud Console.';
            statusCode = 403;
        } else if (error.status === 429 || (error.message && error.message.includes("429"))) {
            errorMessage = 'Quota exceeded (429). Please wait a moment or check your AI Studio limits.';
            statusCode = 429;
        }

        res.status(statusCode).json({
            message: errorMessage,
            details: error.message,
            tip: 'If using a free tier key, ensure Gemini 2.0 Flash native audio is supported in your region.'
        });
    }
};
