const { allowRequest, analyzeSkinImage, publicError } = require("../lib/skin-analysis");
const { loadStore } = require("../lib/admin-core");
const { profileFromAnalysis, recommendProductsForSkinProfile } = require("../lib/skincare-recommendations");

module.exports = async (request, response) => {
  if (request.method !== "POST") { response.status(405).json({ error: "METHOD_NOT_ALLOWED" }); return; }
  const forwarded = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  const key = forwarded || request.socket?.remoteAddress || "unknown";
  if (!allowRequest(key)) { response.status(429).json({ error: "RATE_LIMITED" }); return; }
  try {
    const result = await analyzeSkinImage(request.body?.image);
    const store = await loadStore();
    result.recommendation = recommendProductsForSkinProfile(profileFromAnalysis(result), store.products);
    response.status(200).json(result);
  } catch (error) {
    const code = publicError(error);
    const status = ["INVALID_IMAGE", "IMAGE_TOO_LARGE"].includes(code)
      ? 400
      : code === "OPENAI_NOT_CONFIGURED"
        ? 503
        : code === "RATE_LIMITED"
          ? 429
          : 502;
    response.status(status).json({ error: code });
  }
};

module.exports.config = {
  api: {
    bodyParser: { sizeLimit: "950kb" }
  }
};
