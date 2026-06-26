const crypto = require("crypto");
const { updateStripeOrder } = require("../lib/admin-core");

function json(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readRawBody(request) {
  if (Buffer.isBuffer(request.body)) return Promise.resolve(request.body.toString("utf8"));
  if (typeof request.body === "string") return Promise.resolve(request.body);

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

  const digest = crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  const digestBuffer = Buffer.from(digest, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (digestBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(digestBuffer, expectedBuffer)) {
    throw new Error("Stripe webhook signature verification failed");
  }
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    json(response, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    verifyStripeWebhook(rawBody, request.headers["stripe-signature"]);
    const event = JSON.parse(rawBody);

    if (event.type === "checkout.session.completed") {
      await updateStripeOrder(event.data.object);
    }

    json(response, 200, { received: true });
  } catch (error) {
    json(response, 400, { error: error.message || "Stripe webhook failed" });
  }
};
