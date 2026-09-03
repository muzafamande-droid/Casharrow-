const Database = require("better-sqlite3");
const path = require("path");
const { Pool } = require("pg");

const sqlite = new Database(
  process.env.DATABASE_PATH || path.join(__dirname, "casharrow.db")
);
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS rental_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    series TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '/product-placeholder.svg',
    rental_fee REAL DEFAULT 0,
    rental_days INTEGER DEFAULT 0,
    return_amount REAL DEFAULT 0,
    active INTEGER DEFAULT 0,
    featured INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS rentals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    rental_fee REAL NOT NULL,
    rental_days INTEGER NOT NULL,
    return_amount REAL DEFAULT 0,
    start_at TEXT NOT NULL,
    end_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    completed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id, start_at),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES rental_products(id)
  );
`);

const productCount = sqlite.prepare("SELECT COUNT(*) AS count FROM rental_products").get().count;
if (!productCount) {
  const insert = sqlite.prepare(`
    INSERT INTO rental_products
      (series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
  `);
  const seed = sqlite.transaction(() => {
    for (const series of ["A", "B", "C", "D"]) {
      for (let number = 1; number <= 5; number += 1) {
        const code = `${series}${number}`;
        insert.run(
          series,
          code,
          `CashArrow Generator ${code}`,
          `Genuine generator rental product ${code}. Rental terms will be published after verification.`,
          "/product-placeholder.svg",
          number === 1 ? 1 : 0
        );
      }
    }
  });
  seed();
}

async function ensurePostgres() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rental_products (
      id BIGINT PRIMARY KEY,
      series TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      image_url TEXT DEFAULT '/product-placeholder.svg',
      rental_fee DOUBLE PRECISION DEFAULT 0,
      rental_days INTEGER DEFAULT 0,
      return_amount DOUBLE PRECISION DEFAULT 0,
      active BIGINT DEFAULT 0,
      featured BIGINT DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS rentals (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      product_id BIGINT NOT NULL,
      rental_fee DOUBLE PRECISION NOT NULL,
      rental_days INTEGER NOT NULL,
      return_amount DOUBLE PRECISION DEFAULT 0,
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const count = Number((await pool.query("SELECT COUNT(*) AS count FROM rental_products")).rows[0].count);
  if (!count) {
    const products = sqlite.prepare("SELECT * FROM rental_products ORDER BY id").all();
    for (const product of products) {
      await pool.query(`
        INSERT INTO rental_products
          (id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO NOTHING
      `, [product.id, product.series, product.code, product.name, product.description, product.image_url, product.rental_fee, product.rental_days, product.return_amount, product.active, product.featured, product.created_at]);
    }
  }
}

function products(options = {}) {
  let sql = "SELECT * FROM rental_products";
  const params = [];
  if (options.featured) {
    sql += " WHERE featured = 1";
  } else if (options.active) {
    sql += " WHERE active = 1";
  }
  sql += " ORDER BY series, id";
  return sqlite.prepare(sql).all(...params);
}

function productById(id) {
  return sqlite.prepare("SELECT * FROM rental_products WHERE id = ?").get(id);
}

function rentalsForUser(userId) {
  return sqlite.prepare(`
    SELECT r.*, p.code, p.name, p.image_url
    FROM rentals r
    JOIN rental_products p ON p.id = r.product_id
    WHERE r.user_id = ?
    ORDER BY r.id DESC
  `).all(userId);
}

function close() {
  sqlite.close();
  if (pool) pool.end().catch(() => {});
}

module.exports = { sqlite, pool, ensurePostgres, products, productById, rentalsForUser, close };
