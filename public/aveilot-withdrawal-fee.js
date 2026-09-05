(() => {
  const FEE_RATE = 0.14;
  const money = n => `UGX ${Number(n || 0).toLocaleString()}`;

  function setup() {
    const input = document.getElementById("withdrawAmount");
    if (!input || input.dataset.aveilotFeeReady === "1") return;
    input.dataset.aveilotFeeReady = "1";

    const note = document.createElement("div");
    note.id = "aveilotWithdrawalQuote";
    note.className = "muted";
    note.style.cssText = "margin-top:9px;padding:10px;border-radius:10px;background:#f7f9fd;border:1px solid #e4eaf3;display:none";
    input.insertAdjacentElement("afterend", note);

    const update = () => {
      const amount = Number(input.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        note.style.display = "none";
        return;
      }
      const fee = Math.round(amount * FEE_RATE * 100) / 100;
      const payout = Math.round((amount - fee) * 100) / 100;
      note.innerHTML = `<b>You request:</b> ${money(amount)}<br><b>Withdrawal fee (14%):</b> ${money(fee)}<br><b>You receive:</b> ${money(payout)}`;
      note.style.display = "block";
    };

    input.addEventListener("input", update);
    update();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", setup, { once: true });
  else setup();
})();
