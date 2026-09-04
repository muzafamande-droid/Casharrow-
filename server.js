const app = require("./server-production");
const db = require("./database-pg");
const rental = require("./rental-routes");
const { startRentalExpiryWorker } = require("./rental-expiry-worker");

const PORT = Number(process.env.PORT || 3000);

async function start() {
  await db.init();
  await rental.ready();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CashArrow production server listening on port ${PORT}`);
  });
  startRentalExpiryWorker();
}

start().catch(error => {
  console.error("CashArrow startup failed:", error);
  process.exit(1);
});
