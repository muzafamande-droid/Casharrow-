const express = require("express");
const fs = require("fs");
const path = require("path");
const db = require("./database-pg");
const accountPg = require("./account-pg-routes");
const memberPg = require("./member-pg-routes");
const rental = require("./rental-routes");
const withdrawal = require("./withdrawal-routes");
const mobileMoney = require("./mobile-money-sandbox-routes");
const pgFinancial = require("./pg-financial-routes");
const adminProducts = require("./admin-product-routes");
const { startRentalExpiryWorker } = require("./rental-expiry-worker");

const app = express();
const PORT = Number(process.env.PORT || 3000);

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL environment variable is not configured");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

app.disable("x-powered-by");
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: true, limit: "256kb" }));

app.get("/member.html", (req, res) => {
  try {
    const file = path.join(__dirname, "public", "member.html");
    let html = fs.readFileSync(file, "utf8");
    html = html.replaceAll("CashArrow", "AVEILOT");
    const scripts = '<script src="/rental-catalog.js?v=photos7"></script><script src="/aveilot-machine-catalog-fix.js?v=3"></script><script src="/aveilot-real-machine-photos.js?v=2"></script><script src="/aveilot-withdrawal-fee.js?v=2"></script>';
    html = html.replace("</body>", `${scripts}</body>`);
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.type("html").send(html);
  } catch (error) {
    console.error("AVEILOT member dashboard failed to load:", error);
    res.status(500).send("Unable to load member dashboard");
  }
});

app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/api/status", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ success: true, message: "AVEILOT server is running", database: "connected", environment: process.env.NODE_ENV || "development" });
  } catch (error) {
    console.error("Health check failed:", error);
    res.status(503).json({ success: false, message: "AVEILOT database is unavailable" });
  }
});

app.use("/api", accountPg.router);
app.use("/api", memberPg.router);
app.use("/api", pgFinancial.router);
app.use("/api", rental.router);
app.use("/api", withdrawal.router);
app.use("/api", mobileMoney.router);
app.use("/api", adminProducts.router);

app.get("/", (req, res) => {
  const file = path.join(__dirname, "public", "index.html");
  let html = fs.readFileSync(file, "utf8");
  const scripts = '<script src="/member-dashboard-v2.js?v=14"></script><script src="/member-dashboard-boot.js?v=3"></script><script src="/casharrow-ui-fixes.js?v=5"></script><script src="/rental-catalog.js?v=photos7"></script><script src="/aveilot-machine-catalog-fix.js?v=3"></script><script src="/aveilot-real-machine-photos.js?v=2"></script><script src="/casharrow-auth-ux.js?v=1"></script><script src="/aveilot-withdrawal-fee.js?v=2"></script>';
  html = html.replace("</body>", `${scripts}</body>`);
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  res.type("html").send(html);
});

app.use((req, res) => res.status(404).json({ success: false, message: "Endpoint not found" }));

async function start() {
  await db.init();
  await rental.ready();
  app.listen(PORT, () => {
    console.log(`AVEILOT production server listening on port ${PORT}`);
  });
  startRentalExpiryWorker();
}

if (require.main === module) {
  start().catch(error => {
    console.error("AVEILOT startup failed:", error);
    process.exit(1);
  });
}

module.exports = app;
