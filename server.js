const app = require("./server-legacy");

// Use the authoritative PostgreSQL/rental server whenever the hosting
// platform launches `node server.js` directly.
if (require.main === module) {
  require("./server-with-rentals-v4");
}

module.exports = app;
