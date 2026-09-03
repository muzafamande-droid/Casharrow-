const app = require("./server-legacy");

// Inject exactly one authoritative member dashboard implementation.
const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(
      "</body>",
      '  <script src="/member-dashboard-v2.js?v=4"></script></body>'
    );
  }
  return originalSend.call(this, body);
};

// Export the Express app before loading the authoritative rental/financial wrapper.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
