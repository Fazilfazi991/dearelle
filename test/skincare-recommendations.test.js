const test = require("node:test");
const assert = require("node:assert/strict");
const { recommendProductsForSkinProfile, mergeProfileWithUserInput } = require("../lib/skincare-recommendations");
const { isPurchasableProduct } = require("../lib/admin-core");
const verifiedCatalog = require("../data/skincare-product-import.india-verified.json");

function product(id, category, benefits, overrides = {}) {
  return { id, name: id, vertical: "skincare", price: 100, images: ["assets/example.png"], stock: 10, status: "Active", skincare: { category, concerns: ["dehydration"], benefits, skinTypes: ["dry", "oily", "combination", "balanced", "sensitive"], routineTime: ["am", "pm"], active: true, inStock: true, ...overrides } };
}

test("favors hydration and barrier-support products for a dehydrated profile", () => {
  const result = recommendProductsForSkinProfile({ skinType: "dry", needs: ["light_hydration", "barrier_support"], primaryNeeds: ["light_hydration", "barrier_support"] }, [
    product("hydrating-serum", "serum", ["light_hydration", "barrier_support"]),
    product("oil-control-serum", "serum", ["oil_balance"])
  ]);
  assert.equal(result.routine.find((slot) => slot.category === "serum").recommended.product.id, "hydrating-serum");
});

test("never recommends inactive or out-of-stock skincare products", () => {
  const result = recommendProductsForSkinProfile({ needs: ["daily_spf"], primaryNeeds: ["daily_spf"] }, [
    product("sold-out-spf", "sunscreen", ["daily_spf"], { inStock: false }),
    product("inactive-spf", "sunscreen", ["daily_spf"], { active: false })
  ]);
  assert.equal(result.productsAvailable, false);
  assert.equal(result.routine.find((slot) => slot.category === "sunscreen").recommended, null);
});

test("does not recommend products with incomplete commerce metadata", () => {
  const incomplete = product("missing-image-spf", "sunscreen", ["daily_spf"]);
  incomplete.images = [];
  const result = recommendProductsForSkinProfile({ needs: ["daily_spf"], primaryNeeds: ["daily_spf"] }, [incomplete]);
  assert.equal(result.productsAvailable, false);
});

test("allows verified external recommendations with an approved placeholder instead of a copied image", () => {
  const external = product("external-spf", "sunscreen", ["daily_spf"]);
  external.commerceMode = "external";
  external.commerceEligible = false;
  external.images = [];
  external.price = 0;
  external.imageStatus = "placeholder_only";
  external.verificationStatus = "verified";
  external.officialProductUrl = "https://brand.example/product";
  const result = recommendProductsForSkinProfile({ needs: ["daily_spf"], primaryNeeds: ["daily_spf"] }, [external]);
  assert.equal(result.routine.find((slot) => slot.category === "sunscreen").recommended.product.id, "external-spf");
});

test("favors oil-balance products for an oily profile and keeps suitable alternatives ranked", () => {
  const result = recommendProductsForSkinProfile({ skinType: "oily", needs: ["oil_balance"], primaryNeeds: ["oil_balance"] }, [
    product("oil-serum", "serum", ["oil_balance"], { priority: 1 }),
    product("alternate-oil-serum", "serum", ["oil_balance"])
  ]);
  const slot = result.routine.find((item) => item.category === "serum");
  assert.equal(slot.recommended.product.id, "oil-serum");
  assert.equal(slot.alternatives[0].product.id, "alternate-oil-serum");
});

test("combination profiles do not receive a business-priority override over suitability", () => {
  const result = recommendProductsForSkinProfile({ skinType: "combination", needs: ["light_hydration"], primaryNeeds: ["light_hydration"] }, [
    product("suitable-serum", "serum", ["light_hydration"]),
    product("high-priority-serum", "serum", ["oil_balance"], { priority: 5 })
  ]);
  assert.equal(result.routine.find((slot) => slot.category === "serum").recommended.product.id, "suitable-serum");
});

test("excludes high-sensitivity conflicts", () => {
  const result = recommendProductsForSkinProfile({ skinType: "sensitive", sensitivityAppearance: "high", needs: ["texture_support"], primaryNeeds: ["texture_support"] }, [
    product("conflicting-treatment", "treatment", ["texture_support"], { avoidFor: ["high_sensitivity"] })
  ]);
  assert.equal(result.routine.find((slot) => slot.category === "treatment").recommended, null);
});

test("does not treat jewelry as recommendation inventory", () => {
  const result = recommendProductsForSkinProfile({ needs: ["daily_spf"] }, [{ id: "jewelry", name: "Jewelry", status: "Active", stock: 5 }]);
  assert.equal(result.productsAvailable, false);
});

test("returns category-first routine slots even when no real skincare product matches", () => {
  const result = recommendProductsForSkinProfile({ needs: ["texture_support"], primaryNeeds: ["texture_support"] }, []);
  assert.deepEqual(result.routine.map((slot) => slot.category), ["cleanser", "serum", "moisturizer", "sunscreen", "treatment"]);
  assert.equal(result.routine.every((slot) => slot.recommended === null), true);
});

test("marks a category fallback when no product supports the requested need", () => {
  const result = recommendProductsForSkinProfile({ needs: ["oil_balance"], primaryNeeds: ["oil_balance"] }, [product("plain-cleanser", "cleanser", ["gentle_cleansing"])]);
  assert.equal(result.routine.find((slot) => slot.category === "cleanser").recommended.matchStrength, "fallback");
});

test("does not invent a sunscreen recommendation when no sunscreen is eligible", () => {
  const result = recommendProductsForSkinProfile({ needs: ["daily_spf"], primaryNeeds: ["daily_spf"] }, [product("gentle-cleanser", "cleanser", ["gentle_cleansing"])]);
  assert.equal(result.routine.find((slot) => slot.category === "sunscreen").recommended, null);
});

test("rejects external recommendation records from commerce and keeps internal jewelry purchasable", () => {
  assert.equal(isPurchasableProduct({ id: "external", commerceMode: "external", commerceEligible: false, status: "Active" }), false);
  assert.equal(isPurchasableProduct({ id: "jewelry", commerceMode: "internal", commerceEligible: true, status: "Active" }), true);
});

test("explicit user input overrides an uncertain scan profile", () => {
  const profile = mergeProfileWithUserInput({ skinType: "balanced", oilBalance: "balanced", needs: ["light_hydration"] }, { skinType: "oily", oilBalance: "high", needs: ["oil_balance"] });
  assert.equal(profile.skinType, "oily");
  assert.deepEqual(profile.needs, ["oil_balance"]);
  assert.equal(profile.source, "hybrid");
});

test("verified India catalog stays external-only and covers ten representative profiles", () => {
  assert.equal(verifiedCatalog.products.length, 20);
  assert.equal(verifiedCatalog.products.every((item) => item.commerceMode === "external" && item.commerceEligible === false && item.imageStatus === "placeholder_only" && /^https:\/\//.test(item.officialProductUrl) && item.verificationStatus === "verified"), true);
  const profiles = [
    { name: "dry", skinType: "dry", needs: ["light_hydration", "barrier_support", "daily_spf"] },
    { name: "oily", skinType: "oily", needs: ["oil_balance", "daily_spf"] },
    { name: "combination pores", skinType: "combination", poreAppearance: "high", needs: ["light_hydration", "oil_balance", "daily_spf"] },
    { name: "balanced", skinType: "balanced", needs: ["light_hydration", "daily_spf"] },
    { name: "sensitive texture", skinType: "sensitive", sensitivityAppearance: "high", needs: ["gentle_cleansing", "barrier_support", "texture_support", "daily_spf"] },
    { name: "texture", skinType: "combination", needs: ["texture_support", "daily_spf"] },
    { name: "pores", skinType: "oily", poreAppearance: "high", needs: ["oil_balance", "daily_spf"] },
    { name: "dull", skinType: "balanced", needs: ["brightening_support", "daily_spf"] }
    , { name: "uneven tone", skinType: "combination", needs: ["brightening_support", "daily_spf"] }
    , { name: "oily dehydrated", skinType: "oily", hydration: "low", oilBalance: "high", needs: ["light_hydration", "oil_balance", "daily_spf"] }
  ];
  profiles.forEach((profile) => {
    const result = recommendProductsForSkinProfile({ ...profile, primaryNeeds: profile.needs }, verifiedCatalog.products);
    assert.equal(result.productsAvailable, true, profile.name);
    ["cleanser", "moisturizer", "sunscreen"].forEach((category) => assert.ok(result.routine.find((slot) => slot.category === category)?.recommended, `${profile.name} ${category}`));
  });
  const oilyDehydrated = recommendProductsForSkinProfile({ skinType: "oily", hydration: "low", oilBalance: "high", needs: ["light_hydration", "oil_balance", "daily_spf"], primaryNeeds: ["light_hydration", "oil_balance", "daily_spf"] }, verifiedCatalog.products);
  const moisturizer = oilyDehydrated.routine.find((slot) => slot.category === "moisturizer").recommended;
  assert.equal(moisturizer.product.id, "ext-minimalist-vitamin-b5-10-moisturizer-50g");
  assert.equal(moisturizer.matchStrength, "strong");
  const sensitiveTexture = recommendProductsForSkinProfile({ skinType: "sensitive", sensitivityAppearance: "high", needs: ["texture_support", "barrier_support", "daily_spf"], primaryNeeds: ["texture_support", "barrier_support", "daily_spf"] }, verifiedCatalog.products);
  assert.equal(sensitiveTexture.routine.find((slot) => slot.category === "treatment").recommended, null);
});
