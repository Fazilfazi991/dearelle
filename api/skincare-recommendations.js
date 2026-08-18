const { loadStore } = require("../lib/admin-core");
const { normalizeSkinProfile, mergeProfileWithUserInput, recommendProductsForSkinProfile } = require("../lib/skincare-recommendations");

module.exports = async (request, response) => {
  if (request.method !== "POST") { response.status(405).json({ error: "METHOD_NOT_ALLOWED" }); return; }
  try {
    const body = request.body || {};
    const profile = body.scanProfile ? mergeProfileWithUserInput(body.scanProfile, body.userProfile) : normalizeSkinProfile(body.profile || body);
    const store = await loadStore();
    response.status(200).json(recommendProductsForSkinProfile(profile, store.products));
  } catch {
    response.status(500).json({ error: "RECOMMENDATION_FAILED" });
  }
};
