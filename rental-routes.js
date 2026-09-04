const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const REFERRAL_COMMISSION_RATE = 0.10;

if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

const RENTAL_POLICY = {
  A: [
    { fee: 30000, returnAmount: 45000, days: 18 },
    { fee: 70000, returnAmount: 250000, days: 18 },
    { fee: 100000, returnAmount: 400000, days: 18 },
    { fee: 150000, returnAmount: 600000, days: 18 },
    { fee: 200000, returnAmount: 850000, days: 18 }
  ],
  B: [
    { fee: 40000, returnAmount: 240000, days: 28 },
    { fee: 80000, returnAmount: 600000, days: 28 },
    { fee: 100000, returnAmount: 1280000, days: 28 },
    { fee: 250000, returnAmount: 3040000, days: 28 },
    { fee: 450000, returnAmount: 4150000, days: 28 }
  ],
  C: [
    { fee: 100000, returnAmount: 1200000, days: 100 },
    { fee: 250000, returnAmount: 2080000, days: 100 },
    { fee: 400000, returnAmount: 4450000, days: 100 },
    { fee: 500000, returnAmount: 6800000, days: 100 },
    { fee: 800000, returnAmount: 11250000, days: 100 }
  ],
  D: [
    { fee: 200000, returnAmount: 4000000, days: 120 },
    { fee: 350000, returnAmount: 6500000, days: 120 },
    { fee: 500000, returnAmount: 8000000, days: 120 },
    { fee: 850000, returnAmount: 18050000, days: 120 },
    { fee: 1000000, returnAmount: 22000000, days: 120 }
  ]
};

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
    ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS rental_id BIGINT REFERENCES rentals(id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_reward_rental ON referral_rewards(rental_id) WHERE rental_id IS NOT NULL;
    CREATE SEQUENCE IF NOT EXISTS casharrow_products_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_rentals_id_seq;
    CREATE INDEX IF NOT EXISTS idx_rentals_user ON rentals(user_id);
    CREATE INDEX IF NOT EXISTS idx_rentals_status_end ON rentals(status, end_at);
  `);

  // Seed only missing catalog records; admin-edited products are preserved.
  for (const [series, terms] of Object.entries(RENTAL_POLICY)) {
    for (let i = 0; i < terms.length; i += 1) {
      const code = `${series}${i + 1}`;
      const term = terms[i];
      await db.query(`
        INSERT INTO products (id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured)
        VALUES (nextval('casharrow_products_id_seq'), $1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9)
        ON CONFLICT (code) DO NOTHING
      `, [
        series,
        code,
        `CashArrow Generator ${code}`,
        `${series} Series generator rental product ${code}. ${term.days}-day rental term.`,
        "/product-placeholder.svg",
        term.fee,
        term.days,
        term.returnAmount,
        i === 0
      ]);
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

    const userResult = await client.query("SELECT id, balance, wallet, reserved_balance, referred_by FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!userResult.rowCount) return { status: 404, message: "User not found" };
    const user = userResult.rows[0];
    const fee = Number(product.rental_fee);
    const balance = Number(user.balance);
    const wallet = Number(user.wallet);
    if (balance < fee || wallet < fee) return { status: 400, message: "Insufficient balance" };

    const priorRental = await client.query("SELECT id FROM rentals WHERE user_id = $1 LIMIT 1", [userId]);
    const isFirstRental = priorRental.rowCount === 0;

    const start = new Date();
    const end = new Date(start.getTime() + Number(product.rental_days) * 86400000);
    const rental = await client.query(`
      INSERT INTO rentals (id, user_id, product_id, rental_fee, rental_days, start_at, end_at, status, return_amount)
      VALUES (nextval('casharrow_rentals_id_seq'), $1, $2, $3, $4, $5, $6, 'active', $7)
      RETURNING id, end_at
    `, [userId, product.id, fee, product.rental_days, start.toISOString(), end.toISOString(), product.return_amount]);

    const rentalId = Number(rental.rows[0].id);

    await client.query(`UPDATE users SET balance = balance - $1, wallet = wallet - $1 WHERE id = $2`, [fee, userId]);
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, reference, date)
      VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Fee', $2, $3, NOW())
    `, [userId, -fee, `rental:${rentalId}`]);

    let referralCommission = 0;
    if (isFirstRental && user.referred_by && Number(user.referred_by) !== Number(userId)) {
      const commission = Math.round(fee * REFERRAL_COMMISSION_RATE * 100) / 100;
      const reward = await client.query(`
        INSERT INTO referral_rewards (id, referrer_id, referred_user_id, amount, rental_id)
        VALUES (nextval('casharrow_referral_rewards_id_seq'), $1, $2, $3, $4)
        ON CONFLICT (referred_user_id) DO NOTHING
        RETURNING id
      `, [user.referred_by, userId, commission, rentalId]);

      if (reward.rowCount) {
        referralCommission = commission;
        await client.query(`
          INSERT INTO team (id, user_id, member_name, earn)
          VALUES (nextval('casharrow_team_id_seq'), $1, (SELECT name FROM users WHERE id = $2), $3)
        `, [user.referred_by, userId, commission]);
        await client.query(`
          UPDATE users
          SET balance = balance + $1, wallet = wallet + $1
          WHERE id = $2
        `, [commission, user.referred_by]);
        await client.query(`
          INSERT INTO transactions (id, user_id, type, amount, reference, date)
          VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Referral Commission', $2, $3, NOW())
        `, [user.referred_by, commission, `referral-rental:${rentalId}`]);
      }
    }

    return {
      ok: true,
      rentalId,
      endAt: rental.rows[0].end_at,
      referralCommission
    };
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
    // Schema and seed data are prepared once during server startup via ready().
    // Keep this hot path read-only so opening Machines stays fast and responsive.
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
    const result = await createRental({ userId: req.rentalUser.id, productId });
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });
    res.status(201).json({
      success: true,
      message: "Rental created successfully",
      rentalId: result.rentalId,
      endAt: result.endAt,
      referralCommission: result.referralCommission
    });
  } catch (error) {
    console.error("Rental creation failed:", error);
    res.status(500).json({ success: false, message: "Unable to create rental" });
  }
});

router.post("/rentals/:id/complete", authenticate, async (req, res) => {
  const rentalId = Number(req.params.id);
  if (!Number.isInteger(rentalId) || rentalId <= 0) return res.status(400).json({ success: false, message: "Invalid rental ID" });
  try {
    const result = await completeRental({ userId: req.rentalUser.id, rentalId });
    if (!result.ok) return res.status(result.status).json({ success: false, message: result.message });
    res.json({ success: true, message: "Rental completed and return processed", amount: result.amount });
  } catch (error) {
    console.error("Rental completion failed:", error);
    res.status(500).json({ success: false, message: "Unable to complete rental" });
  }
});

module.exports = { router, ready: ensurePgSchema };
