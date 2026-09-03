const app = require("./server");
const db = require("./database");
const rental = require("./rental-routes");

const PORT = process.env.PORT || 3000;

app.use("/api", rental.router);

// Add the dynamic rental UI to the existing home response without replacing
// the working CashArrow authentication, wallet, deposit or referral UI.
const originalSend = app.response.send;
app.response.send = function (body) {
  if (this.req && this.req.path === "/" && typeof body === "string" && body.includes("</body>")) {
    body = body.replace(
      "</body>",
      '  <style>#casharrowMemberProducts.casharrow-member-products{display:none!important}#casharrowGuestHome .casharrow-products{display:none!important}</style>\n  <script>\n    document.addEventListener("DOMContentLoaded", () => {\n      document.getElementById("casharrowMemberProducts")?.remove();\n      document.querySelector("#casharrowGuestHome .casharrow-products")?.replaceChildren();\n    });\n  </script>\n  <script src="/rental-ui.js"></script>\n</body>'
    );
  }
  return originalSend.call(this, body);
};

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
