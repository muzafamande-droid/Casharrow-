const express = require("express");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const path = require("path");
const { Pool } = require("pg");
const db = require("./database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const sqlite = new Database(process.env.DATABASE_PATH || path.join(__dirname, "casharrow.db"));
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false }) : null;

sqlite.exec(`
CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT, series TEXT NOT NULL, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL, description TEXT, image_url TEXT, rental_fee REAL NOT NULL DEFAULT 0, rental_days INTEGER NOT NULL DEFAULT 0, return_amount REAL, active INTEGER NOT NULL DEFAULT 0, featured INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS rentals (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, rental_fee REAL NOT NULL, rental_days INTEGER NOT NULL, start_at TEXT NOT NULL, end_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', return_amount REAL, completed_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id), FOREIGN KEY (product_id) REFERENCES products(id));
`);

for (const series of ["A", "B", "C", "D"]) {
  for (let i = 1; i <= 5; i += 1) {
    const code = `${series}${i}`;
    sqlite.prepare(`INSERT OR IGNORE INTO products (series,code,name,description,image_url,rental_fee,rental_days,return_amount,active,featured) VALUES (?,?,?,?,?,?,?,?,?,?)`).run(series, code, `CashArrow Generator ${code}`, `${series} Series generator rental product ${code}. Full specifications and verified rental terms will be published before activation.`, "/product-placeholder.svg", 0, 0, null, 0, i === 1 ? 1 : 0);
  }
}

async function ensurePgSchema() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS products (id BIGINT PRIMARY KEY,series TEXT NOT NULL,code TEXT UNIQUE NOT NULL,name TEXT NOT NULL,description TEXT,image_url TEXT,rental_fee DOUBLE PRECISION NOT NULL DEFAULT 0,rental_days BIGINT NOT NULL DEFAULT 0,return_amount DOUBLE PRECISION,active BIGINT NOT NULL DEFAULT 0,featured BIGINT NOT NULL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS rentals (id BIGINT PRIMARY KEY,user_id BIGINT NOT NULL,product_id BIGINT NOT NULL,rental_fee DOUBLE PRECISION NOT NULL,rental_days BIGINT NOT NULL,start_at TEXT NOT NULL,end_at TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',return_amount DOUBLE PRECISION,completed_at TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
  const localProducts = sqlite.prepare("SELECT * FROM products").all();
  for (const p of localProducts) await pool.query(`INSERT INTO products (id,series,code,name,description,image_url,rental_fee,rental_days,return_amount,active,featured,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET series=EXCLUDED.series,code=EXCLUDED.code,name=EXCLUDED.name,description=EXCLUDED.description,image_url=EXCLUDED.image_url,rental_fee=EXCLUDED.rental_fee,rental_days=EXCLUDED.rental_days,return_amount=EXCLUDED.return_amount,active=EXCLUDED.active,featured=EXCLUDED.featured`, [p.id,p.series,p.code,p.name,p.description,p.image_url,p.rental_fee,p.rental_days,p.return_amount,p.active,p.featured,p.created_at]);
  const rows = (await pool.query("SELECT * FROM rentals ORDER BY id")).rows;
  if (rows.length) {
    sqlite.exec("PRAGMA foreign_keys = OFF"); sqlite.prepare("DELETE FROM rentals").run();
    const insert = sqlite.prepare(`INSERT INTO rentals (id,user_id,product_id,rental_fee,rental_days,start_at,end_at,status,return_amount,completed_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
    const restore = sqlite.transaction(items => { for (const r of items) insert.run(r.id,r.user_id,r.product_id,r.rental_fee,r.rental_days,r.start_at,r.end_at,r.status,r.return_amount,r.completed_at,r.created_at); });
    restore(rows); sqlite.exec("PRAGMA foreign_keys = ON");
  } else await syncRentalsToPostgres();
}

async function syncRentalsToPostgres() {
  if (!pool) return;
  for (const r of sqlite.prepare("SELECT * FROM rentals ORDER BY id").all()) await pool.query(`INSERT INTO rentals (id,user_id,product_id,rental_fee,rental_days,start_at,end_at,status,return_amount,completed_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,return_amount=EXCLUDED.return_amount,completed_at=EXCLUDED.completed_at`, [r.id,r.user_id,r.product_id,r.rental_fee,r.rental_days,r.start_at,r.end_at,r.status,r.return_amount,r.completed_at,r.created_at]);
}

function authenticate(req,res,next) {
  const header=req.headers.authorization||"";
  if(!header.startsWith("Bearer ")) return res.status(401).json({success:false,message:"Authentication required"});
  try { req.rentalUser=jwt.verify(header.slice(7),JWT_SECRET); next(); } catch { return res.status(401).json({success:false,message:"Invalid or expired session"}); }
}

router.get("/products", async (req,res)=>{
  try { await db.ready; await ensurePgSchema(); const products=sqlite.prepare("SELECT id,series,code,name,description,image_url,rental_fee,rental_days,return_amount,active,featured FROM products ORDER BY series,id").all(); res.json({success:true,products}); }
  catch(error){ console.error("Products failed:",error); res.status(500).json({success:false,message:"Unable to load products"}); }
});

router.get("/products/:id", async (req,res)=>{
  const id=Number(req.params.id);
  if(!Number.isInteger(id)||id<=0) return res.status(400).json({success:false,message:"Invalid product ID"});
  try { await db.ready; await ensurePgSchema(); const product=sqlite.prepare("SELECT id,series,code,name,description,image_url,rental_fee,rental_days,return_amount,active,featured FROM products WHERE id=?").get(id); if(!product) return res.status(404).json({success:false,message:"Product not found"}); res.json({success:true,product}); }
  catch(error){ console.error("Product details failed:",error); res.status(500).json({success:false,message:"Unable to load product"}); }
});

router.get("/rentals",authenticate,async(req,res)=>{
  try { await db.ready; await ensurePgSchema(); const rentals=sqlite.prepare(`SELECT r.id,r.product_id,p.code,p.name,r.rental_fee,r.rental_days,r.start_at,r.end_at,r.status,r.return_amount,r.completed_at,r.created_at FROM rentals r JOIN products p ON p.id=r.product_id WHERE r.user_id=? ORDER BY r.id DESC`).all(req.rentalUser.id); res.json({success:true,rentals}); }
  catch(error){ console.error("Rentals failed:",error); res.status(500).json({success:false,message:"Unable to load rentals"}); }
});

router.post("/rentals",authenticate,async(req,res)=>{
  const productId=Number(req.body.productId);
  if(!Number.isInteger(productId)||productId<=0) return res.status(400).json({success:false,message:"Invalid product"});
  try { await db.ready; await ensurePgSchema(); const result=db.transaction(()=>{ const p=db.prepare("SELECT * FROM products WHERE id=?").get(productId); if(!p) return {status:404,message:"Product not found"}; if(!p.active) return {status:409,message:"This product is not available for rental yet"}; if(p.rental_fee<=0||p.rental_days<=0) return {status:409,message:"Rental terms are not configured yet"}; const u=db.prepare("SELECT id,balance FROM users WHERE id=?").get(req.rentalUser.id); if(!u) return {status:404,message:"User not found"}; if(Number(u.balance)<Number(p.rental_fee)) return {status:400,message:"Insufficient balance"}; const start=new Date(),end=new Date(start.getTime()+Number(p.rental_days)*86400000); const r=db.prepare(`INSERT INTO rentals (user_id,product_id,rental_fee,rental_days,start_at,end_at,status,return_amount) VALUES (?,?,?,?,?,?, 'active',?)`).run(req.rentalUser.id,p.id,p.rental_fee,p.rental_days,start.toISOString(),end.toISOString(),p.return_amount); db.prepare("UPDATE users SET balance=balance-?,wallet=wallet-? WHERE id=?").run(p.rental_fee,p.rental_fee,req.rentalUser.id); db.prepare("INSERT INTO transactions (user_id,type,amount,date) VALUES (?, 'Rental Fee', ?, datetime('now'))").run(req.rentalUser.id,-Number(p.rental_fee)); return {ok:true,rentalId:r.lastInsertRowid,endAt:end.toISOString()}; })(); if(!result.ok) return res.status(result.status).json({success:false,message:result.message}); await syncRentalsToPostgres(); res.status(201).json({success:true,message:"Rental created successfully",rentalId:result.rentalId,endAt:result.endAt}); }
  catch(error){ console.error("Rental creation failed:",error); res.status(500).json({success:false,message:"Unable to create rental"}); }
});

router.post("/rentals/:id/complete",authenticate,async(req,res)=>{
  const id=Number(req.params.id); if(!Number.isInteger(id)||id<=0) return res.status(400).json({success:false,message:"Invalid rental ID"});
  try { await db.ready; await ensurePgSchema(); const result=db.transaction(()=>{ const r=db.prepare("SELECT * FROM rentals WHERE id=? AND user_id=?").get(id,req.rentalUser.id); if(!r) return {status:404,message:"Rental not found"}; if(r.status==="completed") return {status:409,message:"Rental already completed"}; if(r.status!=="active") return {status:409,message:"Rental cannot be completed"}; if(new Date(r.end_at).getTime()>Date.now()) return {status:409,message:"Rental period has not ended yet"}; if(r.return_amount==null) return {status:409,message:"Return terms are not configured"}; const u=db.prepare("UPDATE rentals SET status='completed',completed_at=datetime('now') WHERE id=? AND status='active'").run(id); if(u.changes!==1) return {status:409,message:"Rental was already completed"}; db.prepare("UPDATE users SET balance=balance+?,wallet=wallet+? WHERE id=?").run(r.return_amount,r.return_amount,req.rentalUser.id); db.prepare("INSERT INTO transactions (user_id,type,amount,date) VALUES (?, 'Rental Return', ?, datetime('now'))").run(req.rentalUser.id,r.return_amount); return {ok:true,amount:r.return_amount}; })(); if(!result.ok) return res.status(result.status).json({success:false,message:result.message}); await syncRentalsToPostgres(); res.json({success:true,message:"Rental completed and return processed",amount:result.amount}); }
  catch(error){ console.error("Rental completion failed:",error); res.status(500).json({success:false,message:"Unable to complete rental"}); }
});

module.exports={router,ready:ensurePgSchema};
