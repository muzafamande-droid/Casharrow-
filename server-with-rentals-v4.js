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
// enhancement script. The server also supplies a static rental fallback so
// the series cannot disappear when client-side JavaScript fails or is cached.
const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    const guestBootstrapStyle = '<style id="casharrowGuestBootstrap">body.ca-prelogin .container>.balance,body.ca-prelogin .container>.section,body.ca-prelogin #todayTasks,body.ca-prelogin #rewardsSection,body.ca-prelogin #teamSection,body.ca-prelogin #withdrawSection,body.ca-prelogin #userTransactions,body.ca-prelogin .bottom{display:none!important}</style>';
    const guestBootstrapScript = '<script>try{if(!localStorage.getItem("casharrowToken"))document.body.classList.add("ca-prelogin")}catch(e){}</script>';
    const rentalFallbackStyle = '<style id="casharrowRentalFallbackStyle">.ca-static-rentals{margin-top:24px}.ca-static-rentals h2{font-size:20px;margin-bottom:4px}.ca-static-rentals .lead{font-size:13px;color:#718096;margin-bottom:12px}.ca-static-series{margin-bottom:10px;background:#fff;border:1px solid #dce7f8;border-radius:16px;overflow:hidden}.ca-static-series summary{cursor:pointer;list-style:none;padding:14px 16px;font-weight:800;color:#0757e8;display:flex;justify-content:space-between}.ca-static-series summary::-webkit-details-marker{display:none}.ca-static-products{padding:0 14px 8px}.ca-static-product{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 2px;border-top:1px solid #edf1f6;font-size:13px}.ca-static-product b{font-size:14px}.ca-static-product span{color:#718096;font-size:12px;text-align:right}.ca-static-rent-btn{display:inline-block;margin-top:6px;padding:7px 10px;border-radius:9px;background:#0757e8;color:#fff;font-weight:700;font-size:11px;text-decoration:none}@media(max-width:480px){.ca-static-product{align-items:flex-start}.ca-static-product span{text-align:right}}</style>';
    const rentalFallback = `<section id="casharrowStaticRentals" class="ca-static-rentals"><h2>🏹 Rental Products</h2><p class="lead">Choose a CashArrow series. Select a product to view its rental terms.</p><details class="ca-static-series" open><summary>A Series <span>18 days · 5 products</span></summary><div class="ca-static-products"><div class="ca-static-product"><b>A1</b><span>UGX 30,000 → UGX 45,000<br>18 days</span></div><div class="ca-static-product"><b>A2</b><span>UGX 70,000 → UGX 250,000<br>18 days</span></div><div class="ca-static-product"><b>A3</b><span>UGX 100,000 → UGX 400,000<br>18 days</span></div><div class="ca-static-product"><b>A4</b><span>UGX 150,000 → UGX 600,000<br>18 days</span></div><div class="ca-static-product"><b>A5</b><span>UGX 200,000 → UGX 850,000<br>18 days</span></div></div></details><details class="ca-static-series"><summary>B Series <span>28 days · 5 products</span></summary><div class="ca-static-products"><div class="ca-static-product"><b>B1</b><span>UGX 40,000 → UGX 240,000<br>28 days</span></div><div class="ca-static-product"><b>B2</b><span>UGX 80,000 → UGX 600,000<br>28 days</span></div><div class="ca-static-product"><b>B3</b><span>UGX 100,000 → UGX 1,280,000<br>28 days</span></div><div class="ca-static-product"><b>B4</b><span>UGX 250,000 → UGX 3,040,000<br>28 days</span></div><div class="ca-static-product"><b>B5</b><span>UGX 450,000 → UGX 4,150,000<br>28 days</span></div></div></details><details class="ca-static-series"><summary>C Series <span>100 days · 5 products</span></summary><div class="ca-static-products"><div class="ca-static-product"><b>C1</b><span>UGX 100,000 → UGX 1,200,000<br>100 days</span></div><div class="ca-static-product"><b>C2</b><span>UGX 250,000 → UGX 2,080,000<br>100 days</span></div><div class="ca-static-product"><b>C3</b><span>UGX 400,000 → UGX 4,450,000<br>100 days</span></div><div class="ca-static-product"><b>C4</b><span>UGX 500,000 → UGX 6,800,000<br>100 days</span></div><div class="ca-static-product"><b>C5</b><span>UGX 800,000 → UGX 11,250,000<br>100 days</span></div></div></details><details class="ca-static-series"><summary>D Series <span>120 days · 5 products</span></summary><div class="ca-static-products"><div class="ca-static-product"><b>D1</b><span>UGX 200,000 → UGX 4,000,000<br>120 days</span></div><div class="ca-static-product"><b>D2</b><span>UGX 350,000 → UGX 6,500,000<br>120 days</span></div><div class="ca-static-product"><b>D3</b><span>UGX 500,000 → UGX 8,000,000<br>120 days</span></div><div class="ca-static-product"><b>D4</b><span>UGX 850,000 → UGX 18,050,000<br>120 days</span></div><div class="ca-static-product"><b>D5</b><span>UGX 1,000,000 → UGX 22,000,000<br>120 days</span></div></div></details></section>`;
    body = body.replace("</head>", `${guestBootstrapStyle}${rentalFallbackStyle}</head>`);
    body = body.replace(/<body(\b[^>]*)>/i, `<body$1>${guestBootstrapScript}`);
    // Place a server-rendered fallback immediately after the main container.
    if (!body.includes('id="casharrowStaticRentals"')) {
      body = body.replace(/<\/main>/i, `</main>${rentalFallback}`);
    }
    body = body.replace(/<script src="\/casharrow-enhancements\.js"><\/script>/g, '<script src="/casharrow-enhancements.js?v=clean6"></script>');
    body = body.replace(/\s*<script src="\/rental-ui\.js[^>]*><\/script>/g, "");
    body = body.replace("</body>", '  <script src="/rental-catalog.js?v=final4"></script></body>');
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
