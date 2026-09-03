const app = require("./server-legacy");

// Export the Express app before loading the authoritative rental/financial wrapper.
// The member dashboard UI is injected by server-with-rentals-v4 so there is only
// one active dashboard implementation and no competing legacy UI.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
