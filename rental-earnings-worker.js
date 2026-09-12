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

  const firstDate = addDays(localDate(rental.start_at), 1);
  const today = localDate(now);
  const endDate = localDate(rental.end_at);
  const lastDueDate = today < endDate ? today : endDate;
  if (lastDueDate < firstDate) return { processed: 0, completed: false };

  const existing = await client.query(
    'SELECT earning_date FROM rental_earnings WHERE rental_id = $1 ORDER BY earning_date ASC',
    [rental.id]
  );
  const existingDates = new Set(existing.rows.map(row => String(row.earning_date).slice(0, 10)));
  const baseDaily = Math.round((totalReturn / days) * 100) / 100;
  let processed = 0;

  for (let offset = 0; offset < days; offset += 1) {
    const earningDate = addDays(firstDate, offset);
    if (earningDate > lastDueDate) break;
    if (existingDates.has(earningDate)) continue;

    let amount = baseDaily;
    if (offset === days - 1) {
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

    await client.query(
      'UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2',
      [amount, rental.user_id]
    );
    await client.query(`
      INSERT INTO transactions (id, user_id, type, amount, reference, date)
      VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Rental Daily Income', $2, $3, NOW())
    `, [rental.user_id, amount, `rental-daily:${rental.id}:${earningDate}`]);

    existingDates.add(earningDate);
    processed += 1;
  }

  const earnedResult = await client.query(
    'SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS days FROM rental_earnings WHERE rental_id = $1',
    [rental.id]
  );
  const generated = Number(earnedResult.rows[0].total || 0);
  const earnedDays = Number(earnedResult.rows[0].days || 0);
  const shouldComplete = new Date(rental.end_at).getTime() <= now.getTime() || earnedDays >= days;

  if (shouldComplete) {
    await client.query(
      "UPDATE rentals SET status = 'completed', completed_at = COALESCE(completed_at, NOW()) WHERE id = $1 AND status = 'active'",
      [rental.id]
    );
  }

  return { processed, completed: shouldComplete, generated, earnedDays };
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
