const app = require("./server");
const db = require("./database");
const rentals = require("./rental-store");

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

app.get("/api/products", (req, res) => {
  const featured = req.query.featured === "1";
  const active = req.query.active === "1";
  res.json({ success: true, products: rentals.products({ featured, active }) });
});

app.get("/api/products/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }
  const product = rentals.productById(id);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  res.json({ success: true, product });
});

app.get("/api/rentals", auth, (req, res) => {
  res.json({ success: true, rentals: rentals.rentalsForUser(req.user.id) });
});

app.post("/api/rentals", auth, (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid product ID" });
  }

  const product = rentals.productById(productId);
  if (!product) return res.status(404).json({ success: false, message: "Product not found" });
  if (!product.active) return res.status(409).json({ success: false, message: "This rental product is not available yet" });
  if (product.rental_fee <= 0 || product.rental_days <= 0) {
    return res.status(409).json({ success: false, message: "Rental terms are not configured yet" });
  }

  const user = db.prepare("SELECT id, balance FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (Number(user.balance) < Number(product.rental_fee)) {
    return res.status(400).json({ success: false, message: "Insufficient wallet balance" });
  }

  const start = new Date();
  const end = new Date(start.getTime() + Number(product.rental_days) * 86400000);
  const startAt = start.toISOString();
  const endAt = end.toISOString();

  try {
    const result = db.transaction(() => {
      const freshUser = db.prepare("SELECT id, balance FROM users WHERE id = ?").get(req.user.id);
      if (Number(freshUser.balance) < Number(product.rental_fee)) {
        return { error: "Insufficient wallet balance", status: 400 };
      }

      db.prepare("UPDATE users SET balance = balance - ?, wallet = wallet - ? WHERE id = ?")
        .run(product.rental_fee, product.rental_fee, req.user.id);

      const rental = rentals.sqlite.prepare(`
        INSERT INTO rentals
          (user_id, product_id, rental_fee, rental_days, return_amount, start_at, end_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `).run(req.user.id, product.id, product.rental_fee, product.rental_days, product.return_amount, startAt, endAt);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Rental Payment', ?, datetime('now'))
      `).run(req.user.id, -Number(product.rental_fee));

      return { rentalId: rental.lastInsertRowid };
    })();

    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    res.status(201).json({ success: true, message: "Rental started", rentalId: result.rentalId, startAt, endAt });
  } catch (error) {
    console.error("Rental creation failed:", error);
    res.status(500).json({ success: false, message: "Unable to create rental" });
  }
});

async function start() {
  await db.ready;
  await rentals.ensurePostgres();
  const port = process.env.PORT || 3000;
  app.listen(port, () => console.log(`CashArrow is running on port ${port}`));
}

start().catch(error => {
  console.error("CashArrow rental server startup failed:", error);
  process.exit(1);
});
