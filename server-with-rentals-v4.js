const app = require("./server");
const db = require("./database");
const pgDb = require("./database-pg");
const accountPg = require("./account-pg-routes");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-sandbox-routes");
const pgFinancial = require("./pg-financial-routes");

const PORT = process.env.PORT || 3000;

// Retire legacy SQLite account and financial endpoints. PostgreSQL is now the
// source of truth for authentication, users, wallet, and money movements.
if (app._router && Array.isArray(app._router.stack)) {
  const retiredRoutes = new Set([
    "/api/register",
    "/api/login",
    "/api/admin",
    "/api/admin/dashboard",
    "/api/admin/users",
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

// Durable PostgreSQL account, financial, rental, and Mobile Money APIs.
app.use("/api", accountPg.router);
app.use("/api", pgFinancial.router);
app.use("/api", rental.router);
app.use("/api", withdrawal.router);
app.use("/api", mobileMoney.router);

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(/<script src="\/casharrow-enhancements\\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=clean1"></script>');
    body = body.replace("</body>", '  <script src="/rental-ui.js?v=clean1"></script><script src="/account-button-fix.js?v=1"></script><script src="/mobile-money-ui.js?v=auto-mm4"></script></body>');
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
