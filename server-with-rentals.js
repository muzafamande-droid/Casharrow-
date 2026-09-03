const app = require("./server");
const db = require("./database");
const rental = require("./rental-routes");

const PORT = process.env.PORT || 3000;

app.use("/api", rental.router);

async function start() {
  await db.ready;
  await rental.ready();
  app.listen(PORT, () => {
    console.log(`CashArrow is running on port ${PORT}`);
  });
}

start().catch(error => {
  console.error("CashArrow startup failed:", error);
  process.exit(1);
});
