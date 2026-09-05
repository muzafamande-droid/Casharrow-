const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const financial = require("../financial-pg-v2");

let userA;
let userB;

async function createTestUser(label) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await pgDb.query(
    `INSERT INTO users
      (id, phone, name, password, role, balance, wallet, reserved_balance, vip, referral_code)
     VALUES
      (nextval('casharrow_users_id_seq'), $1, $2, 'not-used', 'user', 100000, 100000, 0, 1, $3)
     RETURNING id`,
    [`07${stamp.slice(-8)}`, label, `ISO${stamp.replace(/[^A-Za-z0-9]/g, "").slice(-10)}`]
  );
  return result.rows[0].id;
}

test.before(async () => {
  await pgDb.init();
  userA = await createTestUser("Financial Isolation A");
  userB = await createTestUser("Financial Isolation B");
});

test.after(async () => {
  for (const userId of [userA, userB]) {
    await pgDb.query("DELETE FROM deposits WHERE user_id = $1", [userId]);
    await pgDb.query("DELETE FROM withdrawals WHERE user_id = $1", [userId]);
    await pgDb.query("DELETE FROM transactions WHERE user_id = $1", [userId]);
    await pgDb.query("DELETE FROM users WHERE id = $1", [userId]);
  }
  await pgDb.close();
});

test("deposit idempotency keys cannot cross user boundaries", async () => {
  const key = `shared-deposit-key-${Date.now()}`;
  const first = await financial.createDeposit({
    userId: userA,
    amount: 10000,
    network: "MTN",
    account: "256700000001",
    idempotencyKey: key
  });

  const second = await financial.createDeposit({
    userId: userB,
    amount: 20000,
    network: "MTN",
    account: "256700000002",
    idempotencyKey: key
  });

  assert.notEqual(Number(second.id), Number(first.id));
  assert.equal(Number(first.user_id), Number(userA));
  assert.equal(Number(second.user_id), Number(userB));
});

test("deposit provider references cannot be reused across users", async () => {
  const providerReference = `shared-provider-${Date.now()}`;
  const first = await financial.createDeposit({
    userId: userA,
    amount: 10000,
    network: "MTN",
    account: "256700000001",
    providerReference
  });
  assert.equal(Number(first.user_id), Number(userA));

  await assert.rejects(
    () => financial.createDeposit({
      userId: userB,
      amount: 10000,
      network: "MTN",
      account: "256700000002",
      providerReference
    }),
    /Provider reference is already linked to another deposit/
  );
});

test("withdrawal idempotency keys cannot cross user boundaries", async () => {
  const key = `shared-withdrawal-key-${Date.now()}`;
  const first = await financial.createWithdrawal({
    userId: userA,
    amount: 10000,
    account: "256700000001",
    network: "MTN",
    idempotencyKey: key
  });

  const second = await financial.createWithdrawal({
    userId: userB,
    amount: 20000,
    account: "256700000002",
    network: "AIRTEL",
    idempotencyKey: key
  });

  assert.notEqual(Number(second.id), Number(first.id));
  assert.equal(Number(first.user_id), Number(userA));
  assert.equal(Number(second.user_id), Number(userB));
});

test("withdrawal provider references cannot be reused across users", async () => {
  const first = await financial.createWithdrawal({
    userId: userA,
    amount: 10000,
    account: "256700000001",
    network: "MTN",
    idempotencyKey: `provider-withdraw-a-${Date.now()}`
  });
  const providerReference = `shared-withdraw-provider-${Date.now()}`;
  await financial.approveWithdrawal(first.id, { providerReference });

  const second = await financial.createWithdrawal({
    userId: userB,
    amount: 10000,
    account: "256700000002",
    network: "MTN",
    idempotencyKey: `provider-withdraw-b-${Date.now()}`
  });

  await assert.rejects(
    () => financial.approveWithdrawal(second.id, { providerReference }),
    /Provider reference is already linked to another withdrawal/
  );

  const userBState = (await pgDb.query(
    "SELECT balance, wallet, reserved_balance FROM users WHERE id = $1",
    [userB]
  )).rows[0];
  assert.equal(Number(userBState.balance), 100000);
  assert.equal(Number(userBState.wallet), 100000);
  assert.equal(Number(userBState.reserved_balance), 10000);

  await financial.rejectWithdrawal(second.id);
});
