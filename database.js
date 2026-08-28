const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'casharrow.db'));

db.exec(`
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
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    member_name TEXT,
    earn REAL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  const info = db.prepare(`
    INSERT INTO users (phone, name, password, role, balance, vip)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin', 'Admin', hash, 'admin', 0, 10);

  const adminId = info.lastInsertRowid;
  const insertTask = db.prepare('INSERT INTO tasks (user_id, title, reward) VALUES (?, ?, ?)');
  insertTask.run(adminId, 'Invite 3 friends', 500);
  insertTask.run(adminId, 'Daily check-in', 50);
  insertTask.run(adminId, 'Share app', 200);

  const insertReward = db.prepare('INSERT INTO rewards (user_id, title, amount, claimed) VALUES (?, ?, ?, ?)');
  insertReward.run(adminId, 'Welcome', 0, 1);
  insertReward.run(adminId, 'VIP Bonus', 500, 0);
}

module.exports = db;
