const app = require("./server-legacy");

// Export the Express app before loading the authoritative wrapper.
// This prevents a CommonJS circular dependency when Render runs
// `node server.js` directly.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
