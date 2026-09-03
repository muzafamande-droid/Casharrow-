const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const accountPg = require("../account-pg-routes");
const rental = require("../rental-routes");
const app = require("../server");
app.use("/api", accountPg.router);
app.use("/api", rental.router);

let server;
let baseUrl;
const testPhone = `0700${Date.now().toString().slice(-6)}`;

async function post(pathname, body, token) {
  return fetch(`${baseUrl}${pathname}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

async function login(phone, password) {
  const response = await post("/api/login", { phone, password });
  return { response, data: await response.json() };
}

test.before(async () => {
  await pgDb.init();
  await rental.ready();
  await pgDb.query("DELETE FROM users WHERE phone = $1", [testPhone]);
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => {
  await new Promise(resolve => server.close(resolve));
  await pgDb.query("DELETE FROM rentals WHERE user_id IN (SELECT id FROM users WHERE phone = $1)", [testPhone]);
  await pgDb.query("DELETE FROM users WHERE phone = $1", [testPhone]);
  await pgDb.close();
});

test("product catalog contains the four series, twenty products, and the configured policy", async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.products.length, 20);
  assert.deepEqual(
    data.products.filter(product => product.featured).map(product => product.code),
    ["A1", "B1", "C1", "D1"]
  );

  const a1 = data.products.find(product => product.code === "A1");
  assert.equal(Number(a1.rental_fee), 30000);
  assert.equal(Number(a1.rental_days), 18);
  assert.equal(Number(a1.return_amount), 45000);
  assert.equal(a1.active, true);
});

test("configured rental checkout rejects a user without sufficient balance", async () => {
  const registration = await post("/api/register", {
    phone: testPhone,
    name: "Rental User",
    password: "password",
    confirmPassword: "password"
  });
  assert.equal(registration.status, 201);

  const { data: loginData } = await login(testPhone, "password");
  const product = (await pgDb.query("SELECT id FROM products WHERE code = 'A1'")).rows[0];
  assert.ok(product);

  const response = await post("/api/rentals", { productId: product.id }, loginData.token);
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.match(data.message, /insufficient balance/i);
});

test("configured rental deducts wallet balance and cannot complete before its end date", async () => {
  const user = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [testPhone])).rows[0];
  const product = (await pgDb.query("SELECT id FROM products WHERE code = 'A1'")).rows[0];
  await pgDb.query("UPDATE users SET balance = 5000, wallet = 5000 WHERE id = $1", [user.id]);

  const { data: loginData } = await login(testPhone, "password");
  const response = await post("/api/rentals", { productId: product.id }, loginData.token);
  const data = await response.json();
  assert.equal(response.status, 400);
  assert.match(data.message, /insufficient balance/i);

  await pgDb.query("UPDATE users SET balance = 50000, wallet = 50000 WHERE id = $1", [user.id]);
  const fundedResponse = await post("/api/rentals", { productId: product.id }, loginData.token);
  const fundedData = await fundedResponse.json();
  assert.equal(fundedResponse.status, 201);
  assert.equal(fundedData.success, true);

  const updatedUser = (await pgDb.query("SELECT balance FROM users WHERE id = $1", [user.id])).rows[0];
  assert.equal(Number(updatedUser.balance), 20000);

  const rentalRow = (await pgDb.query("SELECT * FROM rentals WHERE id = $1", [fundedData.rentalId])).rows[0];
  assert.equal(rentalRow.status, "active");
  assert.equal(Number(rentalRow.rental_fee), 30000);
  assert.equal(Number(rentalRow.rental_days), 18);
  assert.equal(Number(rentalRow.return_amount), 45000);

  const earlyComplete = await post(`/api/rentals/${fundedData.rentalId}/complete`, {}, loginData.token);
  assert.equal(earlyComplete.status, 409);
  assert.match((await earlyComplete.json()).message, /has not ended/i);
});

test("first referred rental pays exactly 10 percent commission once", async () => {
  const suffix = Date.now().toString().slice(-6);
  const referrerPhone = `0711${suffix}`;
  const referredPhone = `0722${suffix}`;
  const password = "password";

  try {
    const referrerRegistration = await post("/api/register", {
      phone: referrerPhone,
      name: "Referral Owner",
      password,
      confirmPassword: password
    });
    assert.equal(referrerRegistration.status, 201);
    const referrerRegistrationData = await referrerRegistration.json();

    const referredRegistration = await post("/api/register", {
      phone: referredPhone,
      name: "First Rental Member",
      password,
      confirmPassword: password,
      referralCode: referrerRegistrationData.referralCode
    });
    assert.equal(referredRegistration.status, 201);

    const referrer = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [referrerPhone])).rows[0];
    const referred = (await pgDb.query("SELECT id, referred_by FROM users WHERE phone = $1", [referredPhone])).rows[0];
    assert.equal(Number(referred.referred_by), Number(referrer.id));

    await pgDb.query("UPDATE users SET balance = 100000, wallet = 100000 WHERE id = $1", [referred.id]);
    const product = (await pgDb.query("SELECT id FROM products WHERE code = 'A1'")).rows[0];
    assert.ok(product);

    const { data: loginData } = await login(referredPhone, password);
    const firstResponse = await post("/api/rentals", { productId: product.id }, loginData.token);
    const firstData = await firstResponse.json();
    assert.equal(firstResponse.status, 201);
    assert.equal(Number(firstData.referralCommission), 3000);

    const referrerAfterFirst = (await pgDb.query("SELECT balance, wallet FROM users WHERE id = $1", [referrer.id])).rows[0];
    assert.equal(Number(referrerAfterFirst.balance), 3000);
    assert.equal(Number(referrerAfterFirst.wallet), 3000);

    const reward = (await pgDb.query(
      "SELECT amount, rental_id FROM referral_rewards WHERE referred_user_id = $1",
      [referred.id]
    )).rows[0];
    assert.ok(reward);
    assert.equal(Number(reward.amount), 3000);
    assert.equal(Number(reward.rental_id), Number(firstData.rentalId));

    const firstCommissionTransactions = await pgDb.query(
      "SELECT COUNT(*) AS count FROM transactions WHERE user_id = $1 AND type = 'Referral Commission'",
      [referrer.id]
    );
    assert.equal(Number(firstCommissionTransactions.rows[0].count), 1);

    const secondResponse = await post("/api/rentals", { productId: product.id }, loginData.token);
    const secondData = await secondResponse.json();
    assert.equal(secondResponse.status, 201);
    assert.equal(Number(secondData.referralCommission), 0);

    const referrerAfterSecond = (await pgDb.query("SELECT balance, wallet FROM users WHERE id = $1", [referrer.id])).rows[0];
    assert.equal(Number(referrerAfterSecond.balance), 3000);
    assert.equal(Number(referrerAfterSecond.wallet), 3000);

    const rewardCount = await pgDb.query(
      "SELECT COUNT(*) AS count FROM referral_rewards WHERE referred_user_id = $1",
      [referred.id]
    );
    assert.equal(Number(rewardCount.rows[0].count), 1);
  } finally {
    const ids = await pgDb.query("SELECT id FROM users WHERE phone IN ($1, $2)", [referrerPhone, referredPhone]);
    const userIds = ids.rows.map(row => row.id);
    if (userIds.length) {
      await pgDb.query("DELETE FROM referral_rewards WHERE referred_user_id = ANY($1::bigint[]) OR referrer_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM team WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM transactions WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM rentals WHERE user_id = ANY($1::bigint[])", [userIds]);
      await pgDb.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [userIds]);
    }
  }
});
