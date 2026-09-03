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

// A pending withdrawal reserves the requested amount immediately. This prevents
// the same balance from being requested in multiple pending withdrawals.
router.post("/withdrawals", authenticate, (req, res) => {
  const amount = Number(req.body.amount);
  const account = String(req.body.account || "").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: "Enter a valid withdrawal amount" });
  }
  if (!account) {
    return res.status(400).json({ success: false, message: "Enter the Mobile Money number" });
  }

  try {
    const result = db.transaction(() => {
      const user = db.prepare("SELECT id, balance, wallet FROM users WHERE id = ?").get(req.user.id);
      if (!user) return { error: "User not found", status: 404 };
      if (amount > Number(user.balance)) return { error: "Insufficient balance", status: 400 };

      const withdrawal = db.prepare(`
        INSERT INTO withdrawals (user_id, amount, account, status, date)
        VALUES (?, ?, ?, 'pending', datetime('now'))
      `).run(user.id, amount, account);

      const debit = db.prepare(`
        UPDATE users
        SET balance = balance - ?, wallet = wallet - ?
        WHERE id = ? AND balance >= ?
      `).run(amount, amount, user.id, amount);

      if (debit.changes !== 1) {
        throw new Error("Withdrawal balance reservation failed");
      }

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Withdrawal Pending', ?, datetime('now'))
      `).run(user.id, -amount);

      return { withdrawalId: withdrawal.lastInsertRowid };
    })();

    if (result.error) {
      return res.status(result.status).json({ success: false, message: result.error });
    }

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted and amount reserved pending approval",
      withdrawalId: result.withdrawalId
    });
  } catch (error) {
    console.error("Withdrawal request failed:", error);
    res.status(500).json({ success: false, message: "Unable to submit withdrawal" });
  }
});

// User withdrawal history.
router.get("/withdrawals", authenticate, (req, res) => {
  const withdrawals = db.prepare(`
    SELECT id, amount, account, status, date, approved_at
    FROM withdrawals
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);

  res.json({ success: true, withdrawals });
});

// Admin: list withdrawal requests.
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

// Admin: approve only after the real Mobile Money payout has been sent/verified.
// Approval is idempotent and does not debit the user a second time.
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

      const update = db.prepare(`
        UPDATE withdrawals
        SET status = 'approved', approved_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(id);

      if (update.changes !== 1) return { error: "Withdrawal has already been processed", status: 409 };

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Withdrawal Approved', ?, datetime('now'))
      `).run(withdrawal.user_id, 0);

      return { success: true };
    })();

    if (result.error) return res.status(result.status).json({ success: false, message: result.error });

    res.json({
      success: true,
      message: "Withdrawal approved. Confirm the actual Mobile Money payout before using this action."
    });
  } catch (error) {
    console.error("Withdrawal approval failed:", error);
    res.status(500).json({ success: false, message: "Unable to approve withdrawal" });
  }
});

// Admin: reject a pending withdrawal and return the reserved amount exactly once.
router.post("/admin/withdrawals/:id/reject", authenticate, adminOnly, (req, res) => {
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

      const update = db.prepare(`
        UPDATE withdrawals
        SET status = 'rejected', approved_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(id);

      if (update.changes !== 1) return { error: "Withdrawal has already been processed", status: 409 };

      db.prepare(`
        UPDATE users
        SET balance = balance + ?, wallet = wallet + ?
        WHERE id = ?
      `).run(withdrawal.amount, withdrawal.amount, withdrawal.user_id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Withdrawal Refunded', ?, datetime('now'))
      `).run(withdrawal.user_id, withdrawal.amount);

      return { success: true };
    })();

    if (result.error) return res.status(result.status).json({ success: false, message: result.error });

    res.json({ success: true, message: "Withdrawal rejected and reserved balance refunded" });
  } catch (error) {
    console.error("Withdrawal rejection failed:", error);
    res.status(500).json({ success: false, message: "Unable to reject withdrawal" });
  }
});

module.exports = { router };
