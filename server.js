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
body.ca-compact main.container > .cardbox:first-child{display:none!important}
body.ca-compact main.container > #memberTools,
body.ca-compact main.container > #todayTasks,
body.ca-compact main.container > #rewardsSection,
body.ca-compact main.container > #teamSection{display:none!important}
body.ca-compact #withdrawSection,
body.ca-compact #transactions{display:none!important}
body.ca-compact #casharrowMyRentals{margin-bottom:12px}
body.ca-compact #rentalCatalog{margin-top:10px}
body.ca-compact .section-title{font-size:18px;margin:16px 0 8px}
body.ca-compact #userWallet{margin-bottom:12px}
</style>
<script>
(() => {
  const isMember = () => !!localStorage.getItem('casharrowToken');

  const arrange = () => {
    const member = isMember();
    document.body.classList.toggle('ca-compact', member);
    if (!member) return;

    const wallet = document.getElementById('userWallet');
    const transactions = document.getElementById('transactions');
    const rentals = document.getElementById('casharrowMyRentals');
    const catalog = document.getElementById('rentalCatalog');
    const withdraw = document.getElementById('withdrawSection');

    // Short member flow: Wallet -> Transactions -> My Rentals -> Rental Products.
    if (wallet && transactions && wallet.nextElementSibling !== transactions) {
      wallet.insertAdjacentElement('afterend', transactions);
    }
    if (transactions && rentals && transactions.nextElementSibling !== rentals) {
      transactions.insertAdjacentElement('afterend', rentals);
    }
    if (rentals && catalog && rentals.nextElementSibling !== catalog) {
      rentals.insertAdjacentElement('afterend', catalog);
    }

    if (withdraw && withdraw.dataset.cashArrowOpen !== '1') {
      withdraw.style.display = 'none';
    }
    if (transactions && transactions.dataset.cashArrowOpen !== '1') {
      transactions.style.display = 'none';
    }

    // Create/load My Rentals when a logged-in member first opens the dashboard.
    if (typeof window.cashArrowRefreshRentals === 'function' && !window.__cashArrowRentalRefreshStarted) {
      window.__cashArrowRentalRefreshStarted = true;
      window.cashArrowRefreshRentals();
    }
  };

  const hookInteractions = () => {
    if (typeof window.loadTransactions === 'function' && !window.__cashArrowCompactTransactions) {
      const original = window.loadTransactions;
      window.loadTransactions = async function () {
        const section = document.getElementById('transactions');
        if (section) {
          section.dataset.cashArrowOpen = '1';
          section.style.display = 'block';
        }
        arrange();
        if (section) section.scrollIntoView({behavior:'smooth', block:'nearest'});
        const result = await original.apply(this, arguments);
        if (section) section.style.display = 'block';
        return result;
      };
      window.__cashArrowCompactTransactions = true;
    }

    if (typeof window.openWithdraw === 'function' && !window.__cashArrowCompactWithdraw) {
      const original = window.openWithdraw;
      window.openWithdraw = function () {
        const section = document.getElementById('withdrawSection');
        if (section) section.dataset.cashArrowOpen = '1';
        const result = original.apply(this, arguments);
        if (section && section.style.display !== 'none') {
          section.scrollIntoView({behavior:'smooth', block:'nearest'});
        }
        return result;
      };
      window.__cashArrowCompactWithdraw = true;
    }
  };

  const start = () => {
    arrange();
    hookInteractions();
    const container = document.querySelector('main.container');
    if (container && !window.__cashArrowCompactObserver) {
      window.__cashArrowCompactObserver = new MutationObserver(() => {
        arrange();
        hookInteractions();
      });
      window.__cashArrowCompactObserver.observe(container, {childList:true, subtree:true});
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
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
