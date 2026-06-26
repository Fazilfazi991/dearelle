const http = require("http");
const https = require("https");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { handleAdminRequest, loadStore, saveStore, updateStripeOrder } = require("./lib/admin-core");
const { handleCustomerRequest } = require("./lib/customer-core");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const stripeApiVersion = "2025-05-28.basil";
const shippingMethods = [
  { id: "indian-post", name: "INDIAN POST", price: 49 },
  { id: "dtdc-all-india", name: "DTDC ALL INDIA", price: 99 }
];
const defaultShippingMethod = shippingMethods[0];
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
  "/earrings": "category.html",
  "/cart": "cart.html",
  "/checkout": "checkout.html",
  "/send-gift-to-india": "send-gift-to-india.html",
  "/gift-boxes/sweet-heart-box": "gift-box-builder.html",
  "/gift-boxes/luxe-love-box": "gift-box-builder.html",
  "/gift-boxes/ultimate-surprise-box": "gift-box-builder.html",
  "/about-us": "page.html",
  "/our-craft": "page.html",
  "/sustainability": "page.html",
  "/care-guide": "page.html",
  "/faqs": "page.html",
  "/contact-us": "page.html",
  "/shipping-delivery": "page.html",
  "/returns-exchanges": "page.html",
  "/size-guide": "page.html",
  "/track-your-order": "page.html",
  "/gift-cards": "page.html",
  "/privacy-policy": "page.html",
  "/terms-and-conditions": "page.html",
  "/accessibility": "page.html"
};
const legacyPageRedirects = {
  "/index.html": "/",
  "/admin.html": "/admin",
  "/account.html": "/account",
  "/product.html": "/product",
  "/category.html": "/category",
  "/cart.html": "/cart",
  "/checkout.html": "/checkout",
  "/send-gift-to-india.html": "/send-gift-to-india",
  "/gift-box-builder.html": "/send-gift-to-india"
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

function verifyStripeWebhook(rawBody, signatureHeader) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");

  const parts = Object.fromEntries(String(signatureHeader || "")
    .split(",")
    .map((part) => part.split("="))
    .filter(([key, value]) => key && value));
  const timestamp = parts.t;
  const expected = parts.v1;
  if (!timestamp || !expected) throw new Error("Invalid Stripe signature header");

  const signedPayload = `${timestamp}.${rawBody}`;
  const digest = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const digestBuffer = Buffer.from(digest, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (digestBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(digestBuffer, expectedBuffer)) {
    throw new Error("Stripe webhook signature verification failed");
  }
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

function normalizeShippingMethod(method) {
  const selected = shippingMethods.find((entry) => entry.id === method?.id || entry.id === method);
  return selected || defaultShippingMethod;
}

async function orderTotals(cart, shippingMethodInput) {
  const products = await loadProducts();
  const shippingMethod = normalizeShippingMethod(shippingMethodInput);
  const lines = (Array.isArray(cart) ? cart : []).map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const quantity = Math.max(1, Math.min(10, Number(item.quantity) || 1));
    return product ? { product, quantity, options: item.options || {} } : null;
  }).filter(Boolean);

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const shipping = subtotal > 0 ? shippingMethod.price : 0;
  const discount = 0;
  const total = Math.max(0, subtotal + shipping);

  return { lines, subtotal, shipping, shippingMethod: { ...shippingMethod, price: shipping }, discount, total };
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

function stripeLineItems(totals, origin) {
  const items = totals.lines.map((line) => {
    const image = line.product.images?.[0] || "";
    const absoluteImage = /^https?:\/\//i.test(image) ? image : "";
    return {
      quantity: line.quantity,
      price_data: {
        currency: "inr",
        unit_amount: Math.round(Number(line.product.price || 0) * 100),
        product_data: {
          name: line.product.name,
          images: absoluteImage ? [absoluteImage] : undefined
        }
      }
    };
  });

  if (totals.shipping > 0) {
    items.push({
      quantity: 1,
      price_data: {
        currency: "inr",
        unit_amount: Math.round(totals.shipping * 100),
        product_data: { name: `Shipping - ${totals.shippingMethod.name}` }
      }
    });
  }

  return items;
}

async function createCheckoutSession(request, response) {
  try {
    const payload = JSON.parse(await readBody(request) || "{}");
    const totals = await orderTotals(payload.cart, payload.shippingMethod);

    if (!totals.lines.length || totals.total <= 0) {
      json(response, 400, { error: "Cart is empty" });
      return;
    }

    const origin = `http://${request.headers.host}`;
    const orderId = `DL${Date.now().toString().slice(-7)}`;
    const customer = payload.customer || {};
    const productNames = totals.lines.map((line) => line.product.name).join(", ").slice(0, 450);

    const session = await stripeRequest({
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${origin}/checkout?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?stripe=cancelled`,
      customer_email: customer.email || undefined,
      phone_number_collection: { enabled: true },
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["IN"] },
      line_items: stripeLineItems(totals, origin),
      metadata: {
        order_id: orderId,
        subtotal: totals.subtotal,
        shipping: totals.shipping,
        shipping_method_id: totals.shippingMethod.id,
        shipping_method: totals.shippingMethod.name,
        discount: totals.discount,
        product_ids: totals.lines.map((line) => line.product.id).join(",").slice(0, 450),
        product_names: productNames
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
      shippingMethod: totals.shippingMethod,
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

async function handleStripeWebhook(request, response) {
  try {
    const rawBody = await readBody(request);
    verifyStripeWebhook(rawBody, request.headers["stripe-signature"]);
    const event = JSON.parse(rawBody);

    if (event.type === "checkout.session.completed") {
      await updateStripeOrder(event.data.object);
    }

    json(response, 200, { received: true });
  } catch (error) {
    json(response, 400, { error: error.message || "Stripe webhook failed" });
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

  if (request.method === "POST" && route === "/api/stripe-webhook") {
    handleStripeWebhook(request, response);
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
