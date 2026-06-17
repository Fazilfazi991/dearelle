const { handleAdminRequest } = require("../lib/admin-core");

module.exports = async function handler(request, response) {
  try {
    await handleAdminRequest(request, response);
  } catch (error) {
    response.statusCode = 500;
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.end(JSON.stringify({ error: error.message || "Admin request failed" }));
  }
};
