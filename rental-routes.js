const express = require("express");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");
const { Pool } = require("pg");
const db = require("./database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const sqlite = new Database(
  process.env.DATABASE_PATH || path.join(__dirname, "casharrow.db")
);
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false
    })
  : null;

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    rental_fee REAL NOT NULL DEFAULT 0,
    rental_days INTEGER NOT NULL DEFAULT 0,
    return_amount REAL,
    active INTEGER NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    rental_fee REAL NOT NULL,
    rental_days INTEGER NOT NULL,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    return_amount REAL,
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

const catalog = [];
for (const series of ["A", "B", "C", "D"]) {
  for (let i = 1; i <= 5; i += 1) {
    const code = `${series}${i}`;
    catalog.push({
      series,
      code,
      name: `CashArrow Generator ${code}`,
      description:
        `${series} Series generator rental product ${code}. ` +
        "Full specifications and verified rental terms will be published before activation.",
      image_url: "/product-placeholder.svg",
      rental_fee: 0,
      rental_days: 0,
      return_amount: null,
      active: 0,
      featured: i === 1 ? 1 : 0
    });
  }
}

const insertProduct = sqlite.prepare(`
  INSERT OR IGNORE INTO products
  (series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
for (const product of catalog) {
  insertProduct.run(
    product.series,
    product.code,
    product.name,
    product.description,
    product.image_url,
    product.rental_fee,
    product.rental_days,
    product.return_amount,
    product.active,
    product.featured
  );
}

async function ensurePgSchema() {
  if (!pool) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id BIGINT PRIMARY KEY,
      series TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      rental_fee DOUBLE PRECISION NOT NULL DEFAULT 0,
      rental_days BIGINT NOT NULL DEFAULT 0,
      return_amount DOUBLE PRECISION,
      active BIGINT NOT NULL DEFAULT 0,
      featured BIGINT NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rentals (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      rental_fee DOUBLE PRECISION NOT NULL,
      rental_days BIGINT NOT NULL,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      return_amount DOUBLE PRECISION,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const localProducts = sqlite.prepare("SELECT * FROM products").all();
  for (const product of localProducts) {
    await pool.query(
      `INSERT INTO products
       (id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET
         series=EXCLUDED.series,
         code=EXCLUDED.code,
         name=EXCLUDED.name,
         description=EXCLUDED.description,
         image_url=EXCLUDED.image_url,
         rental_fee=EXCLUDED.rental_fee,
         rental_days=EXCLUDED.rental_days,
         return_amount=EXCLUDED.return_amount,
         active=EXCLUDED.active,
         featured=EXCLUDED.featured`,
      [
        product.id,
        product.series,
        product.code,
        product.name,
        product.description,
        product.image_url,
        product.rental_fee,
        product.rental_days,
        product.return_amount,
        product.active,
        product.featured,
        product.created_at
      ]
    );
  }

  // PostgreSQL is the durable source for rentals on Render. Restore them into
  // the local SQLite connection before serving member rental requests.
  const pgRentals = (await pool.query(`
    SELECT id, user_id, product_id, rental_fee, rental_days,
           start_at, end_at, status, return_amount, completed_at, created_at
    FROM rentals
    ORDER BY id
  `)).rows;

  if (pgRentals.length) {
    sqlite.exec("PRAGMA foreign_keys = OFF");
    sqlite.prepare("DELETE FROM rentals").run();
    const insertRental = sqlite.prepare(`
      INSERT INTO rentals
        (id, user_id, product_id, rental_fee, rental_days, start_at, end_at, status, return_amount, completed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const restore = sqlite.transaction(rows => {
      for (const rental of rows) {
        insertRental.run(
          rental.id,
          rental.user_id,
          rental.product_id,
          rental.rental_fee,
          rental.rental_days,
          rental.start_at,
          rental.end_at,
          rental.status,
          rental.return_amount,
          rental.completed_at,
          rental.created_at
        );
      }
    });
    restore(pgRentals);
    sqlite.exec("PRAGMA foreign_keys = ON");
  } else {
    await syncRentalsToPostgres();
  }
}

async function syncRentalsToPostgres() {
  if (!pool) return;
  const localRentals = sqlite.prepare("SELECT * FROM rentals ORDER BY id").all();
  for (const rental of localRentals) {
    await pool.query(
      `INSERT INTO rentals
       (id,user_id,product_id,rental_fee,rental_days,start_at,end_at,status,return_amount,completed_at,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       ON CONFLICT (id) DO UPDATE SET
         user_id=EXCLUDED.user_id,
         product_id=EXCLUDED.product_id,
         rental_fee=EXCLUDED.rental_fee,
         rental_days=EXCLUDED.rental_days,
         start_at=EXCLUDED.start_at,
         end_at=EXCLUDED.end_at,
         status=EXCLUDED.status,
         return_amount=EXCLUDED.return_amount,
         completed_at=EXCLUDED.completed_at`,
      [
        rental.id,
        rental.user_id,
        rental.product_id,
        rental.rental_fee,
        rental.rental_days,
        rental.start_at,
        rental.end_at,
        rental.status,
        rental.return_amount,
        rental.completed_at,
        rental.created_at
      ]
    );
  }
}

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  try {
    req.rentalUser = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session"
    });
  }
}

router.get("/products", async (req, res) => {
  try {
    await db.ready;
    await ensurePgSchema();
    const products = sqlite.prepare(`
      SELECT id, series, code, name, description, image_url,
             rental_fee, rental_days, return_amount, active, featured
      FROM products
      ORDER BY series, id
    `).all();

    res.json({ success: true, products });
  } catch (error) {
    console.error("Products failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load products"
    });
  }
});

router.get("/rentals", authenticate, (req, res) => {
  const userRentals = sqlite.prepare(`
    SELECT r.id, r.product_id, p.code, p.name,
           r.rental_fee, r.rental_days, r.start_at, r.end_at,
           r.status, r.return_amount, r.completed_at, r.created_at
    FROM rentals r
    JOIN products p ON p.id = r.product_id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `).all(req.rentalUser.id);

  res.json({ success: true, rentals: userRentals });
});

router.post("/rentals", authenticate, async (req, res) => {
  const productId = Number(req.body.productId);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid product"
    });
  }

  try {
    await db.ready;
    const result = db.transaction(() => {
      const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
      if (!product) return { status: 404, message: "Product not found" };
      if (!product.active) {
        return { status: 409, message: "This product is not available for rental yet" };
      }
      if (product.rental_fee <= 0 || product.rental_days <= 0) {
        return { status: 409, message: "Rental terms are not configured yet" };
      }

      const user = db.prepare("SELECT id, balance FROM users WHERE id = ?").get(req.rentalUser.id);
      if (!user) return { status: 404, message: "User not found" };
      if (Number(user.balance) < Number(product.rental_fee)) {
        return { status: 400, message: "Insufficient balance" };
      }

      const start = new Date();
      const end = new Date(start.getTime() + Number(product.rental_days) * 86400000);
      const rental = db.prepare(`
        INSERT INTO rentals
        (user_id, product_id, rental_fee, rental_days, start_at, end_at, status, return_amount)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?)
      `).run(
        req.rentalUser.id,
        product.id,
        product.rental_fee,
        product.rental_days,
        start.toISOString(),
        end.toISOString(),
        product.return_amount
      );

      db.prepare(`
        UPDATE users
        SET balance = balance - ?, wallet = wallet - ?
        WHERE id = ?
      `).run(product.rental_fee, product.rental_fee, req.rentalUser.id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Rental Fee', ?, datetime('now'))
      `).run(req.rentalUser.id, -Number(product.rental_fee));

      return {
        ok: true,
        rentalId: rental.lastInsertRowid,
        endAt: end.toISOString()
      };
    })();

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    await syncRentalsToPostgres();
    res.status(201).json({
      success: true,
      message: "Rental created successfully",
      rentalId: result.rentalId,
      endAt: result.endAt
    });
  } catch (error) {
    console.error("Rental creation failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to create rental"
    });
  }
});

router.post("/rentals/:id/complete", authenticate, async (req, res) => {
  const rentalId = Number(req.params.id);
  if (!Number.isInteger(rentalId) || rentalId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid rental ID"
    });
  }

  try {
    await db.ready;
    const result = db.transaction(() => {
      const rental = db.prepare(`
        SELECT * FROM rentals
        WHERE id = ? AND user_id = ?
      `).get(rentalId, req.rentalUser.id);

      if (!rental) return { status: 404, message: "Rental not found" };
      if (rental.status === "completed") {
        return { status: 409, message: "Rental already completed" };
      }
      if (rental.status !== "active") {
        return { status: 409, message: "Rental cannot be completed" };
      }
      if (new Date(rental.end_at).getTime() > Date.now()) {
        return { status: 409, message: "Rental period has not ended yet" };
      }
      if (rental.return_amount === null || rental.return_amount === undefined) {
        return { status: 409, message: "Return terms are not configured" };
      }

      const update = db.prepare(`
        UPDATE rentals
        SET status = 'completed', completed_at = datetime('now')
        WHERE id = ? AND status = 'active'
      `).run(rentalId);

      if (update.changes !== 1) {
        return { status: 409, message: "Rental was already completed" };
      }

      db.prepare(`
        UPDATE users
        SET balance = balance + ?, wallet = wallet + ?
        WHERE id = ?
      `).run(rental.return_amount, rental.return_amount, req.rentalUser.id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Rental Return', ?, datetime('now'))
      `).run(req.rentalUser.id, rental.return_amount);

      return { ok: true, amount: rental.return_amount };
    })();

    if (!result.ok) {
      return res.status(result.status).json({
        success: false,
        message: result.message
      });
    }

    await syncRentalsToPostgres();
    res.json({
      success: true,
      message: "Rental completed and return processed",
      amount: result.amount
    });
  } catch (error) {
    console.error("Rental completion failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to complete rental"
    });
  }
});

module.exports = {
  router,
  ready: ensurePgSchema
};
