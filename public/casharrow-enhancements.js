(() => {
  if (window.__casharrowEnhancementsLoaded) return;
  window.__casharrowEnhancementsLoaded = true;

  const token = () => localStorage.getItem("casharrowToken");

  const style = document.createElement("style");
  style.textContent = `
    .casharrow-deposit{display:none;margin-top:24px}
    .casharrow-deposit .deposit-note{color:#7b8494;font-size:13px;line-height:1.45;margin:8px 0 16px}
    .casharrow-deposit .deposit-status{font-size:13px;margin-top:10px;min-height:18px}
    #userWallet .actions{grid-template-columns:repeat(3,1fr)}
    .bottom{background:linear-gradient(135deg,#06142f 0%,#0a2c67 50%,#087cff 100%) !important;border-top:1px solid rgba(255,255,255,.16)!important;box-shadow:0 -10px 28px rgba(7,48,112,.22)!important}
    .bottom .nav{color:rgba(255,255,255,.78)!important}
    .bottom .nav.active{color:#fff!important;background:rgba(255,255,255,.16)!important}
    .bottom .nav div{filter:drop-shadow(0 2px 5px rgba(0,0,0,.18))}
    @media(max-width:420px){#userWallet .actions{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);

  function addConfirmPassword() {
    const password = document.getElementById("registerPassword");
    if (!password || document.getElementById("registerConfirmPassword")) return;

    const confirm = document.createElement("input");
    confirm.id = "registerConfirmPassword";
    confirm.type = "password";
    confirm.placeholder = "Confirm password";
    password.insertAdjacentElement("afterend", confirm);
  }

  function addDepositUI() {
    if (document.getElementById("casharrowDeposit")) return;

    const wallet = document.getElementById("userWallet");
    if (!wallet) return;

    const actions = wallet.querySelector(".actions");
    if (actions) {
      const button = document.createElement("button");
      button.className = "primary";
      button.type = "button";
      button.textContent = "💳 Deposit";
      button.onclick = openDeposit;
      actions.insertBefore(button, actions.firstChild);
    }

    const section = document.createElement("section");
    section.className = "balance casharrow-deposit";
    section.id = "casharrowDeposit";
    section.innerHTML = `
      <small>💳 Deposit Funds</small>
      <h2 style="margin:12px 0 8px;">Add money to your CashArrow wallet</h2>
      <p class="deposit-note">Submit your Mobile Money payment details here. Your balance is only credited after the deposit is verified and approved by CashArrow.</p>
      <input type="number" id="depositAmount" placeholder="Amount (UGX)" min="1">
      <select id="depositNetwork">
        <option value="">Select network</option>
        <option value="MTN">MTN Mobile Money</option>
        <option value="Airtel">Airtel Money</option>
      </select>
      <input type="text" id="depositAccount" placeholder="Mobile Money phone number">
      <div class="actions">
        <button class="primary" type="button" id="submitDepositButton">Submit Deposit</button>
        <button class="secondary" type="button" id="closeDepositButton">Cancel</button>
      </div>
      <div class="deposit-status" id="depositStatus"></div>
    `;

    wallet.insertAdjacentElement("afterend", section);
    document.getElementById("submitDepositButton").onclick = submitDeposit;
    document.getElementById("closeDepositButton").onclick = closeDeposit;
  }

  function showDeposit() {
    const section = document.getElementById("casharrowDeposit");
    if (section) section.style.display = "block";
  }

  function openDeposit() {
    if (!token()) {
      openModal("login");
      return;
    }
    showDeposit();
    document.getElementById("casharrowDeposit")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function closeDeposit() {
    const section = document.getElementById("casharrowDeposit");
    if (section) section.style.display = "none";
  }

  async function submitDeposit() {
    const authToken = token();
    if (!authToken) {
      openModal("login");
      return;
    }

    const amount = Number(document.getElementById("depositAmount").value);
    const network = document.getElementById("depositNetwork").value;
    const account = document.getElementById("depositAccount").value.trim();
    const status = document.getElementById("depositStatus");

    if (!Number.isFinite(amount) || amount <= 0) {
      status.textContent = "Enter a valid deposit amount.";
      status.style.color = "#c62828";
      return;
    }
    if (!network) {
      status.textContent = "Please select MTN or Airtel.";
      status.style.color = "#c62828";
      return;
    }
    if (!account) {
      status.textContent = "Enter your Mobile Money number.";
      status.style.color = "#c62828";
      return;
    }

    status.textContent = "Submitting deposit request...";
    status.style.color = "#1769ff";

    try {
      const response = await fetch("/api/deposits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + authToken
        },
        body: JSON.stringify({ amount, network, account })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        status.textContent = data.message || "Deposit request failed.";
        status.style.color = "#c62828";
        return;
      }

      status.textContent = "✅ Deposit request submitted. Your balance will update after approval.";
      status.style.color = "#0a8f52";
      document.getElementById("depositAmount").value = "";
      document.getElementById("depositAccount").value = "";
      document.getElementById("depositNetwork").value = "";
    } catch (error) {
      status.textContent = "Unable to connect to CashArrow server.";
      status.style.color = "#c62828";
    }
  }

  function addLogoutControl() {
    const navs = document.querySelectorAll(".bottom .nav");
    const accountNav = navs[navs.length - 1];
    if (!accountNav) return;
    accountNav.onclick = handleAccountAction;
    const label = accountNav.childNodes[accountNav.childNodes.length - 1];
    if (label && label.nodeType === Node.TEXT_NODE) {
      label.textContent = token() ? "Logout" : "Account";
    }
  }

  function handleAccountAction() {
    if (token()) {
      if (confirm("Log out of CashArrow?")) logout();
      return;
    }
    openModal("login");
  }

  function logout() {
    localStorage.removeItem("casharrowToken");
    localStorage.removeItem("casharrowUser");
    sessionStorage.removeItem("casharrowPendingReferral");
    window.location.reload();
  }

  const originalRegister = window.register;
  if (typeof originalRegister === "function") {
    window.register = async function () {
      const password = document.getElementById("registerPassword")?.value || "";
      const confirmPassword = document.getElementById("registerConfirmPassword")?.value || "";

      if (!confirmPassword) {
        showMessage("registerMessage", "Please confirm your password.");
        return;
      }
      if (password !== confirmPassword) {
        showMessage("registerMessage", "Passwords do not match.");
        return;
      }

      return originalRegister();
    };
  }

  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, init = {}) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.endsWith("/api/register") && init.body) {
      try {
        const body = JSON.parse(init.body);
        body.confirmPassword = document.getElementById("registerConfirmPassword")?.value || "";
        init = { ...init, body: JSON.stringify(body) };
      } catch (error) {
        // Keep the original request untouched if its body is not JSON.
      }
    }
    return originalFetch(input, init);
  };

  document.addEventListener("DOMContentLoaded", () => {
    addConfirmPassword();
    addDepositUI();
    addLogoutControl();

    if (token()) {
      setTimeout(showDeposit, 0);
    }
  });
})();
