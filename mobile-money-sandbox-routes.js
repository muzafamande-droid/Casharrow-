const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database");
const momo = require("./mobile-money-sandbox");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const FINAL_FAILURES = new Set(["FAILED", "REJECTED", "CANCELLED", "TIMEOUT"]);
const pollingDeposits = new Set();

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try { req.user = jwt.verify(header.slice(7), JWT_SECRET); next(); }
  catch (_) { return res.status(401).json({ success: false, message: "Invalid or expired session" }); }
}

function getDeposit(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return db.prepare("SELECT id,user_id,amount,network,account,status FROM deposits WHERE id=?").get(n);
}

function verifyProviderPayment(deposit, provider, reference) {
  if (!deposit) return { error: "Deposit not found", status: 404 };
  if (deposit.status === "approved") return { success: true, alreadyProcessed: true, depositId: deposit.id, status: "approved" };
  if (deposit.status !== "pending") return { success: true, depositId: deposit.id, status: deposit.status };

  if (String(provider.externalId || "") !== `CASHARROW-${reference}`) return { error: "Provider reference does not match this deposit", status: 409 };
  if (Number(provider.amount) !== Number(deposit.amount)) return { error: "Provider amount does not match this deposit", status: 409 };

  const providerCurrency = String(provider.currency || "").trim().toUpperCase();
  if (providerCurrency && providerCurrency !== momo.config().currency) return { error: "Provider currency does not match this deposit", status: 409 };

  const payer = momo.normalizeMsisdn(provider.payer?.partyId);
  const expectedPayer = momo.normalizeMsisdn(deposit.account);
  if (!payer || !expectedPayer || payer !== expectedPayer) return { error: "Provider payer does not match this deposit", status: 409 };

  return db.transaction(() => {
    const current = db.prepare("SELECT status FROM deposits WHERE id=?").get(deposit.id);
    if (!current || current.status !== "pending") return { success: true, alreadyProcessed: true, depositId: deposit.id, status: current?.status || "unknown" };

    const update = db.prepare("UPDATE deposits SET status='approved', approved_at=datetime('now') WHERE id=? AND status='pending'").run(deposit.id);
    if (update.changes !== 1) return { success: true, alreadyProcessed: true, depositId: deposit.id };

    const walletUpdate = db.prepare("UPDATE users SET balance=balance+?, wallet=wallet+? WHERE id=?").run(deposit.amount, deposit.amount, deposit.user_id);
    if (walletUpdate.changes !== 1) throw new Error("Unable to credit the CashArrow wallet");

    db.prepare("INSERT INTO transactions (user_id,type,amount,date) VALUES (?, 'Deposit', ?, datetime('now'))").run(deposit.user_id, deposit.amount);
    return { success: true, depositId: deposit.id, amount: deposit.amount, status: "approved" };
  })();
}

async function reconcileDeposit(depositId) {
  const deposit = getDeposit(depositId);
  if (!deposit) return { success: false, depositId, status: "not_found" };
  if (deposit.status !== "pending") return { success: true, depositId, status: deposit.status };
  if (!momo.configured()) return { success: true, depositId, status: "pending", configured: false };

  const reference = momo.makeReference(deposit.id);
  const provider = await momo.getPaymentStatus(reference);
  const status = String(provider.status || "PENDING").toUpperCase();

  if (status === "SUCCESSFUL") return verifyProviderPayment(deposit, provider, reference);
  if (FINAL_FAILURES.has(status)) {
    db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(deposit.id);
    return { success: true, depositId: deposit.id, status: "failed" };
  }
  return { success: true, depositId: deposit.id, status: "pending" };
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

router.post("/mobile-money/deposit", authenticate, async (req, res) => {
  const amount = Number(req.body.amount);
  const network = String(req.body.network || "").trim().toUpperCase();
  const account = momo.normalizeMsisdn(req.body.account);

  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: "Enter a valid deposit amount" });
  if (network !== "MTN") return res.status(400).json({ success: false, message: "Automatic deposits are currently available for MTN Mobile Money only" });
  if (!account) return res.status(400).json({ success: false, message: "Enter a valid Ugandan Mobile Money number" });
  if (!momo.configured()) return res.status(503).json({ success: false, code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: "MTN sandbox deposits are not enabled yet. No money has been charged." });

  const user = db.prepare("SELECT id,phone FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (momo.normalizeMsisdn(user.phone) !== account) return res.status(400).json({ success: false, message: "Use the Mobile Money number registered on your CashArrow account" });

  const row = db.prepare("INSERT INTO deposits (user_id,amount,network,account,status,date) VALUES (?,?,'MTN',?,'pending',datetime('now'))").run(user.id, amount, account);
  const depositId = Number(row.lastInsertRowid);
  const reference = momo.makeReference(depositId);
  const callbackUrl = String(process.env.MTN_CALLBACK_URL || "").trim();

  try {
    await momo.requestPayment({ amount, phone: account, reference, callbackUrl: callbackUrl || undefined });
  } catch (error) {
    db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(depositId);
    console.error("MTN sandbox RequestToPay failed:", error.message);
    return res.status(502).json({ success: false, code: "PAYMENT_PROVIDER_ERROR", message: "Unable to start the MTN Mobile Money payment. No wallet credit was made." });
  }

  pollDeposit(depositId);
  return res.status(202).json({ success: true, depositId, reference, status: "pending", currency: momo.config().currency, message: "Payment request sent. Check your MTN phone and approve the payment with your Mobile Money PIN." });
});

router.all("/mobile-money/mtn/callback", async (req, res) => {
  const depositId = Number(req.query.depositId);
  const suppliedReference = String(req.query.reference || req.headers["x-reference-id"] || req.body?.referenceId || "");
  const deposit = getDeposit(depositId);
  if (!deposit || !suppliedReference) return res.status(400).json({ success: false, message: "Missing or invalid payment reference" });
  if (suppliedReference !== momo.makeReference(deposit.id)) return res.status(409).json({ success: false, message: "Payment reference does not match this deposit" });

  try {
    const result = await reconcileDeposit(deposit.id);
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    return res.status(200).json({ success: true, status: result.status });
  } catch (error) {
    console.error("MTN callback processing failed:", error.message);
    return res.status(500).json({ success: false, message: "Callback processing failed" });
  }
});

router.get("/mobile-money/deposit/:id/status", authenticate, async (req, res) => {
  const deposit = getDeposit(req.params.id);
  if (!deposit || deposit.user_id !== req.user.id) return res.status(404).json({ success: false, message: "Deposit not found" });
  if (deposit.status !== "pending") return res.json({ success: true, depositId: deposit.id, status: deposit.status });

  try {
    const result = await reconcileDeposit(deposit.id);
    return res.json(result);
  } catch (error) {
    console.error("MTN status polling failed:", error.message);
    return res.json({ success: true, depositId: deposit.id, status: "pending" });
  }
});

module.exports = { router };
