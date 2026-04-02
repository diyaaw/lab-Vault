require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGeminiAudio() {
    console.log('--- Gemini Audio Diagnostic ---');
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;

    if (!apiKey || apiKey === 'your_key_here') {
        console.error('ERROR: GOOGLE_AI_STUDIO_API_KEY is missing from .env');
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = "Summarize this: Your hemoglobin is 14.5 g/dL. Output native audio in Hindi.";

        console.log('Requesting Gemini Native Audio...');
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseModalities: ["AUDIO"],
            }
        });

        const audioPart = result.response.candidates[0].content.parts.find(p => p.inlineData);

        if (audioPart) {
            console.log('SUCCESS: Gemini returned native audio buffer!');
            const buffer = Buffer.from(audioPart.inlineData.data, 'base64');
            console.log('Audio Data Length:', buffer.length, 'bytes');
            console.log('MimeType:', audioPart.inlineData.mimeType);
        } else {
            console.warn('WARNING: Gemini returned a response but no audio part was found.');
            console.log('Check if the model supports AUDIO modality.');
        }

    } catch (err) {
        console.error('ERROR: Gemini Audio Diagnostic failed.');
        console.error('Details:', err.message);
    }
}

testGeminiAudio();
