(() => {
  function token() { return localStorage.getItem("casharrowToken"); }

  function patchDepositButton() {
    const button = document.getElementById("submitDepositButton");
    if (!button || button.dataset.mobileMoneyPatched === "1") return;
    button.dataset.mobileMoneyPatched = "1";
    button.onclick = startAutomaticDeposit;
  }

  async function startAutomaticDeposit() {
    const amount = Number(document.getElementById("depositAmount")?.value);
    const network = document.getElementById("depositNetwork")?.value;
    const account = document.getElementById("depositAccount")?.value?.trim();
    const status = document.getElementById("depositStatus");

    if (!status) return;
    status.textContent = "Starting secure Mobile Money payment…";

    try {
      const response = await fetch("/api/mobile-money/deposit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ amount, network, account })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        status.textContent = data.message || "Unable to start the payment.";
        return;
      }

      status.textContent = data.message || "Payment request sent. Check your phone.";
      if (data.depositId) watchDeposit(data.depositId, status);
    } catch (_) {
      status.textContent = "Unable to connect to CashArrow. No payment was started.";
    }
  }

  async function watchDeposit(depositId, statusElement) {
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      if (attempts > 30) return;

      try {
        const response = await fetch(`/api/mobile-money/deposit/${depositId}/status`, {
          headers: { Authorization: `Bearer ${token()}` }
        });
        const data = await response.json().catch(() => ({}));

        if (data.status === "approved") {
          statusElement.textContent = "✅ Payment confirmed. Your CashArrow balance has been credited.";
          window.dispatchEvent(new Event("casharrow:wallet-updated"));
          if (typeof window.loadWallet === "function") window.loadWallet();
          return;
        }
        if (data.status === "failed") {
          statusElement.textContent = "❌ Payment was not completed. Your CashArrow balance was not credited.";
          return;
        }
      } catch (_) {}

      setTimeout(check, 5000);
    };
    setTimeout(check, 5000);
  }

  function install() {
    patchDepositButton();
    new MutationObserver(patchDepositButton).observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
  else install();
})();
