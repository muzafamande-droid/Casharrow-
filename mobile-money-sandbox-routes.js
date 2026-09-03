const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");
const financial = require("./financial-pg-v2");
const momo = require("./mobile-money-sandbox");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const FINAL_FAILURES = new Set(["FAILED", "REJECTED", "CANCELLED", "TIMEOUT"]);
const pollingDeposits = new Set();

if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

async function getDeposit(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const result = await db.query("SELECT id,user_id,amount,network,account,status,provider_reference FROM deposits WHERE id=$1", [n]);
  return result.rows[0] || null;
}

async function verifyProviderPayment(deposit, provider, reference) {
  if (!deposit) return { error: "Deposit not found", status: 404 };
  if (deposit.status === "approved") return { success: true, alreadyProcessed: true, depositId: Number(deposit.id), status: "approved" };
  if (deposit.status !== "pending") return { success: true, depositId: Number(deposit.id), status: deposit.status };

  if (String(provider.externalId || "") !== `CASHARROW-${reference}`) return { error: "Provider reference does not match this deposit", status: 409 };
  if (Number(provider.amount) !== Number(deposit.amount)) return { error: "Provider amount does not match this deposit", status: 409 };

  const providerCurrency = String(provider.currency || "").trim().toUpperCase();
  if (providerCurrency && providerCurrency !== momo.config().currency) return { error: "Provider currency does not match this deposit", status: 409 };

  const payer = momo.normalizeMsisdn(provider.payer?.partyId);
  const expectedPayer = momo.normalizeMsisdn(deposit.account);
  if (!payer || !expectedPayer || payer !== expectedPayer) return { error: "Provider payer does not match this deposit", status: 409 };

  try {
    const approved = await financial.approveDeposit(Number(deposit.id), { providerReference: reference });
    return { success: true, depositId: Number(deposit.id), amount: Number(deposit.amount), status: "approved", deposit: approved };
  } catch (error) {
    if (error.message === "Deposit already approved") return { success: true, alreadyProcessed: true, depositId: Number(deposit.id), status: "approved" };
    throw error;
  }
}

async function reconcileDeposit(depositId) {
  const deposit = await getDeposit(depositId);
  if (!deposit) return { success: false, depositId, status: "not_found" };
  if (deposit.status !== "pending") return { success: true, depositId: Number(deposit.id), status: deposit.status };
  if (!momo.configured()) return { success: true, depositId: Number(deposit.id), status: "pending", configured: false };

  const reference = momo.makeReference(Number(deposit.id));
  const provider = await momo.getPaymentStatus(reference);
  const status = String(provider.status || "PENDING").toUpperCase();

  if (status === "SUCCESSFUL") return verifyProviderPayment(deposit, provider, reference);
  if (FINAL_FAILURES.has(status)) {
    await db.query("UPDATE deposits SET status='failed' WHERE id=$1 AND status='pending'", [deposit.id]);
    return { success: true, depositId: Number(deposit.id), status: "failed" };
  }
  return { success: true, depositId: Number(deposit.id), status: "pending" };
}

async function pollDeposit(depositId) {
  if (pollingDeposits.has(depositId)) return;
  pollingDeposits.add(depositId);
  try {
    const maxAttempts = 36;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const result = await reconcileDeposit(depositId);
      if (!result || ["approved", "failed", "not_found"].includes(result.status)) return;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error(`MTN sandbox polling failed for deposit ${depositId}:`, error.message);
  } finally {
    pollingDeposits.delete(depositId);
  }
}

async function resumePendingDeposits() {
  if (!momo.configured()) return;
  const pending = await db.query("SELECT id FROM deposits WHERE network='MTN' AND status='pending' ORDER BY id ASC LIMIT 25");
  for (const row of pending.rows) pollDeposit(Number(row.id));
}

setTimeout(() => resumePendingDeposits().catch(error => console.error("Unable to resume MTN deposits:", error.message)), 3000).unref();

router.post("/mobile-money/deposit", authenticate, async (req, res) => {
  const amount = Number(req.body.amount);
  const network = String(req.body.network || "").trim().toUpperCase();
  const account = momo.normalizeMsisdn(req.body.account);

  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "Enter a valid deposit amount" });
  if (network !== "MTN") return res.status(400).json({ success: false, message: "Automatic deposits are currently available for MTN Mobile Money only" });
  if (!account) return res.status(400).json({ success: false, message: "Enter a valid Ugandan Mobile Money number" });
  if (!momo.configured()) return res.status(503).json({ success: false, code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "MTN sandbox deposits are not enabled yet. No money has been charged." });

  const userResult = await db.query("SELECT id,phone FROM users WHERE id=$1", [req.user.id]);
  const user = userResult.rows[0];
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (momo.normalizeMsisdn(user.phone) !== account) return res.status(400).json({ success: false, message: "Use the Mobile Money number registered on your CashArrow account" });

  const inserted = await db.query(`
    INSERT INTO deposits (id,user_id,amount,network,account,status,date)
    VALUES (nextval('casharrow_deposits_id_seq'),$1,$2,'MTN',$3,'pending',NOW())
    RETURNING id
  `, [user.id, amount, account]);
  const depositId = Number(inserted.rows[0].id);
  const reference = momo.makeReference(depositId);

  try {
    await momo.requestPayment({ amount, phone: account, reference, callbackUrl: process.env.MTN_CALLBACK_URL || undefined });
    await db.query("UPDATE deposits SET provider_reference=$1 WHERE id=$2", [reference, depositId]);
  } catch (error) {
    await db.query("UPDATE deposits SET status='failed' WHERE id=$1 AND status='pending'", [depositId]);
    console.error("MTN sandbox RequestToPay failed:", error.message);
    return res.status(502).json({ success: false, code: "PAYMENT_PROVIDER_ERROR", message: "Unable to start the MTN Mobile Money payment. No wallet credit was made." });
  }

  pollDeposit(depositId);
  return res.status(202).json({ success: true, depositId, reference, status: "pending", currency: momo.config().currency, message: "Payment request sent. Check your MTN phone and approve the payment with your Mobile Money PIN." });
});

router.all("/mobile-money/mtn/callback", async (req, res) => {
  const depositId = Number(req.query.depositId);
  const suppliedReference = String(req.query.reference || req.headers["x-reference-id"] || req.body?.referenceId || "");
  const deposit = await getDeposit(depositId);
  if (!deposit || !suppliedReference) return res.status(400).json({ success: false, message: "Missing or invalid payment reference" });
  if (suppliedReference !== momo.makeReference(Number(deposit.id))) return res.status(409).json({ success: false, message: "Payment reference does not match this deposit" });

  try {
    const result = await reconcileDeposit(Number(deposit.id));
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    return res.status(200).json({ success: true, status: result.status });
  } catch (error) {
    console.error("MTN callback processing failed:", error.message);
    return res.status(500).json({ success: false, message: "Callback processing failed" });
  }
});

router.get("/mobile-money/deposit/:id/status", authenticate, async (req, res) => {
  const deposit = await getDeposit(req.params.id);
  if (!deposit || Number(deposit.user_id) !== Number(req.user.id)) return res.status(404).json({ success: false, message: "Deposit not found" });
  if (deposit.status !== "pending") return res.json({ success: true, depositId: Number(deposit.id), status: deposit.status });

  try {
    const result = await reconcileDeposit(Number(deposit.id));
    return res.json(result);
  } catch (error) {
    console.error("MTN status polling failed:", error.message);
    return res.json({ success: true, depositId: Number(deposit.id), status: "pending" });
  }
});

module.exports = { router, reconcileDeposit };
