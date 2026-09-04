const db = require("./database-pg");

let running = false;

async function processExpiredRentals() {
  if (running) return { processed: 0 };
  running = true;
  let processed = 0;
  try {
    const result = await db.query("SELECT id FROM rentals WHERE status = 'active' AND end_at <= NOW() ORDER BY id ASC LIMIT 100");
    for (const row of result.rows) {
      const completed = await db.transaction(async client => {
        const rentalResult = await client.query("SELECT id, user_id, return_amount, status, end_at FROM rentals WHERE id = $1 FOR UPDATE", [row.id]);
        if (!rentalResult.rowCount) return false;
        const rental = rentalResult.rows[0];
        if (rental.status !== "active" || new Date(rental.end_at).getTime() > Date.now()) return false;
        const amount = Number(rental.return_amount);
        if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid return amount for rental ${rental.id}`);

        const updated = await client.query("UPDATE rentals SET status='completed', completed_at=NOW() WHERE id=$1 AND status='active' RETURNING id", [rental.id]);
        if (!updated.rowCount) return false;
        await client.query("UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2", [amount, rental.user_id]);
        await client.query("INSERT INTO transactions (id, user_id, type, amount, reference, date) VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Return', $2, $3, NOW())", [rental.user_id, amount, `rental-return:${rental.id}`]);
        return true;
      });
      if (completed) processed += 1;
    }
    return { processed };
  } finally {
    running = false;
  }
}

function startRentalExpiryWorker() {
  const intervalMs = Math.max(30000, Number(process.env.RENTAL_EXPIRY_INTERVAL_MS || 60000));
  const run = () => processExpiredRentals().catch(error => console.error("Rental expiry worker failed:", error));
  run();
  return setInterval(run, intervalMs);
}

module.exports = { processExpiredRentals, startRentalExpiryWorker };
