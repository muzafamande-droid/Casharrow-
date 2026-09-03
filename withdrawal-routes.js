const express = require("express");
const jwt = require("jsonwebtoken");
const db = require("./database");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not configured");
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required" });
  }
  next();
}

// The existing user withdrawal request remains in server.js. These routes add
// the missing admin workflow and perform the actual balance deduction only once.
router.get("/admin/withdrawals", authenticate, adminOnly, (req, res) => {
  const withdrawals = db.prepare(`
    SELECT w.id, w.user_id, u.name, u.phone, w.amount, w.account,
           w.status, w.date, w.approved_at
    FROM withdrawals w
    JOIN users u ON u.id = w.user_id
    ORDER BY w.id DESC
  `).all();

  res.json({ success: true, withdrawals });
});

// Approve only after the real Mobile Money payout has been sent/verified.
// The database operation is atomic: a request can be approved once, and the
// user's balance is deducted once. A retry returns 409 without another debit.
router.post("/admin/withdrawals/:id/approve", authenticate, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
  }

  try {
    const result = db.transaction(() => {
      const withdrawal = db.prepare(`
        SELECT id, user_id, amount, status
        FROM withdrawals
        WHERE id = ?
      `).get(id);

      if (!withdrawal) return { error: "Withdrawal request not found", status: 404 };
      if (withdrawal.status !== "pending") return { error: "Withdrawal has already been processed", status: 409 };

      const debit = db.prepare(`
        UPDATE users
        SET balance = balance - ?, wallet = wallet - ?
        WHERE id = ? AND balance >= ? AND wallet >= ?
      `).run(withdrawal.amount, withdrawal.amount, withdrawal.user_id, withdrawal.amount, withdrawal.amount);

      if (debit.changes !== 1) {
        return { error: "Insufficient available balance for this withdrawal", status: 409 };
      }

      const update = db.prepare(`
        UPDATE withdrawals
        SET status = 'approved', approved_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(id);

      if (update.changes !== 1) {
        throw new Error("Withdrawal status changed during approval");
      }

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Withdrawal Approved', ?, datetime('now'))
      `).run(withdrawal.user_id, -withdrawal.amount);

      return { success: true };
    })();

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.json({
      success: true,
      message: "Withdrawal approved and balance deducted. Confirm the actual Mobile Money payout was completed."
    });
  } catch (error) {
    console.error("Withdrawal approval failed:", error);
    res.status(500).json({ success: false, message: "Unable to approve withdrawal" });
  }
});

// Rejecting a pending request does not change the balance because the existing
// request route reserves nothing. This makes rejection safe and idempotent.
router.post("/admin/withdrawals/:id/reject", authenticate, adminOnly, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ success: false, message: "Invalid withdrawal ID" });
  }

  try {
    const result = db.transaction(() => {
      const update = db.prepare(`
        UPDATE withdrawals
        SET status = 'rejected', approved_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(id);

      if (update.changes !== 1) {
        const exists = db.prepare("SELECT id FROM withdrawals WHERE id = ?").get(id);
        if (!exists) return { error: "Withdrawal request not found", status: 404 };
        return { error: "Withdrawal has already been processed", status: 409 };
      }

      return { success: true };
    })();

    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    res.json({ success: true, message: "Withdrawal rejected" });
  } catch (error) {
    console.error("Withdrawal rejection failed:", error);
    res.status(500).json({ success: false, message: "Unable to reject withdrawal" });
  }
});

module.exports = { router };
