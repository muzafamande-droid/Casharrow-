const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    const user = jwt.verify(header.slice(7), JWT_SECRET);
    if (user.role !== "admin") return res.status(403).json({ success: false, message: "Admin access required" });
    req.admin = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function cleanProduct(body) {
  const series = String(body.series || "").trim().toUpperCase();
  const code = String(body.code || "").trim().toUpperCase();
  const name = String(body.name || "").trim();
  const description = body.description == null ? null : String(body.description).trim();
  const imageUrl = body.image_url == null ? null : String(body.image_url).trim();
  const fee = Number(body.rental_fee);
  const days = Number(body.rental_days);
  const returnAmount = Number(body.return_amount);
  const active = body.active === undefined ? true : Boolean(body.active);
  const featured = body.featured === undefined ? false : Boolean(body.featured);
  if (!/^[A-Z]$/.test(series)) return { error: "Series must be one letter" };
  if (!/^[A-Z][0-9]+$/.test(code)) return { error: "Invalid product code" };
  if (!name) return { error: "Product name is required" };
  if (!Number.isFinite(fee) || fee <= 0) return { error: "Rental fee must be greater than zero" };
  if (!Number.isInteger(days) || days <= 0) return { error: "Rental days must be a positive integer" };
  if (!Number.isFinite(returnAmount) || returnAmount < 0) return { error: "Return amount must be zero or greater" };
  return { series, code, name, description, imageUrl: imageUrl || null, fee, days, returnAmount, active, featured };
}

router.get("/admin/products", requireAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured, created_at FROM products ORDER BY series, id");
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error("Admin products lookup failed:", error);
    res.status(500).json({ success: false, message: "Unable to load products" });
  }
});

router.post("/admin/products", requireAdmin, async (req, res) => {
  const p = cleanProduct(req.body || {});
  if (p.error) return res.status(400).json({ success: false, message: p.error });
  try {
    const result = await db.query(`INSERT INTO products (id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured)
      VALUES (nextval('casharrow_products_id_seq'), $1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured`,
      [p.series,p.code,p.name,p.description,p.imageUrl,p.fee,p.days,p.returnAmount,p.active,p.featured]);
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "A product with that code already exists" });
    console.error("Admin product creation failed:", error);
    res.status(500).json({ success: false, message: "Unable to create product" });
  }
});

router.patch("/admin/products/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid product ID" });
  const p = cleanProduct(req.body || {});
  if (p.error) return res.status(400).json({ success: false, message: p.error });
  try {
    const result = await db.query(`UPDATE products SET series=$1, code=$2, name=$3, description=$4, image_url=$5, rental_fee=$6, rental_days=$7, return_amount=$8, active=$9, featured=$10 WHERE id=$11
      RETURNING id, series, code, name, description, image_url, rental_fee, rental_days, return_amount, active, featured`,
      [p.series,p.code,p.name,p.description,p.imageUrl,p.fee,p.days,p.returnAmount,p.active,p.featured,id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ success: false, message: "A product with that code already exists" });
    console.error("Admin product update failed:", error);
    res.status(500).json({ success: false, message: "Unable to update product" });
  }
});

router.post("/admin/products/:id/toggle", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid product ID" });
  try {
    const result = await db.query("UPDATE products SET active = NOT active WHERE id = $1 RETURNING id, code, active", [id]);
    if (!result.rowCount) return res.status(404).json({ success: false, message: "Product not found" });
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error("Admin product toggle failed:", error);
    res.status(500).json({ success: false, message: "Unable to change product status" });
  }
});

module.exports = { router };
