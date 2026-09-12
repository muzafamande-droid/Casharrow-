const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('./database-pg');
const { ensureRentalEarningsSchema } = require('./rental-earnings-worker');

const router = express.Router();

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired session' });
  }
}

router.get('/api/rental-earnings', authenticate, async (req, res) => {
  try {
    await ensureRentalEarningsSchema();
    const result = await db.query(`
      SELECT
        r.id,
        r.product_id,
        p.code,
        p.name,
        r.rental_fee,
        r.rental_days,
        r.start_at,
        r.end_at,
        r.status,
        r.return_amount,
        ROUND(r.return_amount / NULLIF(r.rental_days, 0), 2) AS daily_amount,
        COALESCE(SUM(e.amount), 0) AS generated_total,
        COUNT(e.id) AS days_earned,
        GREATEST(r.rental_days - COUNT(e.id), 0) AS days_remaining
      FROM rentals r
      JOIN products p ON p.id = r.product_id
      LEFT JOIN rental_earnings e ON e.rental_id = r.id
      WHERE r.user_id = $1
      GROUP BY r.id, p.id
      ORDER BY r.id DESC
    `, [req.user.id]);

    const history = await db.query(`
      SELECT rental_id, earning_date, amount
      FROM rental_earnings
      WHERE user_id = $1
      ORDER BY earning_date DESC, rental_id DESC
      LIMIT 500
    `, [req.user.id]);

    res.json({ success: true, rentals: result.rows, history: history.rows });
  } catch (error) {
    console.error('Rental earnings lookup failed:', error);
    res.status(500).json({ success: false, message: 'Unable to load rental earnings' });
  }
});

module.exports = router;
