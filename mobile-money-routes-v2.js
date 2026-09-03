const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database");
const momo = require("./mobile-money");

const router = express.Router();

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try { req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET); next(); }
  catch (_) { return res.status(401).json({ success: false, message: "Invalid or expired session" }); }
}

function getDeposit(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  return db.prepare("SELECT id,user_id,amount,network,account,status FROM deposits WHERE id = ?").get(n);
}

function verifyAndCredit(deposit, providerStatus, reference) {
  if (!deposit) return { error: "Deposit not found", status: 404 };
  if (deposit.status === "approved") return { success: true, alreadyProcessed: true };
  if (deposit.status !== "pending") return { error: "Deposit is not pending", status: 409 };

  if (String(providerStatus.externalId || "") !== `CASHARROW-${reference}`) {
    return { error: "Provider reference does not match this deposit", status: 409 };
  }

  const amount = Number(providerStatus.amount);
  if (!Number.isFinite(amount) || amount !== Number(deposit.amount)) {
    return { error: "Provider amount does not match this deposit", status: 409 };
  }

  const payer = momo.normalizeMsisdn(providerStatus.payer?.partyId);
  const expected = momo.normalizeMsisdn(deposit.account);
  if (!payer || !expected || payer !== expected) {
    return { error: "Provider payer does not match this deposit", status: 409 };
  }

  return db.transaction(() => {
    const current = db.prepare("SELECT status FROM deposits WHERE id = ?").get(deposit.id);
    if (!current || current.status !== "pending") return { success: true, alreadyProcessed: true };

    const update = db.prepare(`UPDATE deposits SET status='approved', approved_at=datetime('now') WHERE id=? AND status='pending'`).run(deposit.id);
    if (update.changes !== 1) return { success: true, alreadyProcessed: true };

    db.prepare("UPDATE users SET balance=balance+?, wallet=wallet+? WHERE id=?").run(deposit.amount, deposit.amount, deposit.user_id);
    db.prepare("INSERT INTO transactions (user_id,type,amount,date) VALUES (?, 'Deposit', ?, datetime('now'))").run(deposit.user_id, deposit.amount);
    return { success: true, depositId: deposit.id, amount: deposit.amount };
  })();
}

router.post("/mobile-money/deposit", authenticate, async (req, res) => {
  const amount = Number(req.body.amount);
  const network = String(req.body.network || "").trim();
  const account = momo.normalizeMsisdn(req.body.account);

  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success:false, message:"Enter a valid deposit amount" });
  if (network !== "MTN") return res.status(400).json({ success:false, message:"Automatic deposits are currently available for MTN Mobile Money only" });
  if (!account) return res.status(400).json({ success:false, message:"Enter a valid Ugandan Mobile Money number" });
  if (!momo.configured()) return res.status(503).json({ success:false, code:"PAYMENT_PROVIDER_NOT_CONFIGURED", message:"Automatic MTN deposits are not enabled yet. No money has been charged." });

  const user = db.prepare("SELECT id,phone FROM users WHERE id=?").get(req.user.id);
  if (!user) return res.status(404).json({ success:false, message:"User not found" });
  const registered = momo.normalizeMsisdn(user.phone);
  if (!registered || registered !== account) return res.status(400).json({ success:false, message:"Use the Mobile Money number registered on your CashArrow account" });

  const insert = db.prepare(`INSERT INTO deposits (user_id,amount,network,account,status,date) VALUES (?,?,'MTN',?,'pending',datetime('now'))`).run(user.id, amount, account);
  const depositId = Number(insert.lastInsertRowid);
  const reference = momo.makeReference();
  const baseCallback = process.env.MTN_CALLBACK_URL || `${String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/mobile-money/mtn/callback`;
  const callbackUrl = `${baseCallback}${baseCallback.includes("?") ? "&" : "?"}depositId=${depositId}&reference=${encodeURIComponent(reference)}`;

  if (!callbackUrl.startsWith("https://")) {
    db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(depositId);
    return res.status(503).json({ success:false, code:"PAYMENT_CALLBACK_NOT_CONFIGURED", message:"CashArrow payment callback is not configured securely. No money has been charged." });
  }

  try {
    await momo.requestPayment({ amount, phone: account, reference, callbackUrl });
  } catch (error) {
    console.error("MTN payment initiation failed:", error.message);
    db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(depositId);
    return res.status(502).json({ success:false, message:"Unable to start the Mobile Money payment. No wallet credit was made." });
  }

  return res.status(202).json({ success:true, depositId, status:"pending", message:"Payment request sent. Check your MTN phone and approve the payment with your Mobile Money PIN." });
});

router.all("/mobile-money/mtn/callback", async (req, res) => {
  const reference = String(req.query.reference || req.headers["x-reference-id"] || req.body?.referenceId || "");
  const deposit = getDeposit(req.query.depositId);
  if (!reference || !deposit) return res.status(400).json({ success:false, message:"Missing or invalid payment reference" });

  try {
    const providerStatus = await momo.getPaymentStatus(reference);
    if (providerStatus.status === "SUCCESSFUL") {
      const result = verifyAndCredit(deposit, providerStatus, reference);
      if (result.error) return res.status(result.status).json({ success:false, message:result.error });
    } else if (["FAILED","REJECTED","CANCELLED"].includes(providerStatus.status)) {
      db.prepare("UPDATE deposits SET status='failed' WHERE id=? AND status='pending'").run(deposit.id);
    }
    return res.status(200).json({ success:true });
  } catch (error) {
    console.error("MTN callback processing failed:", error.message);
    return res.status(500).json({ success:false, message:"Callback processing failed" });
  }
});

router.get("/mobile-money/deposit/:id/status", authenticate, async (req, res) => {
  const deposit = getDeposit(req.params.id);
  if (!deposit || deposit.user_id !== req.user.id) return res.status(404).json({ success:false, message:"Deposit not found" });
  return res.json({ success:true, depositId:deposit.id, status:deposit.status });
});

module.exports = { router };
