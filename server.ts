import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";

// ==========================================
// 10. Environment Variable Boot Validation
// ==========================================
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_API_KEY_SECONDARY: z.string().optional(),
  GEMINI_API_KEY_FALLBACK: z.string().optional(),
  GEMINI_API_KEYS: z.string().optional(),
  VITE_GEMINI_API_KEY: z.string().optional(),
  PORT: z.string().or(z.number()).default(3000),
});

const parsedEnv = serverEnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.warn("⚠️ [SERVER ENV BOOT VALIDATION] Environment format warnings detected:", parsedEnv.error.format());
} else {
  console.log("✅ [SERVER ENV BOOT VALIDATION] Server environment variables parsed successfully.");
}

// Function to assemble key rotation & failover pool
function getKeyRotationPool(customApiKey?: string): string[] {
  const keys: string[] = [];

  // 1. Custom user key sent in payload
  if (customApiKey && typeof customApiKey === "string" && customApiKey.trim()) {
    keys.push(customApiKey.trim());
  }

  // 2. GEMINI_API_KEYS (comma-separated list)
  if (process.env.GEMINI_API_KEYS) {
    const list = process.env.GEMINI_API_KEYS.split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    keys.push(...list);
  }

  // 3. Primary GEMINI_API_KEY
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    keys.push(process.env.GEMINI_API_KEY.trim());
  }

  // 4. Secondary fallback keys
  if (process.env.GEMINI_API_KEY_SECONDARY && process.env.GEMINI_API_KEY_SECONDARY.trim()) {
    keys.push(process.env.GEMINI_API_KEY_SECONDARY.trim());
  }
  if (process.env.GEMINI_API_KEY_FALLBACK && process.env.GEMINI_API_KEY_FALLBACK.trim()) {
    keys.push(process.env.GEMINI_API_KEY_FALLBACK.trim());
  }

  // 5. Client fallback key
  if (process.env.VITE_GEMINI_API_KEY && process.env.VITE_GEMINI_API_KEY.trim()) {
    keys.push(process.env.VITE_GEMINI_API_KEY.trim());
  }

  // Return unique keys
  return Array.from(new Set(keys));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // Log initial key rotation pool availability on boot
  const initialKeys = getKeyRotationPool();
  if (initialKeys.length === 0) {
    console.warn("⚠️ [SERVER ENV WARNING] No Gemini API keys found in server environment variables. Users will need to provide custom keys in Settings or configure .env.");
  } else {
    console.log(`🔑 [SERVER KEY POOL] Booted with ${initialKeys.length} Gemini API key(s) in rotation pool.`);
  }

  // =========================================================================
  // 5. Key Rotation & Multi-Key Failover Engine with Model Cascading
  // =========================================================================
  async function executeWithKeyRotationAndCascade(
    customApiKey: string | undefined,
    promptText: string,
    systemInstruction: string,
    responseSchema?: any
  ): Promise<any> {
    const keyPool = getKeyRotationPool(customApiKey);

    if (keyPool.length === 0) {
      const error: any = new Error("AI features unavailable: Gemini API key missing. Please configure key in Settings or server environment.");
      error.code = "MISSING_KEY";
      error.statusCode = 403;
      throw error;
    }

    const candidateModels = ["gemini-3.6-flash", "gemini-flash-latest"];
    let lastError: any = null;

    for (let keyIdx = 0; keyIdx < keyPool.length; keyIdx++) {
      const activeKey = keyPool[keyIdx];
      const keyLabel = customApiKey && activeKey === customApiKey.trim() ? "Custom User Key" : `Key #${keyIdx + 1}/${keyPool.length}`;

      console.log(`🔑 [KEY ROTATION] Attempting AI generation with ${keyLabel}...`);

      const ai = new GoogleGenAI({
        apiKey: activeKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build-key-rotation",
          },
        },
      });

      let keyFailedDueToQuota = false;

      for (let mIdx = 0; mIdx < candidateModels.length; mIdx++) {
        const currentModel = candidateModels[mIdx];
        let retriesLeft = 1;
        let delay = 1000;

        while (retriesLeft >= 0) {
          try {
            console.log(`   └─ Model: ${currentModel} (key: ${keyLabel}, retries left: ${retriesLeft})`);

            const configOptions: any = { systemInstruction };
            if (responseSchema) {
              configOptions.responseMimeType = "application/json";
              configOptions.responseSchema = responseSchema;
            }

            const response = await ai.models.generateContent({
              model: currentModel,
              contents: promptText,
              config: configOptions,
            });

            console.log(`✅ [KEY ROTATION SUCCESS] Completed successfully using ${keyLabel} on model ${currentModel}`);
            return response;
          } catch (err: any) {
            lastError = err;
            const errString = (String(err) + " " + String(err.message || "")).toLowerCase();

            const isQuotaExceeded =
              errString.includes("quota") ||
              errString.includes("exhausted") ||
              errString.includes("429") ||
              errString.includes("rate limit") ||
              errString.includes("resource_exhausted");

            const isInvalidKey =
              errString.includes("api key not valid") ||
              errString.includes("invalid_api_key") ||
              errString.includes("api_key_invalid") ||
              errString.includes("unauthorized") ||
              errString.includes("401");

            if (isQuotaExceeded || isInvalidKey) {
              console.warn(`⚠️ [KEY FAILOVER TRIGGERED] ${keyLabel} encountered ${isQuotaExceeded ? "Quota Limit / HTTP 429" : "Invalid Key Authentication"}. Rotating to fallback key...`);
              keyFailedDueToQuota = true;
              break; // Break out of retry loop to switch key immediately
            }

            const isTransient =
              err.status === 503 ||
              errString.includes("503") ||
              errString.includes("unavailable") ||
              errString.includes("overloaded") ||
              errString.includes("high demand");

            if (isTransient && retriesLeft > 0) {
              console.warn(`Transient issue on model ${currentModel}. Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              retriesLeft--;
              delay *= 2;
            } else {
              // Try next model on this key if available
              break;
            }
          }
        }

        if (keyFailedDueToQuota) {
          break; // Exit model loop to rotate to next key in pool
        }
      }
    }

    // If all keys in rotation pool were exhausted or failed:
    const finalErrStr = (String(lastError) + " " + String(lastError?.message || "")).toLowerCase();
    let code = "AI_SERVICE_ERROR";
    let message = "AI processing service encountered an error. Please try again later.";
    let statusCode = 500;

    if (finalErrStr.includes("quota") || finalErrStr.includes("exhausted") || finalErrStr.includes("429") || finalErrStr.includes("rate limit")) {
      code = "QUOTA_EXCEEDED";
      message = "AI Assistant Limit Reached: Daily Gemini API quota exhausted across all rotation keys. Please retry in 1 hour or enter a custom key in Settings.";
      statusCode = 429;
    } else if (finalErrStr.includes("invalid") || finalErrStr.includes("unauthorized") || finalErrStr.includes("401")) {
      code = "INVALID_KEY";
      message = "AI Assistant Error: Invalid Gemini API key provided. Please check key in Settings.";
      statusCode = 401;
    }

    const aggregatedErr: any = new Error(message);
    aggregatedErr.code = code;
    aggregatedErr.statusCode = statusCode;
    throw aggregatedErr;
  }

  // 1. Voice Parsing Endpoint
  app.post("/api/voice/parse", async (req, res) => {
    try {
      const { transcript, categories, apiKey: customApiKey } = req.body;
      if (!transcript || !transcript.trim()) {
        return res.status(400).json({ error: "Transcript is empty or missing", code: "EMPTY_TRANSCRIPT" });
      }

      const systemInstruction = `You are a professional retail and grocery inventory management AI specializing in Indian languages, English, and regional dialects (Hinglish, Marathinglish, pure Hindi, pure Marathi, colloquial phrases, and shopkeeper jargon).
Your task is to analyze raw voice recognition transcripts (which may contain typos or run-on words because of speech-to-text limitations) and convert them into a structured database list of products.

Recognize any Indian regional terms and convert them appropriately:
- Prices can be specified in words or numbers (e.g., "pachas" -> 50, "dedh sau" -> 150, "shatt" -> 60, "panchavan" -> 55, "tis" -> 30, "chaalis" -> 40, etc.).
- Regional units: "kilo" -> "KG", "packet" -> "PKT", "dozen" -> "DZN", "nag" or "piece" or "pcs" -> "PCS", "box" -> "BOX", "gram" -> "GM", "litre" -> "LTR", "ml" -> "ML".
- If a user specifies a price, map it correctly to retailPrice. If "wholesale" is mentioned, map to wholesalePrice. If "cost" or "buying" or "kharid" is mentioned, map to buyingPrice.
- If wholesalePrice is NOT mentioned, calculate a reasonable estimate (around 5% to 15% lower than the retailPrice).
- If buyingPrice is NOT mentioned, calculate a reasonable estimate (around 15% to 30% lower than the retailPrice).
- Try to guess the best standardized Category from the list of provided categories, or suggest a standard core category (e.g. Groceries, Vegetables, Fruits, Dairy, Beverages, Snacks, Bakery, Personal Care, Household, Masala, Spices, Dry Fruits, Others).
- For each product, define translations:
  * "en": Natural English/Hinglish phonetic name (e.g., "Almond" / "Badam")
  * "hi": Hindi script (e.g., "बादाम")
  * "mr": Marathi script (e.g., "बदाम")
  * "hi-en": Hinglish/Latin Hindi phonetics (e.g., "Badam")
- Always set name to the best capitalized representation of the item name exactly as spoken by the user phonetically (capitalized properly), NOT its English translation.
- VERY IMPORTANT: DO NOT translate local/Hinglish/Hindi/Marathi names of items to English equivalents. The name MUST match the exact phonetic word spoken by the user capitalized, not its English translation.
  * If the user says "kesar" (or "kesar a great"), the name of the product MUST be "Kesar" (or "Kesar A Great"), NOT "Saffron".
  * If the user says "aloo", set the name of the product to "Aloo", NOT "Potato".
  * If the user says "badam", set the name to "Badam", NOT "Almond".
  * If the user says "kaju", set the name to "Kaju", NOT "Cashew".
  Keep the name exactly as the user pronounced or spoke it phonetically (capitalized properly).
- Detect the overall spoken language or blend of languages used by the user, and assign it to the 'languageDetected' property (examples: Hinglish, Hindi, Marathi, Marathinglish, English).

Examples of speech to handle:
1. "Badam 900 rupees wholesale 850 cost 800" -> Name: "Badam", retailPrice: 900, wholesalePrice: 850, buyingPrice: 800, unit: "KG"
2. "aloo pachas rupaye kilo, amul butter do sau bees packet" -> List of 2 items:
   - Aloo: retailPrice: 50, unit: "KG", category: Vegetables
   - Amul Butter: retailPrice: 220, unit: "PKT", category: Dairy
3. "Haldi sau rupaye packet" -> Name: "Haldi", retailPrice: 100, unit: "PKT", category: Masala / Spices
4. "Kesar A Great retail 1200 wholesale 1100" -> Name: "Kesar A Great", retailPrice: 1200, wholesalePrice: 1100, unit: "KG"

Ensure correct spelling corrections of typical Indian speech recognition typos (e.g. "shakhar" -> "Sugar", "shakar" -> "Sugar", "ghee" -> "Ghee", "tail" or "tel" -> "Oil").`;

      const categoryNames = Array.isArray(categories)
        ? categories.map((c: any) => `${c.name} (id: ${c.id})`).join(", ")
        : "Groceries, Vegetables, Fruits, Dairy, Masala & Spices, Dry Fruits, Beverages, Snacks, Personal Care, Household, Others";

      const promptText = `Parse this voice transcript: "${transcript}"\nAvailable Categories: ${categoryNames}`;

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          languageDetected: {
            type: Type.STRING,
            description: "The detected spoken language or blend of languages (e.g., Hinglish, Hindi, Marathi, Marathinglish, English, Gujrati)",
          },
          products: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "The phonetic, capitalized representation in standard English letters of the exact word(s) spoken by the user",
                },
                translations: {
                  type: Type.OBJECT,
                  properties: {
                    en: { type: Type.STRING, description: "The actual English translation" },
                    hi: { type: Type.STRING, description: "Name in Hindi script" },
                    mr: { type: Type.STRING, description: "Name in Marathi script" },
                    "hi-en": { type: Type.STRING, description: "Name in Hinglish/Latin Hindi phonetics" },
                  },
                  required: ["en", "hi", "mr", "hi-en"],
                },
                retailPrice: { type: Type.NUMBER, description: "Retail/selling price per unit" },
                retailPriceUnit: { type: Type.STRING, description: "Unit for retail price" },
                wholesalePrice: { type: Type.NUMBER, description: "Wholesale price per unit" },
                wholesalePriceUnit: { type: Type.STRING, description: "Unit for wholesale price" },
                buyingPrice: { type: Type.NUMBER, description: "Cost/buying price per unit" },
                buyingPriceUnit: { type: Type.STRING, description: "Unit for buying price" },
                unit: { type: Type.STRING, description: "Main stock unit" },
                categoryName: { type: Type.STRING, description: "Matching category name" },
                categoryId: { type: Type.STRING, description: "Matching category ID" },
              },
              required: ["name", "retailPrice", "unit", "translations", "categoryName"],
            },
          },
        },
        required: ["languageDetected", "products"],
      };

      const response = await executeWithKeyRotationAndCascade(
        customApiKey,
        promptText,
        systemInstruction,
        responseSchema
      );

      const parsedData = JSON.parse(response.text?.trim() || "{}");
      return res.json(parsedData);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const errorCode = error.code || "AI_PARSING_FAILED";
      const userMsg = error.message || "Failed to process speech transcript";

      console.warn(`[AI VOICE API ERROR] Status ${statusCode} (${errorCode}): ${userMsg}`);
      return res.status(statusCode).json({
        error: userMsg,
        code: errorCode,
        message: userMsg,
      });
    }
  });

  // Test Custom Gemini API Key Endpoint
  app.post("/api/voice/test-key", async (req, res) => {
    try {
      const { apiKey } = req.body;
      if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
        return res.status(400).json({ success: false, error: "API key is empty or invalid.", code: "INVALID_KEY" });
      }

      const testKey = apiKey.trim();
      const testAi = new GoogleGenAI({ apiKey: testKey });

      let response: any = null;
      try {
        response = await testAi.models.generateContent({
          model: "gemini-3.6-flash",
          contents: "Respond with OK if active.",
        });
      } catch (e) {
        response = await testAi.models.generateContent({
          model: "gemini-flash-latest",
          contents: "Respond with OK if active.",
        });
      }

      if (response && response.text) {
        return res.json({ success: true, message: "Custom Gemini API Key validated successfully!" });
      }
      return res.status(400).json({ success: false, error: "Received empty response from Gemini model.", code: "EMPTY_RESPONSE" });
    } catch (err: any) {
      const errStr = (err.message || String(err)).toLowerCase();
      let code = "KEY_VALIDATION_FAILED";
      let msg = "API Key Test Unsuccessful: " + (err.message || String(err));

      if (errStr.includes("quota") || errStr.includes("429")) {
        code = "QUOTA_EXCEEDED";
        msg = "API Key Test Warning: Key is valid but currently hit HTTP 429 quota limits.";
      } else if (errStr.includes("invalid") || errStr.includes("401")) {
        code = "INVALID_KEY";
        msg = "API Key Test Failed: Invalid API key or permission denied.";
      }

      return res.status(400).json({ success: false, error: msg, code });
    }
  });

  // App Health Check & Environment Status
  app.get("/api/health", (req, res) => {
    const keysInPool = getKeyRotationPool().length;
    res.json({
      status: "healthy",
      envValidation: {
        valid: parsedEnv.success,
        keysInRotationPool: keysInPool,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Vite Integration Middlewares
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Bind to Port 3000 exclusively
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});

