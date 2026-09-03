const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not configured");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: Number(process.env.PG_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function query(text, params) {
  return pool.query(text, params);
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      wallet NUMERIC(18,2) NOT NULL DEFAULT 0,
      reserved_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
      last_salary NUMERIC(18,2) NOT NULL DEFAULT 0,
      this_salary NUMERIC(18,2) NOT NULL DEFAULT 0,
      share NUMERIC(18,2) NOT NULL DEFAULT 0,
      vip INTEGER NOT NULL DEFAULT 1,
      salary_claimed INTEGER NOT NULL DEFAULT 0,
      last_checkin TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      referral_code TEXT UNIQUE,
      referred_by BIGINT REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      reward NUMERIC(18,2) NOT NULL DEFAULT 0,
      done INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS rewards (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount NUMERIC(18,2) NOT NULL DEFAULT 0,
      claimed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      amount NUMERIC(18,2) NOT NULL,
      reference TEXT,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS withdrawals (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(18,2) NOT NULL,
      account TEXT NOT NULL,
      network TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      provider_reference TEXT,
      idempotency_key TEXT,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS deposits (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount NUMERIC(18,2) NOT NULL,
      network TEXT NOT NULL,
      account TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      provider_reference TEXT,
      idempotency_key TEXT,
      date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS team (
      id BIGINT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      member_name TEXT NOT NULL,
      earn NUMERIC(18,2) NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS referral_rewards (
      id BIGINT PRIMARY KEY,
      referrer_id BIGINT NOT NULL REFERENCES users(id),
      referred_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id),
      amount NUMERIC(18,2) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE SEQUENCE IF NOT EXISTS casharrow_users_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_tasks_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_rewards_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_transactions_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_withdrawals_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_deposits_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_team_id_seq;
    CREATE SEQUENCE IF NOT EXISTS casharrow_referral_rewards_id_seq;

    SELECT setval('casharrow_users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0), true);
    SELECT setval('casharrow_tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 0), true);
    SELECT setval('casharrow_rewards_id_seq', COALESCE((SELECT MAX(id) FROM rewards), 0), true);
    SELECT setval('casharrow_transactions_id_seq', COALESCE((SELECT MAX(id) FROM transactions), 0), true);
    SELECT setval('casharrow_withdrawals_id_seq', COALESCE((SELECT MAX(id) FROM withdrawals), 0), true);
    SELECT setval('casharrow_deposits_id_seq', COALESCE((SELECT MAX(id) FROM deposits), 0), true);
    SELECT setval('casharrow_team_id_seq', COALESCE((SELECT MAX(id) FROM team), 0), true);
    SELECT setval('casharrow_referral_rewards_id_seq', COALESCE((SELECT MAX(id) FROM referral_rewards), 0), true);

    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
    CREATE INDEX IF NOT EXISTS idx_deposits_user ON deposits(user_id);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
    CREATE INDEX IF NOT EXISTS idx_team_user ON team(user_id);
    CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_rewards(referrer_id);
  `);

  // Add columns required by newer deployments without destroying existing data.
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS reserved_balance NUMERIC(18,2) NOT NULL DEFAULT 0");
  await query("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference TEXT");
  await query("ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS network TEXT");
  await query("ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS provider_reference TEXT");
  await query("ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS idempotency_key TEXT");
  await query("ALTER TABLE deposits ADD COLUMN IF NOT EXISTS provider_reference TEXT");
  await query("ALTER TABLE deposits ADD COLUMN IF NOT EXISTS idempotency_key TEXT");

  for (const table of ["users", "tasks", "rewards", "transactions", "withdrawals", "deposits", "team", "referral_rewards"]) {
    const moneyColumns = {
      users: ["balance", "wallet", "reserved_balance", "last_salary", "this_salary", "share"],
      tasks: ["reward"],
      rewards: ["amount"],
      transactions: ["amount"],
      withdrawals: ["amount"],
      deposits: ["amount"],
      team: ["earn"],
      referral_rewards: ["amount"]
    }[table];
    for (const column of moneyColumns) {
      await query(`ALTER TABLE ${table} ALTER COLUMN ${column} TYPE NUMERIC(18,2) USING ${column}::numeric`);
    }
  }

  await query("CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_idempotency_key ON deposits(idempotency_key) WHERE idempotency_key IS NOT NULL");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS uq_deposits_provider_reference ON deposits(provider_reference) WHERE provider_reference IS NOT NULL");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawals_idempotency_key ON withdrawals(idempotency_key) WHERE idempotency_key IS NOT NULL");
  await query("CREATE UNIQUE INDEX IF NOT EXISTS uq_withdrawals_provider_reference ON withdrawals(provider_reference) WHERE provider_reference IS NOT NULL");

  const admin = await query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  if (admin.rowCount === 0) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) throw new Error("ADMIN_PASSWORD environment variable is not configured");
    const hash = await bcrypt.hash(password, 12);
    await transaction(async client => {
      const user = await client.query(`
        INSERT INTO users (id, phone, name, password, role, vip, referral_code)
        VALUES (nextval('casharrow_users_id_seq'), 'admin', 'Admin', $1, 'admin', 10, 'CAADMIN')
        ON CONFLICT (phone) DO NOTHING
        RETURNING id
      `, [hash]);
      if (!user.rowCount) return;
      const id = user.rows[0].id;
      await client.query(`INSERT INTO tasks (id,user_id,title,reward) VALUES (nextval('casharrow_tasks_id_seq'),$1,'Invite 3 friends',500),(nextval('casharrow_tasks_id_seq'),$1,'Daily check-in',50),(nextval('casharrow_tasks_id_seq'),$1,'Share app',200)`, [id]);
      await client.query(`INSERT INTO rewards (id,user_id,title,amount,claimed) VALUES (nextval('casharrow_rewards_id_seq'),$1,'Welcome',0,1),(nextval('casharrow_rewards_id_seq'),$1,'VIP Bonus',500,0)`, [id]);
    });
  }
}

async function close() {
  await pool.end();
}

module.exports = { pool, query, transaction, init, close };
