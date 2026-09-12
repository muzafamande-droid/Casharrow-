const app = require("./server-production");
const db = require("./database-pg");
const rental = require("./rental-routes");
const rentalEarningsApi = require("./rental-earnings-api");
const { startRentalEarningsWorker } = require("./rental-earnings-worker");

const PORT = Number(process.env.PORT || 3000);

app.use(rentalEarningsApi);

async function start() {
  await db.init();
  await rental.ready();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AVEILOT production server listening on port ${PORT}`);
  });
  startRentalEarningsWorker();
}

start().catch(error => {
  console.error("AVEILOT startup failed:", error);
  process.exit(1);
});
