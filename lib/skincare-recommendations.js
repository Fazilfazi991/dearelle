const SKINCARE_CATEGORIES = ["cleanser", "toner", "serum", "treatment", "moisturizer", "sunscreen", "face_oil", "mask", "add_on"];
const SKIN_TYPES = ["dry", "oily", "combination", "balanced", "sensitive"];
const SKIN_NEEDS = ["gentle_cleansing", "light_hydration", "oil_balance", "soothing", "brightening_support", "barrier_support", "texture_support", "daily_spf"];
const CUSTOMER_REASON = {
  gentle_cleansing: "A gentle cleansing step for your everyday routine",
  light_hydration: "Chosen to support lightweight hydration without unnecessary heaviness",
  oil_balance: "Chosen to support a balanced-feeling finish",
  soothing: "Chosen for a more comforting, soothing routine",
  brightening_support: "Chosen to support glow and even-looking tone",
  barrier_support: "Helps support the skin barrier",
  texture_support: "Chosen to support smoother-looking texture",
  daily_spf: "Provides daily SPF protection"
};

function unique(values, allowed) {
  return [...new Set((Array.isArray(values) ? values : []).filter((value) => allowed.includes(value)))];
}

function normalizeSkinProfile(input = {}) {
  const profile = input.skinProfile || input;
  const needs = unique(profile.needs || input.needs || [], SKIN_NEEDS);
  return {
    skinType: SKIN_TYPES.includes(profile.skinType) ? profile.skinType : undefined,
    hydration: ["low", "moderate", "good"].includes(profile.hydration) ? profile.hydration : "moderate",
    oilBalance: ["low", "balanced", "high"].includes(profile.oilBalance) ? profile.oilBalance : "balanced",
    sensitivityAppearance: ["low", "moderate", "high"].includes(profile.sensitivityAppearance) ? profile.sensitivityAppearance : "low",
    texture: ["low", "moderate", "high"].includes(profile.texture) ? profile.texture : "low",
    glow: ["low", "moderate", "good"].includes(profile.glow) ? profile.glow : "moderate",
    poreAppearance: ["low", "moderate", "high"].includes(profile.poreAppearance) ? profile.poreAppearance : "low",
    needs,
    primaryNeeds: unique(profile.primaryNeeds || input.primaryNeeds || needs, SKIN_NEEDS),
    secondaryNeeds: unique(profile.secondaryNeeds || input.secondaryNeeds || [], SKIN_NEEDS),
    source: ["scan", "manual", "hybrid"].includes(profile.source) ? profile.source : "manual"
  };
}

function profileFromAnalysis(analysis) {
  const profile = normalizeSkinProfile({
    ...(analysis.skinProfile || {}),
    needs: analysis.needs || [],
    primaryNeeds: analysis.primaryNeeds || analysis.needs || [],
    secondaryNeeds: analysis.secondaryNeeds || [],
    source: "scan"
  });
  profile.uncertainMetrics = Object.entries(analysis.metrics || {}).filter(([, metric]) => Number(metric?.confidence) < 0.55).map(([key]) => key);
  return profile;
}

function mergeProfileWithUserInput(scanInput, userInput = {}) {
  const scan = normalizeSkinProfile(scanInput);
  const user = userInput.skinProfile || userInput;
  return normalizeSkinProfile({ ...scan, ...user, needs: Array.isArray(user.needs) ? user.needs : scan.needs, primaryNeeds: Array.isArray(user.primaryNeeds) ? user.primaryNeeds : scan.primaryNeeds, secondaryNeeds: Array.isArray(user.secondaryNeeds) ? user.secondaryNeeds : scan.secondaryNeeds, source: "hybrid" });
}

function skincareMetadata(product) {
  return product?.vertical === "skincare" && product?.skincare ? product.skincare : null;
}

function validateSkincareProduct(product) {
  const metadata = skincareMetadata(product);
  const external = product?.commerceMode === "external";
  if (!metadata) return { eligible: false, reason: "NOT_SKINCARE" };
  if (!SKINCARE_CATEGORIES.includes(metadata.category)) return { eligible: false, reason: "MISSING_CATEGORY" };
  if ((!Array.isArray(metadata.concerns) || !metadata.concerns.length) && (!Array.isArray(metadata.benefits) || !metadata.benefits.length)) return { eligible: false, reason: "MISSING_TARGETING" };
  if (!external && (!Array.isArray(product.images) || !product.images.some((image) => typeof image === "string" && image.trim()))) return { eligible: false, reason: "MISSING_IMAGE" };
  if (!external && (!Number.isFinite(Number(product.price)) || Number(product.price) <= 0)) return { eligible: false, reason: "INVALID_PRICE" };
  if (external && (!product.officialProductUrl || product.imageStatus !== "placeholder_only" || product.verificationStatus !== "verified")) return { eligible: false, reason: "EXTERNAL_REVIEW_REQUIRED" };
  if (product.status !== "Active" || metadata.active === false) return { eligible: false, reason: "INACTIVE" };
  if ((!external && Number(product.stock) <= 0) || metadata.inStock === false) return { eligible: false, reason: "OUT_OF_STOCK" };
  return { eligible: true, metadata };
}

function routineSlots(profile) {
  const needs = new Set(profile.needs);
  const slots = [
    { key: "cleanser", category: "cleanser", time: ["am", "pm"], optional: false },
    { key: "moisturizer", category: "moisturizer", time: ["am", "pm"], optional: false },
    { key: "sunscreen", category: "sunscreen", time: ["am"], optional: false }
  ];
  if (["light_hydration", "oil_balance", "brightening_support", "barrier_support", "texture_support", "soothing"].some((need) => needs.has(need))) {
    slots.splice(1, 0, { key: "serum", category: "serum", time: ["am", "pm"], optional: false });
  }
  if (needs.has("texture_support")) slots.push({ key: "treatment", category: "treatment", time: ["pm"], optional: true });
  return slots.slice(0, 5);
}

function scoreProduct(product, profile, slot) {
  const check = validateSkincareProduct(product);
  if (!check.eligible || check.metadata.category !== slot.category) return null;
  const metadata = check.metadata;
  const avoid = new Set(metadata.avoidFor || []);
  if ((profile.sensitivityAppearance === "high" || profile.skinType === "sensitive") && avoid.has("high_sensitivity")) return null;
  const primary = profile.primaryNeeds.filter((need) => metadata.benefits.includes(need));
  const secondary = profile.secondaryNeeds.filter((need) => metadata.benefits.includes(need));
  const score = primary.length * 30
    + secondary.length * 15
    + (profile.skinType && metadata.skinTypes?.includes(profile.skinType) ? 20 : 0)
    + (metadata.routineTime?.some((time) => slot.time.includes(time)) ? 5 : 0)
    + Math.min(5, Math.max(0, Number(metadata.priority) || 0));
  const matchStrength = primary.length ? "strong" : secondary.length || (profile.skinType && metadata.skinTypes?.includes(profile.skinType)) ? "good" : "fallback";
  return {
    product,
    score,
    matchStrength,
    reasons: [
      ...primary.map((need) => CUSTOMER_REASON[need]),
      ...(profile.skinType && metadata.skinTypes?.includes(profile.skinType) ? [`Positioned for ${profile.skinType} skin`] : []),
      ...(metadata.benefits.includes("barrier_support") ? ["Helps support the skin barrier"] : []),
      ...(!primary.length && !secondary.length ? ["Best available verified category match"] : [])
    ].slice(0, 3)
  };
}

function recommendProductsForSkinProfile(profileInput, products = []) {
  const profile = normalizeSkinProfile(profileInput);
  const eligibleProducts = products.filter((product) => validateSkincareProduct(product).eligible);
  const routine = routineSlots(profile).map((slot) => {
    const matches = eligibleProducts.map((product) => scoreProduct(product, profile, slot)).filter(Boolean).sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name));
    return { ...slot, recommended: matches[0] || null, alternatives: matches.slice(1).filter((match) => match.matchStrength !== "fallback").slice(0, 3) };
  });
  const questionByMetric = { oilBalanceAppearance: "How does your skin usually feel during the day?", hydrationAppearance: "Does your skin often feel dry or tight?", sensitivityAppearance: "Does your skin feel easily irritated by products?" };
  const clarification = (profile.uncertainMetrics || []).map((metric) => questionByMetric[metric]).filter(Boolean)[0];
  return { profileGenerated: true, profile, needs: profile.needs, routine, productsAvailable: eligibleProducts.length > 0, clarification: clarification ? { question: clarification, options: ["Dry", "Balanced", "Oily", "Combination", "Not sure"] } : null };
}

module.exports = { SKINCARE_CATEGORIES, SKIN_TYPES, SKIN_NEEDS, normalizeSkinProfile, profileFromAnalysis, mergeProfileWithUserInput, validateSkincareProduct, recommendProductsForSkinProfile };
