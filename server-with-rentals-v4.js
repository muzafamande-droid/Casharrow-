const app = require("./server");
const db = require("./database");
const pgDb = require("./database-pg");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-sandbox-routes");
const pgFinancial = require("./pg-financial-routes");

const PORT = process.env.PORT || 3000;

// Retire the legacy SQLite financial endpoints. PostgreSQL is the source of
// truth for wallet, deposits, withdrawals, and transaction history.
if (app._router && Array.isArray(app._router.stack)) {
  const retiredRoutes = new Set([
    "/api/wallet",
    "/api/transactions",
    "/api/deposits",
    "/api/withdrawals",
    "/api/admin/deposits",
    "/api/admin/deposits/:id/approve",
    "/api/admin/withdrawals",
    "/api/admin/withdrawals/:id/approve",
    "/api/admin/withdrawals/:id/reject"
  ]);

  app._router.stack = app._router.stack.filter(layer => {
    if (!layer.route) return true;
    return !retiredRoutes.has(layer.route.path);
  });
}

// Durable financial API. Mount before the remaining compatibility routes so
// legacy SQLite handlers cannot capture these endpoints first.
app.use("/api", pgFinancial.router);
app.use("/api", rental.router);
app.use("/api", withdrawal.router);
app.use("/api", mobileMoney.router);

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(/<script src="\/casharrow-enhancements\\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=auto-mm4"></script>');
    body = body.replace("</body>", '  <style>#casharrowMemberProducts.casharrow-member-products{display:none!important}#casharrowGuestHome .casharrow-products{display:none!important}</style><script>(()=>{const r=()=>{document.getElementById("casharrowMemberProducts")?.remove();document.querySelector("#casharrowGuestHome .casharrow-products")?.remove()};document.addEventListener("DOMContentLoaded",r);new MutationObserver(r).observe(document.documentElement,{childList:true,subtree:true})})();</script><script src="/rental-ui.js?v=9377459"></script><script src="/account-button-fix.js?v=1"></script><script src="/mobile-money-ui.js?v=auto-mm4"></script></body>');
  }
  return originalSend.call(this, body);
};

async function start(){
  await db.ready;
  await pgDb.init();
  await rental.ready();
  app.listen(PORT,()=>console.log(`CashArrow is running on port ${PORT}`));
}
start().catch(error=>{console.error("CashArrow startup failed:",error);process.exit(1);});
