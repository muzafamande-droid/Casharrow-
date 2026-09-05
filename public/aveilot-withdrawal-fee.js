(() => {
  const FEE_RATE = 0.14;
  const money = n => `UGX ${Number(n || 0).toLocaleString()}`;

  function setup() {
    const input = document.getElementById("withdrawAmount");
    if (!input || input.dataset.aveilotFeeReady === "1") return;
    input.dataset.aveilotFeeReady = "1";

    const note = document.createElement("div");
    note.id = "aveilotWithdrawalQuote";
    note.className = "withdrawal-quote";
    note.style.cssText = "margin-top:9px;padding:12px;border-radius:12px;background:#ecfdf3;border:1px solid #86efac;color:#166534;font-weight:800;display:none";
    input.insertAdjacentElement("afterend", note);

    const update = () => {
      const amount = Number(input.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        note.style.display = "none";
        return;
      }
      const fee = Math.round(amount * FEE_RATE * 100) / 100;
      const payout = Math.round((amount - fee) * 100) / 100;
      note.textContent = `You will receive ${money(payout)}`;
      note.style.display = "block";
    };

    input.addEventListener("input", update);
    update();

    const modal = input.closest(".modal-card");
    const confirmButton = modal?.querySelector("button[onclick=\"submitWithdrawal()\"]");
    if (confirmButton) {
      confirmButton.style.background = "#16a34a";
      confirmButton.style.color = "#fff";
      confirmButton.style.border = "0";
      confirmButton.style.fontWeight = "900";
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
