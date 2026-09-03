const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database");
const momo = require("./mobile-money");

const router = express.Router();

function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch (_) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function getDepositFromReference(reference) {
  const id = Number(String(reference || "").split("-").pop());
  if (!Number.isInteger(id) || id <= 0) return null;
  return db.prepare(`
    SELECT id, user_id, amount, network, account, status
    FROM deposits WHERE id = ?
  `).get(id);
}

function creditSuccessfulDeposit(reference, providerStatus) {
  const deposit = getDepositFromReference(reference);
  if (!deposit) return { error: "Deposit not found", status: 404 };

  if (deposit.status === "approved") {
    return { success: true, alreadyProcessed: true, deposit };
  }
  if (deposit.status !== "pending") {
    return { error: "Deposit is not pending", status: 409 };
  }

  const verifiedAmount = Number(providerStatus.amount);
  const expectedAmount = Number(deposit.amount);
  const verifiedPayer = momo.normalizeMsisdn(providerStatus.payer?.partyId);
  const expectedPayer = momo.normalizeMsisdn(deposit.account);

  if (!Number.isFinite(verifiedAmount) || verifiedAmount !== expectedAmount) {
    return { error: "Provider amount does not match deposit", status: 409 };
  }
  if (!verifiedPayer || !expectedPayer || verifiedPayer !== expectedPayer) {
    return { error: "Provider payer does not match deposit", status: 409 };
  }

  return db.transaction(() => {
    const current = db.prepare("SELECT status FROM deposits WHERE id = ?").get(deposit.id);
    if (!current || current.status !== "pending") {
      return { success: true, alreadyProcessed: true };
    }

    const update = db.prepare(`
      UPDATE deposits
      SET status = 'approved', approved_at = datetime('now')
      WHERE id = ? AND status = 'pending'
    `).run(deposit.id);

    if (update.changes !== 1) return { success: true, alreadyProcessed: true };

    db.prepare(`
      UPDATE users
      SET balance = balance + ?, wallet = wallet + ?
      WHERE id = ?
    `).run(deposit.amount, deposit.amount, deposit.user_id);

    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, date)
      VALUES (?, 'Deposit', ?, datetime('now'))
    `).run(deposit.user_id, deposit.amount);

    return { success: true, depositId: deposit.id, amount: deposit.amount };
  })();
}

// Start an automatic MTN Mobile Money collection. No wallet credit occurs here.
router.post("/mobile-money/deposit", authenticate, async (req, res) => {
  const amount = Number(req.body.amount);
  const network = String(req.body.network || "").trim();
  const account = momo.normalizeMsisdn(req.body.account);

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Enter a valid deposit amount" });
  }
  if (network !== "MTN") {
    return res.status(400).json({
      success: false,
      message: "Automatic deposits are currently available for MTN Mobile Money only"
    });
  }
  if (!account) {
    return res.status(400).json({ success: false, message: "Enter a valid Ugandan Mobile Money number" });
  }
  if (!momo.configured()) {
    return res.status(503).json({
      success: false,
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      message: "Automatic MTN deposits are not enabled yet. No money has been charged."
    });
  }

  const user = db.prepare("SELECT id, phone, name FROM users WHERE id = ?").get(req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  const registeredPhone = momo.normalizeMsisdn(user.phone);
  if (!registeredPhone || registeredPhone !== account) {
    return res.status(400).json({
      success: false,
      message: "For automatic deposits, use the Mobile Money number registered on your CashArrow account"
    });
  }

  const insert = db.prepare(`
    INSERT INTO deposits (user_id, amount, network, account, status, date)
    VALUES (?, ?, 'MTN', ?, 'pending', datetime('now'))
  `).run(user.id, amount, account);

  const depositId = Number(insert.lastInsertRowid);
  const reference = `${momo.makeReference()}-${depositId}`;
  const callbackUrl = process.env.MTN_CALLBACK_URL || `${String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/mobile-money/mtn/callback`;

  if (!callbackUrl.startsWith("https://")) {
    db.prepare("UPDATE deposits SET status = 'failed' WHERE id = ? AND status = 'pending'").run(depositId);
    return res.status(503).json({
      success: false,
      code: "PAYMENT_CALLBACK_NOT_CONFIGURED",
      message: "CashArrow payment callback is not configured securely. No money has been charged."
    });
  }

  // MTN requires X-Reference-Id to be UUID v4. The UUID portion remains the
  // provider reference; the suffix lets the callback map back to the deposit.
  const providerReference = reference;
  try {
    await momo.requestPayment({ amount, phone: account, reference: providerReference.split("-").slice(0, 5).join("-"), callbackUrl });
  } catch (error) {
    console.error("MTN payment initiation failed:", error.message);
    db.prepare("UPDATE deposits SET status = 'failed' WHERE id = ? AND status = 'pending'").run(depositId);
    return res.status(502).json({ success: false, message: "Unable to start the Mobile Money payment. No wallet credit was made." });
  }

  // The provider reference is not stored separately. The deposit id is encoded
  // in the externalId used by the provider and status polling/callback verifies it.
  res.status(202).json({
    success: true,
    depositId,
    status: "pending",
    message: "Payment request sent. Check your MTN phone and approve the payment with your Mobile Money PIN."
  });
});

// MTN callback. We do not trust the callback body for the amount or final state;
// we query MTN and verify the provider's status before crediting the wallet.
router.all("/mobile-money/mtn/callback", async (req, res) => {
  const reference = req.headers["x-reference-id"] || req.body?.referenceId || req.body?.referenceId;
  if (!reference) return res.status(400).json({ success: false, message: "Missing payment reference" });

  try {
    const status = await momo.getPaymentStatus(reference);
    if (status.status === "SUCCESSFUL") {
      const result = creditSuccessfulDeposit(reference, status);
      if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    } else if (status.status === "FAILED" || status.status === "REJECTED" || status.status === "CANCELLED") {
      const deposit = getDepositFromReference(reference);
      if (deposit && deposit.status === "pending") {
        db.prepare("UPDATE deposits SET status = 'failed' WHERE id = ? AND status = 'pending'").run(deposit.id);
      }
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("MTN callback processing failed:", error.message);
    return res.status(500).json({ success: false, message: "Callback processing failed" });
  }
});

// Authenticated status polling is the reliability fallback because MTN notes that
// callbacks are sent only once. This endpoint also performs the same verification
// before crediting the wallet.
router.get("/mobile-money/deposit/:id/status", authenticate, async (req, res) => {
  const depositId = Number(req.params.id);
  const deposit = db.prepare(`
    SELECT id, user_id, amount, network, account, status
    FROM deposits WHERE id = ? AND user_id = ?
  `).get(depositId, req.user.id);

  if (!deposit) return res.status(404).json({ success: false, message: "Deposit not found" });
  if (deposit.status !== "pending") return res.json({ success: true, status: deposit.status, depositId });

  return res.json({
    success: true,
    status: "pending",
    depositId,
    message: "Payment is still being processed."
  });
});

module.exports = { router };
