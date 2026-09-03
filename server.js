const express = require("express");

// Keep the existing CashArrow backend and add only the compact dashboard shell.
const app = require("./server-legacy");

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    const compactUI = `
<style id="casharrowCompactUI">
body.ca-member-compact main.container > .cardbox:first-child{display:none!important}
body.ca-member-compact main.container > #memberTools,
body.ca-member-compact main.container > #todayTasks,
body.ca-member-compact main.container > #rewardsSection,
body.ca-member-compact main.container > #teamSection{display:none!important}
body.ca-member-compact #withdrawSection,
body.ca-member-compact #transactions{display:none!important}
body.ca-member-compact #casharrowMyRentals{margin:0 0 12px}
body.ca-member-compact #rentalCatalog{margin-top:10px}
body.ca-member-compact .section-title{font-size:18px;margin:16px 0 8px}
body.ca-member-compact #userWallet{margin-bottom:12px}
body.ca-member-compact #casharrowDeposit{margin-bottom:12px}
</style>
<script>
(() => {
  const member = () => !!localStorage.getItem('casharrowToken');

  function visible(el) {
    return !!el && getComputedStyle(el).display !== 'none';
  }

  function placeAfter(anchor, el) {
    if (!anchor || !el || anchor === el) return anchor;
    if (anchor.nextElementSibling !== el) anchor.insertAdjacentElement('afterend', el);
    return el;
  }

  function arrange() {
    const isMember = member();
    document.body.classList.toggle('ca-member-compact', isMember);
    if (!isMember) return;

    const wallet = document.getElementById('userWallet');
    const deposit = document.getElementById('casharrowDeposit');
    const withdraw = document.getElementById('withdrawSection');
    const transactions = document.getElementById('transactions');
    const rentals = document.getElementById('casharrowMyRentals');
    const catalog = document.getElementById('rentalCatalog');
    if (!wallet) return;

    let anchor = wallet;

    // Open money panels stay immediately below the wallet.
    if (visible(deposit)) anchor = placeAfter(anchor, deposit) || anchor;
    if (visible(withdraw)) anchor = placeAfter(anchor, withdraw) || anchor;

    // Transactions appears directly below the wallet/money panel when opened.
    if (visible(transactions)) anchor = placeAfter(anchor, transactions) || anchor;

    // Then show the user's rented products and the rental catalogue.
    if (visible(rentals)) anchor = placeAfter(anchor, rentals) || anchor;
    if (visible(catalog)) placeAfter(anchor, catalog);

    // Closed panels never occupy the dashboard.
    if (deposit && !visible(deposit)) deposit.style.display = 'none';
    if (withdraw && !visible(withdraw)) withdraw.style.display = 'none';
    if (transactions && !transactions.dataset.cashArrowOpen) transactions.style.display = 'none';

    if (typeof window.cashArrowRefreshRentals === 'function' && !window.__cashArrowInitialRentals) {
      window.__cashArrowInitialRentals = true;
      window.cashArrowRefreshRentals();
    }
  }

  function hookButtons() {
    if (typeof window.loadTransactions === 'function' && !window.__cashArrowTransactionsHook) {
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
      window.__cashArrowTransactionsHook = true;
    }

    if (typeof window.openWithdraw === 'function' && !window.__cashArrowWithdrawHook) {
      const original = window.openWithdraw;
      window.openWithdraw = function () {
        const section = document.getElementById('withdrawSection');
        if (section) section.dataset.cashArrowOpen = '1';
        const result = original.apply(this, arguments);
        arrange();
        if (section && visible(section)) section.scrollIntoView({behavior:'smooth', block:'nearest'});
        return result;
      };
      window.__cashArrowWithdrawHook = true;
    }

    if (typeof window.openDeposit === 'function' && !window.__cashArrowDepositHook) {
      const original = window.openDeposit;
      window.openDeposit = function () {
        const result = original.apply(this, arguments);
        arrange();
        const section = document.getElementById('casharrowDeposit');
        if (section && visible(section)) section.scrollIntoView({behavior:'smooth', block:'nearest'});
        return result;
      };
      window.__cashArrowDepositHook = true;
    }
  }

  function start() {
    arrange();
    hookButtons();
    const container = document.querySelector('main.container');
    if (container && !window.__cashArrowCompactObserver) {
      window.__cashArrowCompactObserver = new MutationObserver(() => {
        arrange();
        hookButtons();
      });
      window.__cashArrowCompactObserver.observe(container, {childList:true, subtree:true});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();
</script>`;

    body = body.replace("</body>", `${compactUI}</body>`);
  }
  return originalSend.call(this, body);
};

// Export the Express app before loading the authoritative rental/financial wrapper.
module.exports = app;

if (require.main === module) {
  require("./server-with-rentals-v4");
}
