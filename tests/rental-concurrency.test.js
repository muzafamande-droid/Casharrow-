const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const rental = require("../rental-routes");

function uniquePhone(prefix) {
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 100000)}`.slice(-10);
}

test("concurrent first-rental attempts can create only one referral commission", async () => {
  await pgDb.init();
  await rental.ready();

  const referrerPhone = uniquePhone("07");
  const referredPhone = uniquePhone("08");

  try {
    const referrer = (await pgDb.query(
      `INSERT INTO users (id, phone, name, password, role, referral_code)
       VALUES (nextval('casharrow_users_id_seq'), $1, 'Concurrency Referrer', 'test-hash', 'user', $2)
       RETURNING id`,
      [referrerPhone, `TEST${Date.now()}`]
    )).rows[0];

    const referred = (await pgDb.query(
      `INSERT INTO users (id, phone, name, password, role, balance, wallet, referred_by, referral_code)
       VALUES (nextval('casharrow_users_id_seq'), $1, 'Concurrency Referred', 'test-hash', 'user', 100000, 100000, $2, $3)
       RETURNING id`,
      [referredPhone, referrer.id, `TEST${Date.now()}R`]
    )).rows[0];

    const product = (await pgDb.query("SELECT id FROM products WHERE code = 'A1'")).rows[0];
    assert.ok(product);

    const results = await Promise.all([
      rental.createRental({ userId: referred.id, productId: product.id }),
      rental.createRental({ userId: referred.id, productId: product.id })
    ]);

    assert.equal(results.filter(result => result.ok).length, 2);
    assert.equal(results.filter(result => result.referralCommission === 3000).length, 1);
    assert.equal(results.filter(result => result.referralCommission === 0).length, 1);

    const referralRewards = await pgDb.query(
      "SELECT COUNT(*) AS count FROM referral_rewards WHERE referred_user_id = $1",
      [referred.id]
    );
    assert.equal(Number(referralRewards.rows[0].count), 1);

    const referrerBalance = await pgDb.query(
      "SELECT balance, wallet FROM users WHERE id = $1",
      [referrer.id]
    );
    assert.equal(Number(referrerBalance.rows[0].balance), 3000);
    assert.equal(Number(referrerBalance.rows[0].wallet), 3000);
  } finally {
    const users = await pgDb.query(
      "SELECT id FROM users WHERE phone IN ($1, $2)",
      [referrerPhone, referredPhone]
    );
    const userIds = users.rows.map(row => row.id);

    if (userIds.length) {
      await pgDb.query("DELETE FROM referral_rewards WHERE referrer_id = ANY($1::bigint[]) OR referred_user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM team WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM transactions WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM rentals WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [userIds]);
    }
  }

  // Always close the shared pool so this standalone test can terminate cleanly.
  await pgDb.close();
});
