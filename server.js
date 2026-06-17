const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { handleAdminRequest, loadStore, saveStore } = require("./lib/admin-core");
const { handleCustomerRequest } = require("./lib/customer-core");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const stripeApiVersion = "2025-05-28.basil";
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml"
};
const cleanPageRoutes = {
  "/": "index.html",
  "/admin": "admin.html",
  "/account": "account.html",
  "/product": "product.html",
  "/category": "category.html",
  "/cart": "cart.html",
  "/checkout": "checkout.html"
};
const legacyPageRedirects = {
  "/index.html": "/",
  "/admin.html": "/admin",
  "/account.html": "/account",
  "/product.html": "/product",
  "/category.html": "/category",
  "/cart.html": "/cart",
  "/checkout.html": "/checkout"
};

function json(response, statusCode, payload) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function loadStaticProducts() {
  const sandbox = { window: {} };
  const source = fs.readFileSync(path.join(root, "products.js"), "utf8");
  vm.runInNewContext(source, sandbox, { filename: "products.js" });
  return sandbox.window.products || [];
}

async function loadProducts() {
  try {
    const store = await loadStore();
    if (Array.isArray(store.products) && store.products.length) return store.products;
  } catch {
    // Keep local checkout running with the static catalog if admin storage is not ready.
  }
  return loadStaticProducts();
}

async function orderTotals(cart) {
  const products = await loadProducts();
  const lines = (Array.isArray(cart) ? cart : []).map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    return product ? { product, quantity, options: item.options || {} } : null;
  }).filter(Boolean);

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shipping = subtotal === 0 || subtotal >= 5999 ? 0 : 149;
  const discount = subtotal >= 5999 ? Math.round(subtotal * 0.2) : 0;
  const total = Math.max(0, subtotal + shipping - discount);

  return { lines, subtotal, shipping, discount, total };
}

function formEncode(data, prefix, params = new URLSearchParams()) {
  Object.entries(data).forEach(([key, value]) => {
    const paramKey = prefix ? `${prefix}[${key}]` : key;

    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((entry, index) => formEncode({ [index]: entry }, prefix ? paramKey : key, params));
      return;
    }
    if (typeof value === "object") {
      formEncode(value, paramKey, params);
      return;
    }

    params.append(paramKey, String(value));
  });

  return params;
}

function stripeRequest(data) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Promise.reject(new Error("STRIPE_SECRET_KEY is not configured"));
  }

  const body = formEncode(data).toString();

  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: "api.stripe.com",
      path: "/v1/checkout/sessions",
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "Stripe-Version": stripeApiVersion
      }
    }, (stripeResponse) => {
      let responseBody = "";
      stripeResponse.on("data", (chunk) => {
        responseBody += chunk;
      });
      stripeResponse.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(responseBody);
        } catch {
          parsed = { error: { message: responseBody || "Stripe returned an invalid response" } };
        }

        if (stripeResponse.statusCode >= 400) {
          reject(new Error(parsed.error?.message || "Stripe checkout session failed"));
          return;
        }

        resolve(parsed);
      });
    });

    request.on("error", reject);
    request.write(body);
    request.end();
  });
}

async function createCheckoutSession(request, response) {
  try {
    const payload = JSON.parse(await readBody(request) || "{}");
    const totals = await orderTotals(payload.cart);

    if (!totals.lines.length || totals.total <= 0) {
      json(response, 400, { error: "Cart is empty" });
      return;
    }

    const origin = `http://${request.headers.host}`;
    const orderId = `DL${Date.now().toString().slice(-7)}`;
    const customer = payload.customer || {};
    const description = totals.lines.map((line) => {
      const optionText = [line.options.metal, line.options.length].filter(Boolean).join(" / ");
      return `${line.quantity} x ${line.product.name}${optionText ? ` (${optionText})` : ""}`;
    }).join("; ");

    const session = await stripeRequest({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin}/checkout?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?stripe=cancelled`,
      customer_email: customer.email || undefined,
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["IN"] },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "inr",
          unit_amount: totals.total * 100,
          product_data: {
            name: "Dearelle order",
            description
          }
        }
      }],
      metadata: {
        order_id: orderId,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        discount: totals.discount
      }
    });

    const order = {
      id: orderId,
      stripeSessionId: session.id,
      createdAt: new Date().toISOString(),
      customer,
      payment: "Stripe",
      paymentStatus: "Pending",
      items: totals.lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        quantity: line.quantity,
        options: line.options,
        price: line.product.price
      })),
      subtotal: totals.subtotal,
      shipping: totals.shipping,
      discount: totals.discount,
      total: totals.total
    };

    try {
      const store = await loadStore();
      store.orders = [order, ...(store.orders || []).filter((entry) => entry.id !== order.id)];
      await saveStore(store);
    } catch {
      // Checkout should continue even if order storage is temporarily unavailable.
    }

    json(response, 200, { id: session.id, url: session.url, order });
  } catch (error) {
    json(response, 500, { error: error.message || "Unable to start Stripe checkout" });
  }
}

http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const route = decodeURIComponent(requestUrl.pathname);

  if ((request.method === "GET" || request.method === "HEAD") && legacyPageRedirects[route]) {
    response.writeHead(308, { Location: `${legacyPageRedirects[route]}${requestUrl.search}` });
    response.end();
    return;
  }

  if (route === "/api/admin") {
    handleAdminRequest(request, response).catch((error) => {
      json(response, 500, { error: error.message || "Admin request failed" });
    });
    return;
  }

  if (route === "/api/customer") {
    handleCustomerRequest(request, response).catch((error) => {
      json(response, error.message?.includes("login") ? 401 : 500, { error: error.message || "Customer request failed" });
    });
    return;
  }

  if (request.method === "POST" && route === "/api/create-checkout-session") {
    createCheckoutSession(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    json(response, 405, { error: "Method not allowed" });
    return;
  }

  const requestedFile = cleanPageRoutes[route] || route.replace(/^\/+/, "");
  const filePath = path.join(root, requestedFile);

  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream"
    });
    response.end(request.method === "HEAD" ? undefined : data);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Dearelle website running at http://127.0.0.1:${port}`);
});
