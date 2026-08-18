const OpenAI = require("openai");
const fs = require("fs");
const path = require("path");

function loadLocalEnvironment() {
  if (process.env.OPENAI_API_KEY) return;
  try {
    const envPath = path.resolve(__dirname, "..", ".env");
    const value = fs.readFileSync(envPath, "utf8").match(/^OPENAI_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
    if (value) process.env.OPENAI_API_KEY = value;
  } catch {
    // Hosted environments provide OPENAI_API_KEY directly; local .env is optional.
  }
}

loadLocalEnvironment();

const MAX_IMAGE_BYTES = 650 * 1024;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const attempts = new Map();

const metricSchema = {
  type: "object",
  additionalProperties: false,
  required: ["label", "status", "confidence", "explanation"],
  properties: {
    label: { type: "string", maxLength: 48 },
    status: { type: "string", maxLength: 64 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    explanation: { type: "string", maxLength: 220 }
  }
};

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["imageQuality", "summary", "metrics", "skinProfile", "primaryNeeds", "secondaryNeeds", "needs", "disclaimer"],
  properties: {
    imageQuality: {
      type: "object",
      additionalProperties: false,
      required: ["usable", "confidence", "issues"],
      properties: {
        usable: { type: "boolean" },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        issues: { type: "array", items: { type: "string", maxLength: 64 }, maxItems: 5 }
      }
    },
    summary: { type: "string", maxLength: 280 },
    metrics: {
      type: "object",
      additionalProperties: false,
      required: ["hydrationAppearance", "oilBalanceAppearance", "sensitivityAppearance", "textureAppearance", "glowAppearance", "poreAppearance"],
      properties: {
        hydrationAppearance: metricSchema,
        oilBalanceAppearance: metricSchema,
        sensitivityAppearance: metricSchema,
        textureAppearance: metricSchema,
        glowAppearance: metricSchema,
        poreAppearance: metricSchema
      }
    },
    skinProfile: {
      type: "object",
      additionalProperties: false,
      required: ["hydration", "oilBalance", "sensitivityAppearance", "texture", "glow", "poreAppearance"],
      properties: {
        hydration: { type: "string", enum: ["low", "moderate", "good"] },
        oilBalance: { type: "string", enum: ["low", "balanced", "high"] },
        sensitivityAppearance: { type: "string", enum: ["low", "moderate", "high"] },
        texture: { type: "string", enum: ["low", "moderate", "high"] },
        glow: { type: "string", enum: ["low", "moderate", "good"] },
        poreAppearance: { type: "string", enum: ["low", "moderate", "high"] }
      }
    },
    primaryNeeds: { type: "array", items: { type: "string", enum: ["gentle_cleansing", "light_hydration", "oil_balance", "soothing", "brightening_support", "barrier_support", "texture_support", "daily_spf"] }, maxItems: 4 },
    secondaryNeeds: { type: "array", items: { type: "string", enum: ["gentle_cleansing", "light_hydration", "oil_balance", "soothing", "brightening_support", "barrier_support", "texture_support", "daily_spf"] }, maxItems: 3 },
    needs: { type: "array", items: { type: "string", enum: ["gentle_cleansing", "light_hydration", "oil_balance", "soothing", "brightening_support", "barrier_support", "texture_support", "daily_spf"] }, maxItems: 5 },
    disclaimer: { type: "string", maxLength: 160 }
  }
};

function allowRequest(key) {
  const now = Date.now();
  const recent = (attempts.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) return false;
  recent.push(now);
  attempts.set(key, recent);
  return true;
}

function validateImageData(imageData) {
  if (typeof imageData !== "string") throw new Error("INVALID_IMAGE");
  const match = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/i);
  if (!match) throw new Error("INVALID_IMAGE");
  if (Buffer.byteLength(match[2], "base64") > MAX_IMAGE_BYTES) throw new Error("IMAGE_TOO_LARGE");
  return { mimeType: match[1].toLowerCase(), dataUrl: imageData };
}

async function analyzeSkinImage(imageData) {
  const image = validateImageData(imageData);
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 18000, maxRetries: 0 });
  const response = await client.responses.create({
    model: "gpt-4o-mini",
    store: false,
    max_output_tokens: 900,
    input: [{
      role: "developer",
      content: [{ type: "input_text", text: "You provide conservative cosmetic visual guidance for a skincare ecommerce experience. Analyze only visible cosmetic characteristics in the supplied face photo. Do not identify the person or infer race, ethnicity, nationality, age, health, or any sensitive attribute. Never diagnose disease, acne disorders, eczema, rosacea, infections, cancer, lesions, or medical conditions. Do not prescribe medication or medical treatment. Lighting, makeup, shadows, and image quality can distort appearance. Set imageQuality.usable to false only when no face is visible, the image is severely blurred, severely under/over-exposed, or the face is substantially blocked. Do not reject an otherwise visible face because lighting is imperfect, skin texture is subtle, makeup is minimal, or camera quality is ordinary. When usable, keep explanations modest and use lower confidence where appropriate. When unusable, list concise issues, keep every metric label as 'Insufficient visual confidence', use confidence 0, and return no needs. Describe apparent hydration, oil balance, visible redness/sensitivity appearance, texture, glow, and pore appearance as cosmetic observations only. These are not measurements. Set normalized skinProfile and need arrays only from the allowed schema values. Never name, select, compare, or recommend products. Return only the requested JSON." }]
    }, {
      role: "user",
      content: [
        { type: "input_text", text: "Assess this image according to the schema." },
        { type: "input_image", image_url: image.dataUrl, detail: "low" }
      ]
    }],
    text: { format: { type: "json_schema", name: "cosmetic_skin_preview", strict: true, schema: responseSchema } }
  });
  let parsed;
  try { parsed = JSON.parse(response.output_text); } catch { throw new Error("INVALID_MODEL_RESPONSE"); }
  return parsed;
}

function publicError(error) {
  const code = error?.message || "ANALYSIS_FAILED";
  if (["INVALID_IMAGE", "IMAGE_TOO_LARGE", "OPENAI_NOT_CONFIGURED", "INVALID_MODEL_RESPONSE"].includes(code)) return code;
  if (error?.status === 429) return "RATE_LIMITED";
  if (error?.name === "APIConnectionTimeoutError" || error?.code === "ETIMEDOUT") return "TIMEOUT";
  return "ANALYSIS_FAILED";
}

module.exports = { allowRequest, analyzeSkinImage, publicError, MAX_IMAGE_BYTES };
