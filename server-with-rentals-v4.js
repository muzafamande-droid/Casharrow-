const app = require("./server");
const db = require("./database");
const pgDb = require("./database-pg");
const accountPg = require("./account-pg-routes");
const memberPg = require("./member-pg-routes");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-sandbox-routes");
const pgFinancial = require("./pg-financial-routes");

const PORT = process.env.PORT || 3000;

// PostgreSQL is the only operational source of truth. Remove every legacy
// SQLite route before mounting the durable PostgreSQL implementations.
if (app._router && Array.isArray(app._router.stack)) {
  const retiredRoutes = new Set([
    "/api/register", "/api/login", "/api/admin", "/api/admin/dashboard", "/api/admin/users",
    "/api/wallet", "/api/transactions", "/api/deposits", "/api/withdrawals",
    "/api/admin/deposits", "/api/admin/deposits/:id/approve", "/api/admin/withdrawals",
    "/api/admin/withdrawals/:id/approve", "/api/admin/withdrawals/:id/reject",
    "/api/tasks", "/api/tasks/:id/claim", "/api/rewards", "/api/rewards/:id/claim", "/api/team"
  ]);
  app._router.stack = app._router.stack.filter(layer => !layer.route || !retiredRoutes.has(layer.route.path));
}

app.use("/api", accountPg.router);
app.use("/api", memberPg.router);
app.use("/api", pgFinancial.router);
app.use("/api", rental.router);
app.use("/api", withdrawal.router);
app.use("/api", mobileMoney.router);

const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(/<script src="\/casharrow-enhancements\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=clean1"></script>');
    body = body.replace("</body>", '  <script src="/rental-ui.js?v=clean1"></script><script src="/account-button-fix.js?v=1"></script><script src="/mobile-money-ui.js?v=auto-mm4"></script></body>');
  }
  return originalSend.call(this, body);
};

async function start() {
  await db.ready;
  await pgDb.init();
  await rental.ready();
  app.listen(PORT, () => console.log(`CashArrow is running on port ${PORT}`));
}

start().catch(error => {
  console.error("CashArrow startup failed:", error);
  process.exit(1);
});
