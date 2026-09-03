const app = require("./server");
const db = require("./database");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-routes-v2");

const PORT = process.env.PORT || 3000;

app.use("/api", rental.router);
app.use("/api", withdrawal.router);
app.use("/api", mobileMoney.router);

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(/<script src="\/casharrow-enhancements\\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=auto-mm1"></script>');
    body = body.replace(
      "</body>",
      '  <style>#casharrowMemberProducts.casharrow-member-products{display:none!important}#casharrowGuestHome .casharrow-products{display:none!important}</style>\n  <script>\n    (() => {\n      const removeLegacyRentalUI = () => {\n        document.getElementById("casharrowMemberProducts")?.remove();\n        document.querySelector("#casharrowGuestHome .casharrow-products")?.remove();\n      };\n      document.addEventListener("DOMContentLoaded", removeLegacyRentalUI);\n      new MutationObserver(removeLegacyRentalUI).observe(document.documentElement, { childList: true, subtree: true });\n    })();\n  </script>\n  <script src="/rental-ui.js?v=9377459"></script>\n  <script src="/account-button-fix.js?v=1"></script>\n  <script src="/mobile-money-ui.js?v=auto-mm1"></script>\n</body>'
    );
  }
  return originalSend.call(this, body);
};

async function start() {
  await db.ready;
  await rental.ready();
  app.listen(PORT, () => console.log(`CashArrow is running on port ${PORT}`));
}

start().catch(error => {
  console.error("CashArrow startup failed:", error);
  process.exit(1);
});
