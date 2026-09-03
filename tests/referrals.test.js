const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const databasePath = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "casharrow-referrals-")),
  "casharrow.db"
);

process.env.DATABASE_PATH = databasePath;
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const db = require("../database");
const app = require("../server");

let server;
let baseUrl;

function post(pathname, body, headers = {}) {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

async function login(phone, password) {
  const response = await post("/api/login", { phone, password });
  const data = await response.json();
  return { response, data };
}

test.before(async () => {
  await db.ready;
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await db.flushPersistence();
  await new Promise(resolve => server.close(resolve));
  db.close();
  fs.rmSync(databasePath, { force: true });
});

test("referrals save the link owner, grow their team, and reward exactly once", async () => {
  const referrerResponse = await post("/api/register", {
    phone: "0700000002",
    name: "Referrer",
    password: "password",
    confirmPassword: "password"
  });
  assert.equal(referrerResponse.status, 201);

  const referredResponse = await post("/api/register", {
    phone: "0700000003",
    name: "Referred",
    password: "password",
    confirmPassword: "password",
    referralCode: "CA000002"
  });
  assert.equal(referredResponse.status, 201);

  const referrer = db.prepare("SELECT * FROM users WHERE phone = ?")
    .get("0700000002");
  assert.ok(referrer);

  const referred = db.prepare("SELECT * FROM users WHERE phone = ?")
    .get("0700000003");
  assert.equal(referred.referred_by, referrer.id);

  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM team WHERE user_id = ? AND member_name = ?")
      .get(referrer.id, "Referred").count,
    1
  );

  assert.equal(referrer.balance, 5000);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM referral_rewards WHERE referred_user_id = ?")
      .get(referred.id).count,
    1
  );

  const duplicateResponse = await post("/api/register", {
    phone: "0700000004",
    name: "Duplicate referral",
    password: "password",
    confirmPassword: "password",
    referralCode: "CA000002"
  });
  assert.equal(duplicateResponse.status, 201);

  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id = ?").get(referrer.id).balance,
    10000
  );
});

test("registration rejects mismatched passwords", async () => {
  const response = await post("/api/register", {
    phone: "0700000099",
    name: "Mismatch",
    password: "password",
    confirmPassword: "different"
  });
  assert.equal(response.status, 400);
});

test("deposits stay pending until approved and are credited exactly once", async () => {
  const referrer = db.prepare("SELECT id FROM users WHERE phone = ?")
    .get("0700000002");
  assert.ok(referrer);

  const { response: loginResponse, data: loginData } = await login(
    "0700000002",
    "password"
  );
  assert.equal(loginResponse.status, 200);

  const authHeaders = {
    Authorization: `Bearer ${loginData.token}`,
    "Content-Type": "application/json"
  };

  const depositResponse = await post("/api/deposits", {
    amount: 10000,
    network: "MTN",
    account: "0700000002"
  }, authHeaders);
  const deposit = await depositResponse.json();

  assert.equal(depositResponse.status, 201);
  assert.equal(deposit.success, true);

  // A pending deposit must not increase the balance before admin approval.
  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id = ?").get(referrer.id).balance,
    10000
  );

  const { response: adminLoginResponse, data: adminLogin } = await login(
    "admin",
    process.env.ADMIN_PASSWORD
  );
  assert.equal(adminLoginResponse.status, 200);

  const adminHeaders = {
    Authorization: `Bearer ${adminLogin.token}`,
    "Content-Type": "application/json"
  };

  const approveResponse = await fetch(`${baseUrl}/api/admin/deposits/${deposit.depositId}/approve`, {
    method: "POST",
    headers: adminHeaders
  });
  assert.equal(approveResponse.status, 200);

  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id = ?").get(referrer.id).balance,
    20000
  );

  const secondApprove = await fetch(`${baseUrl}/api/admin/deposits/${deposit.depositId}/approve`, {
    method: "POST",
    headers: adminHeaders
  });
  assert.equal(secondApprove.status, 409);
  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id = ?").get(referrer.id).balance,
    20000
  );

  const depositTransaction = db.prepare(
    "SELECT * FROM transactions WHERE user_id = ? AND type = 'Deposit' AND amount = ?"
  ).get(referrer.id, 10000);
  assert.ok(depositTransaction);
});