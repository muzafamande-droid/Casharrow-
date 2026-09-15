const db = require('./database-pg');

let running = false;
let schemaReady = false;

const LOCAL_TZ = 'Africa/Kampala';

function localDate(value) {
  const result = new Intl.DateTimeFormat('en-CA', {
    timeZone: LOCAL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(value));
  const parts = Object.fromEntries(result.map(({ type, value }) => [type, value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function addDays(dateText, amount) {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

async function ensureRentalEarningsSchema() {
  if (schemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS rental_earnings (
      id BIGINT PRIMARY KEY,
      rental_id BIGINT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      earning_date DATE NOT NULL,
      amount NUMERIC(18,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (rental_id, earning_date)
    );
  `);
  await db.query('CREATE SEQUENCE IF NOT EXISTS casharrow_rental_earnings_id_seq');
  const maxResult = await db.query('SELECT MAX(id) AS max_id FROM rental_earnings');
  if (maxResult.rows[0].max_id !== null) {
    await db.query("SELECT setval('casharrow_rental_earnings_id_seq', $1, true)", [Number(maxResult.rows[0].max_id)]);
  }
  await db.query('CREATE INDEX IF NOT EXISTS idx_rental_earnings_user ON rental_earnings(user_id, earning_date DESC)');
  await db.query('CREATE INDEX IF NOT EXISTS idx_rental_earnings_rental ON rental_earnings(rental_id, earning_date)');
  schemaReady = true;
}

async function accrueRental(client, rentalId, now = new Date()) {
  const result = await client.query(`
    SELECT id, user_id, rental_days, start_at, end_at, return_amount, status
    FROM rentals
    WHERE id = $1
    FOR UPDATE
  `, [rentalId]);
  if (!result.rowCount) return { processed: 0, completed: false };

  const rental = result.rows[0];
  if (rental.status !== 'active') return { processed: 0, completed: false };

  const days = Number(rental.rental_days);
  const totalReturn = Number(rental.return_amount);
  if (!Number.isInteger(days) || days <= 0 || !Number.isFinite(totalReturn) || totalReturn < 0) {
    throw new Error(`Invalid earning terms for rental ${rental.id}`);
  }

  // Earnings are recorded for the rental period only. They are ledger entries,
  // not wallet credits. The rental cannot complete before end_at.
  const firstDate = addDays(localDate(rental.start_at), 1);
  const today = localDate(now);
  const periodEnded = new Date(now).getTime() >= new Date(rental.end_at).getTime();
  if (today < firstDate && !periodEnded) return { processed: 0, completed: false };

  const existing = await client.query(
    'SELECT earning_date FROM rental_earnings WHERE rental_id = $1 ORDER BY earning_date ASC',
    [rental.id]
  );
  const existingDates = new Set(existing.rows.map(row => String(row.earning_date).slice(0, 10)));
  let earnedDays = existingDates.size;
  const baseDaily = Math.round((totalReturn / days) * 100) / 100;
  let processed = 0;

  // Backfill any missed calendar days. Every rental day counts; weekends do not
  // pause or extend the rental timeframe.
  for (let offset = 0; earnedDays < days; offset += 1) {
    const earningDate = addDays(firstDate, offset);
    if (earningDate > today && !periodEnded) break;
    if (existingDates.has(earningDate)) continue;

    let amount = baseDaily;
    if (earnedDays === days - 1) {
      const currentTotal = (await client.query(
        'SELECT COALESCE(SUM(amount), 0) AS total FROM rental_earnings WHERE rental_id = $1',
        [rental.id]
      )).rows[0].total;
      amount = Math.round((totalReturn - Number(currentTotal || 0)) * 100) / 100;
    }

    if (!Number.isFinite(amount) || amount < 0) throw new Error(`Invalid daily earning for rental ${rental.id}`);

    const inserted = await client.query(`
      INSERT INTO rental_earnings (id, rental_id, user_id, earning_date, amount)
      VALUES (nextval('casharrow_rental_earnings_id_seq'), $1, $2, $3, $4)
      ON CONFLICT (rental_id, earning_date) DO NOTHING
      RETURNING id
    `, [rental.id, rental.user_id, earningDate, amount]);
    if (!inserted.rowCount) continue;

    // IMPORTANT: do not credit balance/wallet here. Rental earnings remain locked
    // until the rental timeframe has actually ended.
    existingDates.add(earningDate);
    earnedDays += 1;
    processed += 1;
  }

  const earnedResult = await client.query(
    'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS days FROM rental_earnings WHERE rental_id = $1',
    [rental.id]
  );
  const generated = Number(earnedResult.rows[0].total || 0);
  earnedDays = Number(earnedResult.rows[0].days || 0);

  // The machine locks only after its actual end_at. At that point the complete
  // configured return becomes available once, regardless of worker timing.
  if (periodEnded && earnedDays >= days) {
    const completed = await client.query(
      "UPDATE rentals SET status = 'completed', completed_at = COALESCE(completed_at, NOW()) WHERE id = $1 AND status = 'active' RETURNING id",
      [rental.id]
    );

    if (completed.rowCount) {
      const amount = totalReturn;
      await client.query(
        'UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2',
        [amount, rental.user_id]
      );
      await client.query(`
        INSERT INTO transactions (id, user_id, type, amount, reference, date)
        VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Return', $2, $3, NOW())
      `, [rental.user_id, amount, `rental-return:${rental.id}`]);
    }

    return { processed, completed: completed.rowCount > 0, generated, earnedDays };
  }

  return { processed, completed: false, generated, earnedDays };
}

async function processRentalEarnings() {
  if (running) return { processed: 0, completed: 0 };
  running = true;
  let processed = 0;
  let completed = 0;
  try {
    await ensureRentalEarningsSchema();
    const result = await db.query(`
      SELECT id
      FROM rentals
      WHERE status = 'active'
      ORDER BY id ASC
      LIMIT 100
    `);

    for (const row of result.rows) {
      const outcome = await db.transaction(client => accrueRental(client, Number(row.id)));
      processed += outcome.processed;
      if (outcome.completed) completed += 1;
    }
    return { processed, completed };
  } finally {
    running = false;
  }
}

function startRentalEarningsWorker() {
  const intervalMs = Math.max(30000, Number(process.env.RENTAL_EARNINGS_INTERVAL_MS || 60000));
  const run = () => processRentalEarnings().catch(error => console.error('Rental earnings worker failed:', error));
  run();
  return setInterval(run, intervalMs);
}

module.exports = { ensureRentalEarningsSchema, accrueRental, processRentalEarnings, startRentalEarningsWorker };
