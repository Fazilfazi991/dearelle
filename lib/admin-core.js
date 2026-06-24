const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const storePath = path.join(root, "data", "store.json");
const cookieName = "dearelle_admin_session";
const sessionHours = 12;
const supabaseKey = "dearelle_store";

function sendJson(response, statusCode, payload, headers = {}) {
  if (typeof response.writeHead === "function") {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8", ...headers });
  } else {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    Object.entries(headers).forEach(([key, value]) => response.setHeader(key, value));
  }
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  if (request.body && typeof request.body === "object") return Promise.resolve(request.body);
  if (typeof request.body === "string") {
    try {
      return Promise.resolve(JSON.parse(request.body || "{}"));
    } catch {
      return Promise.resolve({});
    }
  }

  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 8 * 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    request.on("error", reject);
  });
}

function defaultProducts() {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(root, "products.js"), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "products.js" });
  return sandbox.window.products || [];
}

function emptyStore() {
  return {
    products: defaultProducts(),
    settings: {
      storeName: "Dearelle",
      supportEmail: "hello@dearelle.com",
      freeShipping: 5999,
      discountPercent: 20
    },
    orders: []
  };
}

function normalizeStore(store) {
  const fallback = emptyStore();
  return {
    products: Array.isArray(store?.products) && store.products.length ? store.products : fallback.products,
    settings: { ...fallback.settings, ...(store?.settings || {}) },
    orders: Array.isArray(store?.orders) ? store.orders : []
  };
}

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function supabaseRequest(pathname, options = {}) {
  const baseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const response = await fetch(`${baseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadStore() {
  if (hasSupabase()) {
    const rows = await supabaseRequest(`/rest/v1/store_data?select=value&key=eq.${encodeURIComponent(supabaseKey)}`);
    return normalizeStore(rows?.[0]?.value);
  }

  try {
    return normalizeStore(JSON.parse(fs.readFileSync(storePath, "utf8")));
  } catch {
    return normalizeStore(null);
  }
}

async function saveStore(store) {
  const normalized = normalizeStore(store);
  if (hasSupabase()) {
    await supabaseRequest("/rest/v1/store_data?on_conflict=key", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key: supabaseKey, value: normalized, updated_at: new Date().toISOString() })
    });
    return normalized;
  }

  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  fs.writeFileSync(storePath, JSON.stringify(normalized, null, 2));
  return normalized;
}

function parseCookies(request) {
  return Object.fromEntries(String(request.headers.cookie || "")
    .split(";")
    .map((entry) => entry.trim().split("="))
    .filter(([key]) => key)
    .map(([key, value]) => [key, decodeURIComponent(value || "")]));
}

function secret() {
  return process.env.ADMIN_SESSION_SECRET || "";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function makeSession(username) {
  const payload = Buffer.from(JSON.stringify({
    username,
    exp: Date.now() + sessionHours * 60 * 60 * 1000
  })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function validSession(request) {
  if (!secret()) return false;
  const token = parseCookies(request)[cookieName];
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature || sign(payload) !== signature) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.exp > Date.now();
  } catch {
    return false;
  }
}

function passwordMatches(password) {
  const plain = process.env.ADMIN_PASSWORD;
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!plain && !hash) return false;
  if (hash) {
    const digest = crypto.createHash("sha256").update(String(password || "")).digest("hex");
    return digest === hash;
  }
  return String(password || "") === plain;
}

function authReady() {
  return Boolean(process.env.ADMIN_USERNAME && (process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD_HASH) && secret());
}

function cookieHeader(token, request) {
  const secure = request.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
  return `${cookieName}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionHours * 60 * 60}${secure}`;
}

function clearCookieHeader() {
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function primaryImageFolder(product) {
  return String(product?.images?.[0] || "").split("/").slice(0, -1).join("/");
}

function dedupeProducts(products) {
  const seen = new Set();

  return (products || []).filter((product) => {
    const keys = [
      `name:${slugify(product.name)}`,
      primaryImageFolder(product) ? `image:${primaryImageFolder(product)}` : ""
    ].filter(Boolean);
    const duplicate = keys.some((key) => seen.has(key));

    keys.forEach((key) => seen.add(key));
    return !duplicate;
  });
}

function storefrontProducts(products) {
  return dedupeProducts(products.filter((product) => product.status !== "Archived"));
}

async function handleAdminRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const action = url.searchParams.get("action") || "";

  if (request.method === "GET" && action === "storefront") {
    const store = await loadStore();
    sendJson(response, 200, { products: storefrontProducts(store.products), settings: store.settings });
    return;
  }

  if (request.method === "POST" && action === "login") {
    if (!authReady()) {
      sendJson(response, 500, { error: "Admin auth is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD or ADMIN_PASSWORD_HASH, and ADMIN_SESSION_SECRET." });
      return;
    }

    const payload = await readJsonBody(request);
    if (payload.username !== process.env.ADMIN_USERNAME || !passwordMatches(payload.password)) {
      sendJson(response, 401, { error: "Invalid admin login." });
      return;
    }

    sendJson(response, 200, { ok: true }, { "Set-Cookie": cookieHeader(makeSession(payload.username), request) });
    return;
  }

  if (request.method === "POST" && action === "logout") {
    sendJson(response, 200, { ok: true }, { "Set-Cookie": clearCookieHeader() });
    return;
  }

  if (!validSession(request)) {
    sendJson(response, 401, { error: authReady() ? "Admin login required." : "Admin auth is not configured." });
    return;
  }

  if (request.method === "GET" && action === "bootstrap") {
    sendJson(response, 200, await loadStore());
    return;
  }

  if (request.method === "POST" && action === "save-products") {
    const payload = await readJsonBody(request);
    const store = await loadStore();
    store.products = Array.isArray(payload.products) ? payload.products : store.products;
    sendJson(response, 200, await saveStore(store));
    return;
  }

  if (request.method === "POST" && action === "save-settings") {
    const payload = await readJsonBody(request);
    const store = await loadStore();
    store.settings = { ...store.settings, ...(payload.settings || {}) };
    sendJson(response, 200, await saveStore(store));
    return;
  }

  if (request.method === "POST" && action === "clear-orders") {
    const store = await loadStore();
    store.orders = [];
    sendJson(response, 200, await saveStore(store));
    return;
  }

  sendJson(response, 404, { error: "Admin endpoint not found." });
}

module.exports = { handleAdminRequest, loadStore, saveStore };
