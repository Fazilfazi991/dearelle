const { handleCustomerRequest } = require("../lib/customer-core");

module.exports = async function handler(request, response) {
  try {
    await handleCustomerRequest(request, response);
  } catch (error) {
    response.statusCode = error.message?.includes("login") ? 401 : 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: error.message || "Customer request failed" }));
  }
};
