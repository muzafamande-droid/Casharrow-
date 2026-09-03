const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    req.rentalUser = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

async function ensurePgSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT PRIMARY KEY,
      series TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      rental_fee NUMERIC(18,2) NOT NULL DEFAULT 0,
      rental_days INTEGER NOT NULL DEFAULT 0,
      return_amount NUMERIC(18,2),
      active BOOLEAN NOT NULL DEFAULT FALSE,
      featured BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS rentals (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      rental_fee NUMERIC(18,2) NOT NULL,
      rental_days INTEGER NOT NULL,
      start_at TIMESTAMPTZ NOT NULL,
      end_at TIMESTAMPTZ NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      return_amount NUMERIC(18,2),
      completed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE SEQUENCE IF NOT EXISTS casharrow_products_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_rentals_id_seq;
    CREATE INDEX IF NOT EXISTS idx_rentals_user ON rentals(user_id);
    CREATE INDEX IF NOT EXISTS idx_rentals_status_end ON rentals(status, end_at);
  `);

  const products = await db.query("SELECT id FROM products LIMIT 1");
  if (products.rowCount === 0) {
    for (const series of ["A", "B", "C", "D"]) {
      for (let i = 1; i <= 5; i += 1) {
        const code = `${series}${i}`;
        await db.query(`
          INSERT INTO products (id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured)
          VALUES (nextval('casharrow_products_id_seq'), $1, $2, $3, $4, $5, 0, 0, NULL, FALSE, $6)
          ON CONFLICT (code) DO NOTHING
        `, [
          series,
          code,
          `CashArrow Generator ${code}`,
          `${series} Series generator rental product ${code}. Full specifications and verified rental terms will be published before activation.`,
          "/product-placeholder.svg",
          i === 1
        ]);
      }
    }
  }

  const maxProduct = await db.query("SELECT MAX(id) AS max_id FROM products");
  if (maxProduct.rows[0].max_id !== null) {
    await db.query("SELECT setval('casharrow_products_id_seq', $1, true)", [Number(maxProduct.rows[0].max_id)]);
  }
  const maxRental = await db.query("SELECT MAX(id) AS max_id FROM rentals");
  if (maxRental.rows[0].max_id !== null) {
    await db.query("SELECT setval('casharrow_rentals_id_seq', $1, true)", [Number(maxRental.rows[0].max_id)]);
  }
}

async function createRental({ userId, productId }) {
  return db.transaction(async client => {
    const productResult = await client.query("SELECT * FROM products WHERE id = $1 FOR SHARE", [productId]);
    if (!productResult.rowCount) return { status: 404, message: "Product not found" };
    const product = productResult.rows[0];
    if (!product.active) return { status: 409, message: "This product is not available for rental yet" };
    if (Number(product.rental_fee) <= 0 || Number(product.rental_days) <= 0 || product.return_amount === null) {
      return { status: 409, message: "Rental terms are not configured yet" };
    }

    const userResult = await client.query("SELECT id, balance, wallet, reserved_balance FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!userResult.rowCount) return { status: 404, message: "User not found" };
    const user = userResult.rows[0];
    const fee = Number(product.rental_fee);
    const balance = Number(user.balance);
    const wallet = Number(user.wallet);
    const reserved = Number(user.reserved_balance || 0);
    if (balance < fee || wallet < fee) return { status: 400, message: "Insufficient balance" };

    const start = new Date();
    const end = new Date(start.getTime() + Number(product.rental_days) * 86400000);
    const rental = await client.query(`
      INSERT INTO rentals (id, user_id, product_id, rental_fee, rental_days, start_at, end_at, status, return_amount)
      VALUES (nextval('casharrow_rentals_id_seq'), $1, $2, $3, $4, $5, $6, 'active', $7)
      RETURNING id, end_at
    `, [userId, product.id, fee, product.rental_days, start.toISOString(), end.toISOString(), product.return_amount]);

    await client.query(`UPDATE users SET balance = balance - $1, wallet = wallet - $1 WHERE id = $2`, [fee, userId]);
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, reference, date)
      VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Fee', $2, $3, NOW())
    `, [userId, -fee, `rental:${rental.rows[0].id}`]);

    return { ok: true, rentalId: Number(rental.rows[0].id), endAt: rental.rows[0].end_at };
  });
}

async function completeRental({ userId, rentalId }) {
  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM rentals WHERE id = $1 AND user_id = $2 FOR UPDATE", [rentalId, userId]);
    if (!result.rowCount) return { status: 404, message: "Rental not found" };
    const rental = result.rows[0];
    if (rental.status === "completed") return { status: 409, message: "Rental already completed" };
    if (rental.status !== "active") return { status: 409, message: "Rental cannot be completed" };
    if (new Date(rental.end_at).getTime() > Date.now()) return { status: 409, message: "Rental period has not ended yet" };
    if (rental.return_amount === null) return { status: 409, message: "Return terms are not configured" };

    const amount = Number(rental.return_amount);
    await client.query("UPDATE rentals SET status = 'completed', completed_at = NOW() WHERE id = $1", [rentalId]);
    await client.query("UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2", [amount, userId]);
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, reference, date)
      VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Return', $2, $3, NOW())
    `, [userId, amount, `rental-return:${rentalId}`]);

    return { ok: true, amount };
  });
}

router.get("/products", async (req, res) => {
  try {
    await ensurePgSchema();
    const result = await db.query(`SELECT id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured FROM products ORDER BY series, id`);
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error("Products failed:", error);
    res.status(500).json({ success: false, message: "Unable to load products" });
  }
});

router.get("/products/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid product ID" });
  try {
    await ensurePgSchema();
    const result = await db.query(`SELECT id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured FROM products WHERE id = $1`, [id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error("Product details failed:", error);
    res.status(500).json({ success: false, message: "Unable to load product" });
  }
});

router.get("/rentals", authenticate, async (req, res) => {
  try {
    await ensurePgSchema();
    const result = await db.query(`
      SELECT r.id, r.product_id, p.code, p.name, r.rental_fee, r.rental_days, r.start_at, r.end_at, r.status, r.return_amount, r.completed_at, r.created_at
      FROM rentals r JOIN products p ON p.id = r.product_id
      WHERE r.user_id = $1 ORDER BY r.id DESC
    `, [req.rentalUser.id]);
    res.json({ success: true, rentals: result.rows });
  } catch (error) {
    console.error("Rentals failed:", error);
    res.status(500).json({ success: false, message: "Unable to load rentals" });
  }
});

router.post("/rentals", authenticate, async (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isInteger(productId) || productId <= 0) return res.status(400).json({ success: false, message: "Invalid product" });
  try {
    await ensurePgSchema();
    const result = await createRental({ userId: req.rentalUser.id, productId });
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });
    res.status(201).json({ success: true, message: "Rental created successfully", rentalId: result.rentalId, endAt: result.endAt });
  } catch (error) {
    console.error("Rental creation failed:", error);
    res.status(500).json({ success: false, message: "Unable to create rental" });
  }
});

router.post("/rentals/:id/complete", authenticate, async (req, res) => {
  const rentalId = Number(req.params.id);
  if (!Number.isInteger(rentalId) || rentalId <= 0) return res.status(400).json({ success: false, message: "Invalid rental ID" });
  try {
    await ensurePgSchema();
    const result = await completeRental({ userId: req.rentalUser.id, rentalId });
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });
    res.json({ success: true, message: "Rental completed and return processed", amount: result.amount });
  } catch (error) {
    console.error("Rental completion failed:", error);
    res.status(500).json({ success: false, message: "Unable to complete rental" });
  }
});

module.exports = { router, ready: ensurePgSchema };
