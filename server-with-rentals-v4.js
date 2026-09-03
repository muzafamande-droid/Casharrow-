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

// PostgreSQL is the only operational source of truth. Remove legacy SQLite
// routes before mounting the durable PostgreSQL implementations.
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

// Keep homepage bootstrapping in one place. server.js already injects the
// enhancement script; this wrapper only adds the guest guard and the single
// authoritative rental catalog. No second rental renderer is loaded.
const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    const guestBootstrapStyle = '<style id="casharrowGuestBootstrap">body.ca-prelogin .container>.balance,body.ca-prelogin .container>.section,body.ca-prelogin #todayTasks,body.ca-prelogin #rewardsSection,body.ca-prelogin #teamSection,body.ca-prelogin #withdrawSection,body.ca-prelogin #userTransactions,body.ca-prelogin .bottom{display:none!important}</style>';
    const guestBootstrapScript = '<script>try{if(!localStorage.getItem("casharrowToken"))document.body.classList.add("ca-prelogin")}catch(e){}</script>';
    body = body.replace("</head>", `${guestBootstrapStyle}</head>`);
    // Insert the bootstrap script inside the opening body tag. The previous
    // replacement could create malformed HTML when <body> had attributes.
    body = body.replace(/<body(\b[^>]*)>/i, `<body$1>${guestBootstrapScript}`);
    body = body.replace(/<script src="\/casharrow-enhancements\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=clean5"></script>');
    body = body.replace(/\s*<script src="\/rental-ui\.js[^>]*><\/script>/g, "");
    body = body.replace("</body>", '  <script src="/rental-catalog.js?v=final3"></script></body>');
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
