const app = require("./server");
const db = require("./database");
const rental = require("./rental-routes");

const PORT = process.env.PORT || 3000;

app.use("/api", rental.router);

// Load the dynamic rental interface after the existing CashArrow enhancements.
// Wrapping res.send keeps the existing authentication/wallet UI untouched.
app.use((req, res, next) => {
  const originalSend = res.send.bind(res);
  res.send = body => {
    if (req.path === "/" && typeof body === "string" && body.includes("</body>")) {
      body = body.replace(
        "</body>",
        '  <script src="/rental-ui.js"></script>\n</body>'
      );
    }
    return originalSend(body);
  };
  next();
});

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
