(() => {
  function fixAccountButton() {
    document.addEventListener("click", (event) => {
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

      if (typeof window.openModal === "function") {
        window.openModal("login");
      }
    }, true);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fixAccountButton, { once: true });
  } else {
    fixAccountButton();
  }
})();
