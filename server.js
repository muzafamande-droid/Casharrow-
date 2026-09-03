const express = require("express");
const fs = require("fs");
const path = require("path");

// Keep the existing Express application as the source of all backend routes.
// Add a small client-side presentation layer to keep the member dashboard compact.
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
<style>
/* Compact CashArrow member dashboard */
body.ca-compact .container{padding-bottom:16px}
body.ca-compact #totalBalance{display:none!important}
body.ca-compact #totalBalance + .actions{margin-top:0}
body.ca-compact main.container > #memberTools,
body.ca-compact main.container > #todayTasks,
body.ca-compact main.container > #rewardsSection,
body.ca-compact main.container > #teamSection{display:none!important}
body.ca-compact #withdrawSection,
body.ca-compact #transactions{display:none!important}
body.ca-compact #casharrowMyRentals{margin-bottom:12px}
body.ca-compact #rentalCatalog{margin-top:10px}
body.ca-compact .section-title{font-size:18px;margin:16px 0 8px}
</style>
<script>
(() => {
  const compactDashboard = () => {
    document.body.classList.add('ca-compact');

    const wallet = document.getElementById('userWallet');
    const rentals = document.getElementById('casharrowMyRentals');
    const catalog = document.getElementById('rentalCatalog');
    const transactions = document.getElementById('transactions');
    const withdraw = document.getElementById('withdrawSection');

    // Keep the useful member flow short: Wallet -> My Rentals -> Rental Products -> Transactions.
    if (wallet && rentals && wallet.nextElementSibling !== rentals) {
      wallet.insertAdjacentElement('afterend', rentals);
    }
    if (rentals && catalog && rentals.nextElementSibling !== catalog) {
      rentals.insertAdjacentElement('afterend', catalog);
    }
    if (catalog && transactions && catalog.nextElementSibling !== transactions) {
      catalog.insertAdjacentElement('afterend', transactions);
    }

    if (withdraw) withdraw.style.display = 'none';
    if (transactions) transactions.style.display = 'none';

    // My Rentals must exist as soon as a logged-in member opens the dashboard.
    if (localStorage.getItem('casharrowToken') && typeof window.cashArrowRefreshRentals === 'function') {
      window.cashArrowRefreshRentals();
    }
  };

  const installToggles = () => {
    compactDashboard();

    if (typeof window.loadTransactions === 'function' && !window.__cashArrowCompactTransactions) {
      const originalLoadTransactions = window.loadTransactions;
      window.loadTransactions = async function () {
        const section = document.getElementById('transactions');
        if (section) section.style.display = 'block';
        const result = await originalLoadTransactions.apply(this, arguments);
        compactDashboard();
        if (section) section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return result;
      };
      window.__cashArrowCompactTransactions = true;
    }

    if (typeof window.openWithdraw === 'function' && !window.__cashArrowCompactWithdraw) {
      const originalOpenWithdraw = window.openWithdraw;
      window.openWithdraw = function () {
        const result = originalOpenWithdraw.apply(this, arguments);
        const section = document.getElementById('withdrawSection');
        if (section && section.style.display !== 'none') {
          section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return result;
      };
      window.__cashArrowCompactWithdraw = true;
    }
  };

  const start = () => {
    installToggles();
    const container = document.querySelector('main.container');
    if (container) {
      new MutationObserver(installToggles).observe(container, { childList: true, subtree: true });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
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
