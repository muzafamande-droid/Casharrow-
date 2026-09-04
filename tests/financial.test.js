const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const financial = require("../financial-pg-v2");

const testPhone = `0733${Date.now().toString().slice(-7)}`;
let userId;

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
});

test.after(async () => {
  await pgDb.query("DELETE FROM deposits WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM withdrawals WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM transactions WHERE user_id = $1", [userId]);
  await pgDb.query("DELETE FROM users WHERE id = $1", [userId]);
  await pgDb.close();
});

test("deposit idempotency and approval credit the wallet exactly once", async () => {
  const first = await financial.createDeposit({
    userId,
    amount: 50000,
    network: "MTN",
    account: "256700000001",
    idempotencyKey: `deposit-${Date.now()}`
  });
  const duplicate = await financial.createDeposit({
    userId,
    amount: 50000,
    network: "MTN",
    account: "256700000001",
    idempotencyKey: first.idempotency_key
  });

  assert.equal(Number(duplicate.id), Number(first.id));
  assert.equal(first.status, "pending");

  const approved = await financial.approveDeposit(first.id, {
    providerReference: `provider-${Date.now()}`
  });
  assert.equal(approved.status, "approved");

  const approvedAgain = await financial.approveDeposit(first.id);
  assert.equal(approvedAgain.status, "approved");

  const user = (await pgDb.query(
    "SELECT balance, wallet, reserved_balance FROM users WHERE id = $1",
    [userId]
  )).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 0);

  const transactions = await pgDb.query(
    "SELECT COUNT(*) AS count FROM transactions WHERE user_id = $1 AND type = 'Deposit'",
    [userId]
  );
  assert.equal(Number(transactions.rows[0].count), 1);
});

test("withdrawal reserves funds and rejection releases the reservation", async () => {
  const withdrawal = await financial.createWithdrawal({
    userId,
    amount: 25000,
    account: "256700000001",
    network: "AIRTEL",
    idempotencyKey: `withdrawal-reject-${Date.now()}`
  });
  assert.equal(withdrawal.status, "pending");

  let user = (await pgDb.query(
    "SELECT balance, wallet, reserved_balance FROM users WHERE id = $1",
    [userId]
  )).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 25000);

  const duplicate = await financial.createWithdrawal({
    userId,
    amount: 25000,
    account: "256700000001",
    network: "AIRTEL",
    idempotencyKey: withdrawal.idempotency_key
  });
  assert.equal(Number(duplicate.id), Number(withdrawal.id));

  const rejected = await financial.rejectWithdrawal(withdrawal.id);
  assert.equal(rejected.status, "rejected");

  const rejectedAgain = await financial.rejectWithdrawal(withdrawal.id);
  assert.equal(rejectedAgain.status, "rejected");

  user = (await pgDb.query(
    "SELECT balance, wallet, reserved_balance FROM users WHERE id = $1",
    [userId]
  )).rows[0];
  assert.equal(Number(user.balance), 150000);
  assert.equal(Number(user.wallet), 150000);
  assert.equal(Number(user.reserved_balance), 0);
});

test("approved withdrawal debits balance once and clears reservation", async () => {
  const withdrawal = await financial.createWithdrawal({
    userId,
    amount: 40000,
    account: "256700000001",
    network: "MTN",
    idempotencyKey: `withdrawal-approve-${Date.now()}`
  });

  const approved = await financial.approveWithdrawal(withdrawal.id, {
    providerReference: `withdraw-provider-${Date.now()}`
  });
  assert.equal(approved.status, "approved");

  const approvedAgain = await financial.approveWithdrawal(withdrawal.id);
  assert.equal(approvedAgain.status, "approved");

  const user = (await pgDb.query(
    "SELECT balance, wallet, reserved_balance FROM users WHERE id = $1",
    [userId]
  )).rows[0];
  assert.equal(Number(user.balance), 110000);
  assert.equal(Number(user.wallet), 110000);
  assert.equal(Number(user.reserved_balance), 0);

  const transactions = await pgDb.query(
    "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE user_id = $1 AND type = 'Withdrawal'",
    [userId]
  );
  assert.equal(Number(transactions.rows[0].count), 1);
  assert.equal(Number(transactions.rows[0].total), -40000);
});
