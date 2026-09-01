const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { Pool } = require("pg");
const test = require("node:test");

test("PostgreSQL persistence preserves unrelated concurrent process updates", { skip: !process.env.DATABASE_URL }, async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "casharrow-persistence-integration-"));
  const readyA = path.join(tempDir, "ready-a");
  const readyB = path.join(tempDir, "ready-b");
  const goFile = path.join(tempDir, "go");
  const userA = 900001;
  const userB = 900002;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const childSource = `
    const fs = require("node:fs");
    const db = require(${JSON.stringify(path.join(__dirname, "..", "database.js"))});
    const id = Number(process.env.TEST_USER_ID);
    const readyFile = process.env.TEST_READY_FILE;
    const goFile = process.env.TEST_GO_FILE;
    (async () => {
      await db.ready;
      fs.writeFileSync(readyFile, "ready");
      while (!fs.existsSync(goFile)) await new Promise(resolve => setTimeout(resolve, 10));
      db.prepare("UPDATE users SET balance = ? WHERE id = ?").run(id === 900001 ? 111 : 222, id);
      await db.flushPersistence();
      db.close();
    })().catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
  `;

  function runChild(id, readyFile) {
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ["-e", childSource], {
        cwd: path.join(__dirname, ".."),
        env: {
          ...process.env,
          DATABASE_PATH: path.join(tempDir, `sqlite-${id}.db`),
          TEST_USER_ID: String(id),
          TEST_READY_FILE: readyFile,
          TEST_GO_FILE: goFile,
          ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "test-admin-password"
        },
        stdio: ["ignore", "pipe", "pipe"]
      });

      let stderr = "";
      child.stderr.on("data", chunk => { stderr += chunk.toString(); });
      child.on("error", reject);
      child.on("exit", code => {
        if (code === 0) resolve();
        else reject(new Error(`child ${id} exited with code ${code}: ${stderr}`));
      });
    });
  }

  try {
    await pool.query(`
      DELETE FROM referral_rewards WHERE referred_user_id IN ($1, $2);
      DELETE FROM team WHERE user_id IN ($1, $2);
      DELETE FROM transactions WHERE user_id IN ($1, $2);
      DELETE FROM deposits WHERE user_id IN ($1, $2);
      DELETE FROM withdrawals WHERE user_id IN ($1, $2);
      DELETE FROM rewards WHERE user_id IN ($1, $2);
      DELETE FROM tasks WHERE user_id IN ($1, $2);
      DELETE FROM users WHERE id IN ($1, $2);
    `, [userA, userB]);

    await pool.query(`
      INSERT INTO users (id, phone, name, password, role, balance, wallet, referral_code)
      VALUES
        ($1, '0900000001', 'Persistence A', 'test-password', 'user', 0, 0, 'CA900001'),
        ($2, '0900000002', 'Persistence B', 'test-password', 'user', 0, 0, 'CA900002')
    `, [userA, userB]);

    const childA = runChild(userA, readyA);
    const childB = runChild(userB, readyB);

    for (let i = 0; i < 200 && (!fs.existsSync(readyA) || !fs.existsSync(readyB)); i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.ok(fs.existsSync(readyA), "process A did not finish PostgreSQL restore");
    assert.ok(fs.existsSync(readyB), "process B did not finish PostgreSQL restore");

    fs.writeFileSync(goFile, "go");
    await Promise.all([childA, childB]);

    const rows = await pool.query(
      "SELECT id, balance FROM users WHERE id IN ($1, $2) ORDER BY id",
      [userA, userB]
    );

    assert.deepEqual(rows.rows.map(row => ({ id: Number(row.id), balance: Number(row.balance) })), [
      { id: userA, balance: 111 },
      { id: userB, balance: 222 }
    ]);
  } finally {
    await pool.query(
      "DELETE FROM users WHERE id IN ($1, $2)",
      [userA, userB]
    ).catch(() => {});
    await pool.end();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
