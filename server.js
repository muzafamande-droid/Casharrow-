const express = require("express");
const fs = require("fs");
const path = require("path");

// Keep the existing Express application as the source of all backend routes.
// This small response hook only adds the dashboard layout fix to index.html.
const originalSendFile = express.response.sendFile;
express.response.sendFile = function (file, options, callback) {
  const isMainIndex = typeof file === "string" && path.basename(file).toLowerCase() === "index.html";

  if (!isMainIndex) {
    return originalSendFile.call(this, file, options, callback);
  }

  fs.readFile(file, "utf8", (error, html) => {
    if (error) {
      return originalSendFile.call(this, file, options, callback);
    }

    const layoutFix = `
<script>
(() => {
  const placeMyRentals = () => {
    const wallet = document.getElementById('userWallet');
    const rentals = document.getElementById('casharrowMyRentals');
    if (wallet && rentals && wallet.nextElementSibling !== rentals) {
      wallet.insertAdjacentElement('afterend', rentals);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', placeMyRentals, { once: true });
  } else {
    placeMyRentals();
  }

  const observeLayout = () => {
    const container = document.querySelector('main.container');
    if (!container) return;
    new MutationObserver(placeMyRentals).observe(container, { childList: true, subtree: true });
    placeMyRentals();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeLayout, { once: true });
  } else {
    observeLayout();
  }
})();
</script>`;

    const output = html.includes("</body>")
      ? html.replace("</body>", `${layoutFix}</body>`)
      : `${html}${layoutFix}`;

    this.type("html").send(output);
    if (typeof callback === "function") callback();
  });

  return this;
};

const app = require("./server-legacy");

// Export the Express app before loading the authoritative wrapper.
// This prevents a CommonJS circular dependency when Render runs
// `node server.js` directly.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
