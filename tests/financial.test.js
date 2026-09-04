const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const financial = require("../financial-pg-v2");
const app = require("../server-production");

const testPhone = `0733${Date.now().toString().slice(-7)}`;
let userId;
let server;
let baseUrl;

function tokenFor(id, role = "user") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "1h" });
}

async function post(pathname, body, token) {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });
}

test.before(async () => {
  await pgDb.init();
  const result = await pgDb.query(
    `INSERT INTO users
      (id, phone, name, password, role, balance, wallet, reserved_balance, vip, referral_code)
     VALUES
      (nextval('casharrow_users_id_seq'), $1, 'Financial Test User', 'not-used', 'user', 100000, 100000, 0, 1, $2)
     RETURNING id`,
    [testPhone, `TEST${Date.now()}`]
  );
  userId = result.rows[0].id;
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pgDb.query("DELETE FROM deposits WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM withdrawals WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM transactions WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM users WHERE id = $1", [userId]);
  await pgDb.close();
});

test("deposit idempotency and approval credit the wallet exactly once", async () => {
  const first = await financial.createDeposit({ userId, amount: 50000, network: "MTN", account: "256700000001", idempotencyKey: `deposit-${Date.now()}` });
  const duplicate = await financial.createDeposit({ userId, amount: 50000, network: "MTN", account: "256700000001", idempotencyKey: first.idempotency_key });
  assert.equal(Number(duplicate.id), Number(first.id));
  assert.equal(first.status, "pending");

  const approved = await financial.approveDeposit(first.id, { providerReference: `provider-${Date.now()}` });
  assert.equal(approved.status, "approved");
  assert.equal((await financial.approveDeposit(first.id)).status, "approved");

  const user = (await pgDb.query("SELECT balance, wallet, reserved_balance FROM users WHERE id = $1", [userId])).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 0);

  const transactions = await pgDb.query("SELECT COUNT(*) AS count FROM transactions WHERE user_id = $1 AND type = 'Deposit'", [userId]);
  assert.equal(Number(transactions.rows[0].count), 1);
});

test("withdrawal reserves funds and rejection releases the reservation", async () => {
  const withdrawal = await financial.createWithdrawal({ userId, amount: 25000, account: "256700000001", network: "AIRTEL", idempotencyKey: `withdrawal-reject-${Date.now()}` });
  assert.equal(withdrawal.status, "pending");

  let user = (await pgDb.query("SELECT balance, wallet, reserved_balance FROM users WHERE id = $1", [userId])).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 25000);

  const duplicate = await financial.createWithdrawal({ userId, amount: 25000, account: "256700000001", network: "AIRTEL", idempotencyKey: withdrawal.idempotency_key });
  assert.equal(Number(duplicate.id), Number(withdrawal.id));
  assert.equal((await financial.rejectWithdrawal(withdrawal.id)).status, "rejected");
  assert.equal((await financial.rejectWithdrawal(withdrawal.id)).status, "rejected");

  user = (await pgDb.query("SELECT balance, wallet, reserved_balance FROM users WHERE id = $1", [userId])).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 0);
});

test("approved withdrawal requires a payout provider reference", async () => {
  const withdrawal = await financial.createWithdrawal({ userId, amount: 10000, account: "256700000001", network: "MTN", idempotencyKey: `withdrawal-reference-required-${Date.now()}` });

  await assert.rejects(
    () => financial.approveWithdrawal(withdrawal.id),
    /Provider reference is required before approving a withdrawal/
  );

  const user = (await pgDb.query("SELECT balance, wallet, reserved_balance FROM users WHERE id = $1", [userId])).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 10000);

  const current = (await pgDb.query("SELECT status, provider_reference FROM withdrawals WHERE id = $1", [withdrawal.id])).rows[0];
  assert.equal(current.status, "pending");
  assert.equal(current.provider_reference, null);

  await financial.rejectWithdrawal(withdrawal.id);
});

test("approved withdrawal debits balance once and clears reservation", async () => {
  const withdrawal = await financial.createWithdrawal({ userId, amount: 40000, account: "256700000001", network: "MTN", idempotencyKey: `withdrawal-approve-${Date.now()}` });
  const approved = await financial.approveWithdrawal(withdrawal.id, { providerReference: `withdraw-provider-${Date.now()}` });
  assert.equal(approved.status, "approved");
  assert.equal((await financial.approveWithdrawal(withdrawal.id, { providerReference: approved.provider_reference })).status, "approved");

  const user = (await pgDb.query("SELECT balance, wallet, reserved_balance FROM users WHERE id = $1", [userId])).rows[0];
  assert.equal(Number(user.balance), 110000);
  assert.equal(Number(user.wallet), 110000);
  assert.equal(Number(user.reserved_balance), 0);

  const transactions = await pgDb.query("SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1 AND type = 'Withdrawal'", [userId]);
  assert.equal(Number(transactions.rows[0].count), 1);
  assert.equal(Number(transactions.rows[0].total), -40000);
});

test("admin money endpoints enforce authentication and admin role", async () => {
  const deposit = await financial.createDeposit({ userId, amount: 10000, network: "MTN", account: "256700000001", idempotencyKey: `admin-deposit-${Date.now()}` });

  const unauthenticated = await post(`/api/admin/deposits/${deposit.id}/approve`, {});
  assert.equal(unauthenticated.status, 401);

  const forbidden = await post(`/api/admin/deposits/${deposit.id}/approve`, {}, tokenFor(userId, "user"));
  assert.equal(forbidden.status, 403);

  const approved = await post(`/api/admin/deposits/${deposit.id}/approve`, { providerReference: `admin-provider-${Date.now()}` }, tokenFor(999999999, "admin"));
  assert.equal(approved.status, 200);
  assert.equal((await approved.json()).deposit.status, "approved");

  const approvedAgain = await post(`/api/admin/deposits/${deposit.id}/approve`, {}, tokenFor(999999999, "admin"));
  assert.equal(approvedAgain.status, 200);
  assert.equal((await approvedAgain.json()).deposit.status, "approved");

  const withdrawal = await financial.createWithdrawal({ userId, amount: 5000, account: "256700000001", network: "MTN", idempotencyKey: `admin-withdrawal-${Date.now()}` });

  const withdrawalUnauthenticated = await post(`/api/admin/withdrawals/${withdrawal.id}/approve`, {});
  assert.equal(withdrawalUnauthenticated.status, 401);

  const withdrawalForbidden = await post(`/api/admin/withdrawals/${withdrawal.id}/approve`, { providerReference: "forbidden-ref" }, tokenFor(userId, "user"));
  assert.equal(withdrawalForbidden.status, 403);

  const missingReference = await post(`/api/admin/withdrawals/${withdrawal.id}/approve`, {}, tokenFor(999999999, "admin"));
  assert.equal(missingReference.status, 400);

  const withdrawalApproved = await post(`/api/admin/withdrawals/${withdrawal.id}/approve`, { providerReference: `admin-withdraw-provider-${Date.now()}` }, tokenFor(999999999, "admin"));
  assert.equal(withdrawalApproved.status, 200);
  assert.equal((await withdrawalApproved.json()).withdrawal.status, "approved");
});
