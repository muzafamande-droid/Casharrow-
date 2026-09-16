const express = require("express");
const db = require("./database-pg");
const { releaseDueReferralRewards } = require("./referral-payout-worker");

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

router.get("/referral-summary", authenticateToken, async (req, res) => {
  try {
    await releaseDueReferralRewards();

    const direct = await db.query(
      `SELECT id, name, phone, created_at
         FROM users
        WHERE referred_by = $1
        ORDER BY created_at DESC`,
      [req.user.id]
    );

    const rewards = await db.query(
      `SELECT
          COALESCE(SUM(amount) FILTER (WHERE payout_status = 'pending'), 0) AS pending_amount,
          COALESCE(SUM(amount) FILTER (WHERE payout_status = 'paid'), 0) AS paid_amount,
          COALESCE(SUM(amount), 0) AS total_amount,
          COUNT(*) FILTER (WHERE payout_status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE payout_status = 'paid')::int AS paid_count
       FROM referral_rewards
       WHERE referrer_id = $1`,
      [req.user.id]
    );

    const activity = await db.query(
      `SELECT COUNT(*)::int AS purchases, COALESCE(SUM(r.rental_fee), 0) AS rental_volume
         FROM rentals r
         JOIN users u ON u.id = r.user_id
        WHERE u.referred_by = $1`,
      [req.user.id]
    );

    const nextPayout = await db.query(
      `SELECT MIN(payout_date) AS next_payout
         FROM referral_rewards
        WHERE referrer_id = $1 AND payout_status = 'pending'`,
      [req.user.id]
    );

    res.json({
      success: true,
      payoutDay: 5,
      nextPayoutDate: nextPayout.rows[0].next_payout,
      directMembers: direct.rows,
      directMemberCount: direct.rowCount,
      teamPurchases: Number(activity.rows[0].purchases || 0),
      teamRentalVolume: Number(activity.rows[0].rental_volume || 0),
      pendingReferralEarnings: Number(rewards.rows[0].pending_amount || 0),
      paidReferralEarnings: Number(rewards.rows[0].paid_amount || 0),
      totalReferralEarnings: Number(rewards.rows[0].total_amount || 0),
      pendingReferralCount: Number(rewards.rows[0].pending_count || 0),
      paidReferralCount: Number(rewards.rows[0].paid_count || 0)
    });
  } catch (error) {
    console.error("Referral summary failed:", error);
    res.status(500).json({ success: false, message: "Unable to load referral summary" });
  }
});

module.exports = { router };
