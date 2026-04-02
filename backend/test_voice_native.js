const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require("dotenv");
dotenv.config();

async function run() {
    const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
    if (!apiKey) {
        console.error("API Key is missing!");
        return;
    }

    // Try v1beta explicitly
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test 1: gemini-2.0-flash with v1beta and AUDIO modality
    try {
        console.log("--- TEST 1: gemini-2.0-flash (v1beta) with AUDIO ---");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash", apiVersion: "v1beta" });
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "Say 'Test' in English." }] }],
            generationConfig: {
                responseModalities: ["TEXT", "AUDIO"],
            }
        });

        const response = result.response;
        console.log("Success! Modalities returned:", 
            response.candidates?.[0]?.content?.parts?.map(p => p.inlineData ? "audio" : (p.text ? "text" : "other")).join(", ")
        );
    } catch (e) {
        console.error("TEST 1 FAILED:", e.message || e);
        if (e.response) {
            console.error("STATUS:", e.response.status);
            console.error("DATA:", JSON.stringify(e.response.data, null, 2));
        }
    }

    // Test 2: Catch-all list models (v1beta)
    try {
        console.log("\n--- TEST 2: List Models (v1beta) ---");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", apiVersion: "v1beta" });
        const result = await model.generateContent("Hi");
        console.log("gemini-1.5-flash (v1beta) exists and responded.");
    } catch (e) {
        console.error("TEST 2 FAILED:", e.message || e);
    }
}

run();
