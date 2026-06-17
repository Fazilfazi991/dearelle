const { loadStore } = require("./admin-core");

function sendJson(response, statusCode, payload) {
  if (typeof response.writeHead === "function") {
    response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  } else {
    response.statusCode = statusCode;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
  }
  response.end(JSON.stringify(payload));
}

async function getSupabaseUser(request) {
  const token = String(request.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Customer login required.");
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase server env is not configured.");
  }

  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token}`
    }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Customer login expired.");
  return payload;
}

async function handleCustomerRequest(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  const action = url.searchParams.get("action") || "";

  if (request.method === "GET" && action === "orders") {
    const user = await getSupabaseUser(request);
    const store = await loadStore();
    const email = String(user.email || "").toLowerCase();
    const orders = (store.orders || []).filter((order) => {
      return order.customer?.userId === user.id || String(order.customer?.email || "").toLowerCase() === email;
    });
    sendJson(response, 200, { orders });
    return;
  }

  sendJson(response, 404, { error: "Customer endpoint not found." });
}

module.exports = { handleCustomerRequest };
