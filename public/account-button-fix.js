(() => {
  function openLogin() {
    if (typeof window.openModal === "function") {
      window.openModal("login");
    }
  }

  function fixCashArrowButtons() {
    // The guest Login button must always open the login modal.
    document.addEventListener("click", (event) => {
      const loginButton = event.target.closest(".casharrow-guest-actions button.secondary");
      if (loginButton) {
        event.preventDefault();
        event.stopImmediatePropagation();
        openLogin();
        return;
      }

      const navs = document.querySelectorAll(".bottom .nav");
      const account = navs[navs.length - 1];
      if (!account || !account.contains(event.target)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      const token = localStorage.getItem("casharrowToken");
      if (token) {
        if (typeof window.handleAccountAction === "function") {
          window.handleAccountAction();
        } else if (confirm("Log out of CashArrow?")) {
          localStorage.removeItem("casharrowToken");
          localStorage.removeItem("casharrowUser");
          sessionStorage.removeItem("casharrowPendingReferral");
          window.location.reload();
        }
        return;
      }

      openLogin();
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fixCashArrowButtons, { once: true });
  } else {
    fixCashArrowButtons();
  }
})();
