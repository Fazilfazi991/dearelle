const test = require("node:test");
const assert = require("node:assert/strict");
const { recommendProductsForSkinProfile, mergeProfileWithUserInput } = require("../lib/skincare-recommendations");

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

test("favors oil-balance products for an oily profile and keeps alternatives ranked", () => {
  const result = recommendProductsForSkinProfile({ skinType: "oily", needs: ["oil_balance"], primaryNeeds: ["oil_balance"] }, [
    product("oil-serum", "serum", ["oil_balance"]),
    product("hydrating-serum", "serum", ["light_hydration"])
  ]);
  const slot = result.routine.find((item) => item.category === "serum");
  assert.equal(slot.recommended.product.id, "oil-serum");
  assert.equal(slot.alternatives[0].product.id, "hydrating-serum");
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

test("explicit user input overrides an uncertain scan profile", () => {
  const profile = mergeProfileWithUserInput({ skinType: "balanced", oilBalance: "balanced", needs: ["light_hydration"] }, { skinType: "oily", oilBalance: "high", needs: ["oil_balance"] });
  assert.equal(profile.skinType, "oily");
  assert.deepEqual(profile.needs, ["oil_balance"]);
  assert.equal(profile.source, "hybrid");
});
