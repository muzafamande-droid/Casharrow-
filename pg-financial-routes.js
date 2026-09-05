const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");
const financial = require("./financial-pg-v2");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function admin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin access required" });
  next();
}

function positiveAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

router.get("/wallet", auth, async (req, res) => {
  try {
    res.json({ success: true, wallet: await financial.getWallet(req.user.id) });
  } catch (error) {
    console.error("PG wallet failed:", error);
    res.status(error.message === "User not found" ? 404 : 500).json({ success: false, message: error.message });
  }
});

router.get("/transactions", auth, async (req, res) => {
  try {
    const result = await db.query(`SELECT id, type, amount, reference, date FROM transactions WHERE user_id = $1 ORDER BY id DESC LIMIT 200`, [req.user.id]);
    res.json({ success: true, transactions: result.rows });
  } catch (error) {
    console.error("PG transactions failed:", error);
    res.status(500).json({ success: false, message: "Unable to load transactions" });
  }
});

router.post("/deposits", auth, async (req, res) => {
  const amount = positiveAmount(req.body.amount);
  const network = String(req.body.network || "").trim().toUpperCase();
  const account = String(req.body.account || "").trim();
  const idempotencyKey = req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]).trim() : null;

  if (!amount) return res.status(400).json({ success: false, message: "Enter a valid deposit amount" });
  if (!["MTN", "AIRTEL"].includes(network)) return res.status(400).json({ success: false, message: "Please select MTN or Airtel" });
  if (!account) return res.status(400).json({ success: false, message: "Enter your Mobile Money number" });

  try {
    const deposit = await financial.createDeposit({ userId: req.user.id, amount, network, account, idempotencyKey });
    res.status(201).json({ success: true, message: "Deposit request submitted", deposit });
  } catch (error) {
    console.error("PG deposit failed:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/deposits", auth, async (req, res) => {
  try {
    const result = await db.query(`SELECT id, amount, network, account, status, provider_reference, date, approved_at FROM deposits WHERE user_id = $1 ORDER BY id DESC LIMIT 200`, [req.user.id]);
    res.json({ success: true, deposits: result.rows });
  } catch (error) {
    console.error("PG deposits failed:", error);
    res.status(500).json({ success: false, message: "Unable to load deposits" });
  }
});

router.post("/withdrawals", auth, async (req, res) => {
  const amount = positiveAmount(req.body.amount);
  const account = String(req.body.account || "").trim();
  const network = req.body.network ? String(req.body.network).trim().toUpperCase() : null;
  const idempotencyKey = req.headers["idempotency-key"] ? String(req.headers["idempotency-key"]).trim() : null;

  if (!amount) return res.status(400).json({ success: false, message: "Invalid withdrawal amount" });
  if (!["MTN", "AIRTEL"].includes(network)) return res.status(400).json({ success: false, message: "Please select MTN or Airtel" });
  if (!account || account.length > 64) return res.status(400).json({ success: false, message: "Enter a valid Mobile Money number" });

  try {
    const withdrawal = await financial.createWithdrawal({ userId: req.user.id, amount, account, network, idempotencyKey });
    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        account: withdrawal.account,
        network: withdrawal.network,
        status: withdrawal.status,
        date: withdrawal.date,
        payout: withdrawal.payout
      }
    });
  } catch (error) {
    console.error("PG withdrawal failed:", error);
    res.status(error.message.includes("Insufficient") ? 409 : 400).json({ success: false, message: error.message });
  }
});

router.get("/withdrawals", auth, async (req, res) => {
  try {
    const result = await db.query(`SELECT id, amount, account, network, status, provider_reference, date, approved_at FROM withdrawals WHERE user_id = $1 ORDER BY id DESC LIMIT 200`, [req.user.id]);
    res.json({ success: true, withdrawals: result.rows });
  } catch (error) {
    console.error("PG withdrawals failed:", error);
    res.status(500).json({ success: false, message: "Unable to load withdrawals" });
  }
});

router.get("/admin/deposits", auth, admin, async (req, res) => {
  try {
    const result = await db.query(`SELECT d.*, u.phone, u.name FROM deposits d JOIN users u ON u.id = d.user_id ORDER BY d.id DESC LIMIT 500`);
    res.json({ success: true, deposits: result.rows });
  } catch (error) {
    console.error("PG admin deposits failed:", error);
    res.status(500).json({ success: false, message: "Unable to load deposits" });
  }
});

router.post("/admin/deposits/:id/approve", auth, admin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid deposit ID" });
  try {
    const deposit = await financial.approveDeposit(id, { providerReference: req.body.providerReference || null });
    res.json({ success: true, message: "Deposit approved and wallet credited", deposit });
  } catch (error) {
    console.error("PG deposit approval failed:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get("/admin/withdrawals", auth, admin, async (req, res) => {
  try {
    const result = await db.query(`SELECT w.*, u.phone, u.name FROM withdrawals w JOIN users u ON u.id = w.user_id ORDER BY w.id DESC LIMIT 500`);
    res.json({ success: true, withdrawals: result.rows });
  } catch (error) {
    console.error("PG admin withdrawals failed:", error);
    res.status(500).json({ success: false, message: "Unable to load withdrawals" });
  }
});

router.post("/admin/withdrawals/:id/approve", auth, admin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
  try {
    const withdrawal = await financial.approveWithdrawal(id, { providerReference: req.body.providerReference || null });
    res.json({ success: true, message: "Withdrawal approved", withdrawal });
  } catch (error) {
    console.error("PG withdrawal approval failed:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

router.post("/admin/withdrawals/:id/reject", auth, admin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
  try {
    const withdrawal = await financial.rejectWithdrawal(id);
    res.json({ success: true, message: "Withdrawal rejected and reserved balance released", withdrawal });
  } catch (error) {
    console.error("PG withdrawal rejection failed:", error);
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = { router, auth, admin };
