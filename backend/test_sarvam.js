require('dotenv').config();
const axios = require('axios');

const SARVAM_API_KEY = process.env.SARVAM_API_KEY;

async function testSarvam() {
    console.log('--- Sarvam AI Bulbul v3 Diagnostic ---');
    if (!SARVAM_API_KEY) {
        console.error('ERROR: SARVAM_API_KEY is missing from .env');
        return;
    }

    try {
        console.log('Testing Sarvam AI Bulbul v3 with "Marathi" text...');
        const response = await axios({
            method: 'post',
            url: 'https://api.sarvam.ai/text-to-speech',
            data: {
                text: "नमस्कार, LabVault मध्ये आपले स्वागत आहे.",
                target_language_code: "mr-IN",
                speaker: "shreya",
                model: "bulbul:v3"
            },
            headers: {
                'api-subscription-key': SARVAM_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.audio) {
            console.log('SUCCESS: Sarvam AI returned audio data!');
            console.log('Base64 sample (first 50 chars):', response.data.audio.substring(0, 50));
        } else {
            console.warn('WARNING: Response received but no audio data found.');
            console.log('Full Response Body:', JSON.stringify(response.data, null, 2));
        }
    } catch (err) {
        console.error('ERROR: Sarvam AI API call failed.');
        if (err.response) {
            console.error('Status:', err.response.status);
            console.error('Details:', JSON.stringify(err.response.data, null, 2));
        } else {
            console.error('Message:', err.message);
        }
    }
}

testSarvam();
