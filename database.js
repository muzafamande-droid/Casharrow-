const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");
const { Pool } = require("pg");

const sqlite = new Database(
  process.env.DATABASE_PATH || path.join(__dirname, "casharrow.db")
);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
    })
  : null;

// Keep the existing synchronous SQLite API so the referral, wallet, deposit,
// withdrawal and authentication routes do not need to be rewritten at once.
// PostgreSQL is the durable backing store used on Render.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    balance REAL DEFAULT 0,
    wallet REAL DEFAULT 0,
    last_salary REAL DEFAULT 0,
    this_salary REAL DEFAULT 0,
    share REAL DEFAULT 0,
    vip INTEGER DEFAULT 1,
    salary_claimed INTEGER DEFAULT 0,
    last_checkin TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    referral_code TEXT UNIQUE,
    referred_by INTEGER
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    reward REAL,
    done INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    amount REAL,
    claimed INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    type TEXT,
    amount REAL,
    date TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS withdrawals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    amount REAL,
    account TEXT,
    status TEXT DEFAULT 'pending',
    date TEXT,
    approved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS deposits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    network TEXT NOT NULL,
    account TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    date TEXT,
    approved_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    member_name TEXT,
    earn REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS referral_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    referrer_id INTEGER NOT NULL,
    referred_user_id INTEGER NOT NULL UNIQUE,
    amount REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (referrer_id) REFERENCES users(id),
    FOREIGN KEY (referred_user_id) REFERENCES users(id)
  );
`);

const userColumns = sqlite.prepare("PRAGMA table_info(users)").all().map(c => c.name);
if (!userColumns.includes("referral_code")) sqlite.prepare("ALTER TABLE users ADD COLUMN referral_code TEXT").run();
if (!userColumns.includes("referred_by")) sqlite.prepare("ALTER TABLE users ADD COLUMN referred_by INTEGER").run();

const updateReferralCode = sqlite.prepare("UPDATE users SET referral_code = ? WHERE id = ?");
for (const user of sqlite.prepare("SELECT id FROM users WHERE referral_code IS NULL").all()) {
  updateReferralCode.run("CA" + String(user.id).padStart(6, "0"), user.id);
}

const adminExists = sqlite.prepare("SELECT id FROM users WHERE role = ?").get("admin");
if (!adminExists) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("ADMIN_PASSWORD environment variable is not configured");
  const hash = bcrypt.hashSync(adminPassword, 12);
  const info = sqlite.prepare(`
    INSERT INTO users (phone, name, password, role, balance, vip, referral_code)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run("admin", "Admin", hash, "admin", 0, 10, "CAADMIN");
  const adminId = info.lastInsertRowid;
  const insertTask = sqlite.prepare("INSERT INTO tasks (user_id, title, reward) VALUES (?, ?, ?)");
  insertTask.run(adminId, "Invite 3 friends", 500);
  insertTask.run(adminId, "Daily check-in", 50);
  insertTask.run(adminId, "Share app", 200);
  const insertReward = sqlite.prepare("INSERT INTO rewards (user_id, title, amount, claimed) VALUES (?, ?, ?, ?)");
  insertReward.run(adminId, "Welcome", 0, 1);
  insertReward.run(adminId, "VIP Bonus", 500, 0);
}

const tables = [
  { name: "users", columns: ["id","phone","name","password","role","balance","wallet","last_salary","this_salary","share","vip","salary_claimed","last_checkin","created_at","referral_code","referred_by"] },
  { name: "tasks", columns: ["id","user_id","title","reward","done"] },
  { name: "rewards", columns: ["id","user_id","title","amount","claimed"] },
  { name: "transactions", columns: ["id","user_id","type","amount","date"] },
  { name: "withdrawals", columns: ["id","user_id","amount","account","status","date","approved_at"] },
  { name: "deposits", columns: ["id","user_id","amount","network","account","status","date","approved_at"] },
  { name: "team", columns: ["id","user_id","member_name","earn"] },
  { name: "referral_rewards", columns: ["id","referrer_id","referred_user_id","amount","created_at"] }
];

// Record only local mutations. This prevents a second app process with an
// older SQLite snapshot from pushing unrelated stale rows into PostgreSQL.
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS _sync_changes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    row_id INTEGER NOT NULL,
    operation TEXT NOT NULL
  );
`);

for (const table of tables) {
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS ${table.name}_sync_insert
    AFTER INSERT ON ${table.name}
    BEGIN
      INSERT INTO _sync_changes (table_name, row_id, operation)
      VALUES ('${table.name}', NEW.id, 'upsert');
    END;

    CREATE TRIGGER IF NOT EXISTS ${table.name}_sync_update
    AFTER UPDATE ON ${table.name}
    BEGIN
      INSERT INTO _sync_changes (table_name, row_id, operation)
      VALUES ('${table.name}', NEW.id, 'upsert');
    END;

    CREATE TRIGGER IF NOT EXISTS ${table.name}_sync_delete
    AFTER DELETE ON ${table.name}
    BEGIN
      INSERT INTO _sync_changes (table_name, row_id, operation)
      VALUES ('${table.name}', OLD.id, 'delete');
    END;
  `);
}

async function createPostgresSchema() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (id BIGINT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT NOT NULL, role TEXT DEFAULT 'user', balance DOUBLE PRECISION DEFAULT 0, wallet DOUBLE PRECISION DEFAULT 0, last_salary DOUBLE PRECISION DEFAULT 0, this_salary DOUBLE PRECISION DEFAULT 0, share DOUBLE PRECISION DEFAULT 0, vip BIGINT DEFAULT 1, salary_claimed BIGINT DEFAULT 0, last_checkin TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP, referral_code TEXT UNIQUE, referred_by BIGINT);
    CREATE TABLE IF NOT EXISTS tasks (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), title TEXT, reward DOUBLE PRECISION, done BIGINT DEFAULT 0);
    CREATE TABLE IF NOT EXISTS rewards (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), title TEXT, amount DOUBLE PRECISION, claimed BIGINT DEFAULT 0);
    CREATE TABLE IF NOT EXISTS transactions (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), type TEXT, amount DOUBLE PRECISION, date TEXT);
    CREATE TABLE IF NOT EXISTS withdrawals (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), amount DOUBLE PRECISION, account TEXT, status TEXT DEFAULT 'pending', date TEXT, approved_at TEXT);
    CREATE TABLE IF NOT EXISTS deposits (id BIGINT PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id), amount DOUBLE PRECISION NOT NULL, network TEXT NOT NULL, account TEXT NOT NULL, status TEXT DEFAULT 'pending', date TEXT, approved_at TEXT);
    CREATE TABLE IF NOT EXISTS team (id BIGINT PRIMARY KEY, user_id BIGINT REFERENCES users(id), member_name TEXT, earn DOUBLE PRECISION DEFAULT 0);
    CREATE TABLE IF NOT EXISTS referral_rewards (id BIGINT PRIMARY KEY, referrer_id BIGINT NOT NULL REFERENCES users(id), referred_user_id BIGINT NOT NULL UNIQUE REFERENCES users(id), amount DOUBLE PRECISION NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
  `);
}

async function syncAllToPostgres() {
  if (!pool) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const table of tables) {
      const rows = sqlite.prepare(`SELECT ${table.columns.join(", ")} FROM ${table.name}`).all();
      for (const row of rows) {
        const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(", ");
        const updates = table.columns
          .filter(column => column !== "id")
          .map(column => `${column} = EXCLUDED.${column}`)
          .join(", ");
        await client.query(
          `INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates}`,
          table.columns.map(column => row[column])
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function syncPendingChanges() {
  if (!pool) return;
  const changes = sqlite
    .prepare("SELECT seq, table_name, row_id, operation FROM _sync_changes ORDER BY seq")
    .all();

  if (!changes.length) return;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const change of changes) {
      const table = tables.find(item => item.name === change.table_name);
      if (!table) continue;

      if (change.operation === "delete") {
        await client.query(`DELETE FROM ${table.name} WHERE id = $1`, [change.row_id]);
        continue;
      }

      const row = sqlite
        .prepare(`SELECT ${table.columns.join(", ")} FROM ${table.name} WHERE id = ?`)
        .get(change.row_id);

      // The row may have been deleted after the journal event was recorded.
      // The later delete event remains in the journal and will be applied too.
      if (!row) continue;

      const placeholders = table.columns.map((_, i) => `$${i + 1}`).join(", ");
      const updates = table.columns
        .filter(column => column !== "id")
        .map(column => `${column} = EXCLUDED.${column}`)
        .join(", ");
      await client.query(
        `INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updates}`,
        table.columns.map(column => row[column])
      );
    }

    await client.query("COMMIT");

    const maxSeq = changes[changes.length - 1].seq;
    sqlite.prepare("DELETE FROM _sync_changes WHERE seq <= ?").run(maxSeq);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function restoreFromPostgres() {
  if (!pool) return;
  const pgCount = Number((await pool.query("SELECT COUNT(*) AS count FROM users")).rows[0].count);
  if (!pgCount) {
    await syncAllToPostgres();
    sqlite.prepare("DELETE FROM _sync_changes").run();
    return;
  }

  sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const table of [...tables].reverse()) sqlite.prepare(`DELETE FROM ${table.name}`).run();
  for (const table of tables) {
    const rows = (await pool.query(`SELECT ${table.columns.join(", ")} FROM ${table.name}`)).rows;
    if (!rows.length) continue;
    const insert = sqlite.prepare(`INSERT INTO ${table.name} (${table.columns.join(", ")}) VALUES (${table.columns.map(() => "?").join(", ")})`);
    const restore = sqlite.transaction(items => {
      for (const row of items) insert.run(...table.columns.map(column => row[column]));
    });
    restore(rows);
  }
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.prepare("DELETE FROM _sync_changes").run();
}

let syncQueue = Promise.resolve();
let syncEnabled = false;

function queueSync() {
  if (!pool || !syncEnabled) return;
  syncQueue = syncQueue
    .then(syncPendingChanges)
    .catch(error => console.error("PostgreSQL sync queue failed:", error));
}

const ready = pool
  ? createPostgresSchema()
      .then(restoreFromPostgres)
      .then(() => {
        syncEnabled = true;
      })
  : Promise.resolve();

const db = {
  prepare(sql) {
    const statement = sqlite.prepare(sql);
    return {
      get: (...params) => statement.get(...params),
      all: (...params) => statement.all(...params),
      run: (...params) => {
        const result = statement.run(...params);
        queueSync();
        return result;
      }
    };
  },
  transaction(fn) {
    const transaction = sqlite.transaction(fn);
    return (...args) => {
      const result = transaction(...args);
      queueSync();
      return result;
    };
  },
  exec(sql) {
    const result = sqlite.exec(sql);
    queueSync();
    return result;
  },
  close() {
    sqlite.close();
    if (pool) pool.end().catch(error => console.error("PostgreSQL close failed:", error));
  },
  ready,
  flushPersistence() {
    return ready.then(() => syncQueue);
  }
};

module.exports = db;
