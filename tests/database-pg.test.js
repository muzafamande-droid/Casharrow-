const assert = require("node:assert/strict");
const test = require("node:test");

process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgres://postgres:test@localhost:5432/casharrow_test";
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test-admin-password";

test("PostgreSQL data layer initializes and exposes a usable pool", async () => {
  const db = require("../database-pg");
  await db.init();

  const result = await db.query("SELECT COUNT(*)::int AS count FROM users");
  assert.equal(typeof result.rows[0].count, "number");

  const admin = await db.query("SELECT id, role FROM users WHERE role = 'admin' LIMIT 1");
  assert.equal(admin.rowCount, 1);
  assert.equal(admin.rows[0].role, "admin");

  await db.close();
});
