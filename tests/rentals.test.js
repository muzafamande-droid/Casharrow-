const assert = require("node:assert/strict");
const test = require("node:test");

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const pgDb = require("../database-pg");
const accountPg = require("../account-pg-routes");
const rental = require("../rental-routes");
const app = require("../server-production");

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
  assert.ok(user);
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

test("each qualifying rental pays three referral levels without reducing the direct commission", async () => {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-6);
  const rootPhone = `0711${suffix}`;
  const directPhone = `0722${suffix}`;
  const level2Phone = `0733${suffix}`;
  const buyerPhone = `0744${suffix}`;
  const password = "password";

  try {
    const rootRegistration = await post("/api/register", {
      phone: rootPhone,
      name: "Level 3 Owner",
      password,
      confirmPassword: password
    });
    assert.equal(rootRegistration.status, 201);
    const rootData = await rootRegistration.json();

    const directRegistration = await post("/api/register", {
      phone: directPhone,
      name: "Direct Referrer",
      password,
      confirmPassword: password,
      referralCode: rootData.referralCode
    });
    assert.equal(directRegistration.status, 201);
    const directData = await directRegistration.json();

    const level2Registration = await post("/api/register", {
      phone: level2Phone,
      name: "Level 2 Referrer",
      password,
      confirmPassword: password,
      referralCode: directData.referralCode
    });
    assert.equal(level2Registration.status, 201);
    const level2Data = await level2Registration.json();

    const buyerRegistration = await post("/api/register", {
      phone: buyerPhone,
      name: "Machine Buyer",
      password,
      confirmPassword: password,
      referralCode: level2Data.referralCode
    });
    assert.equal(buyerRegistration.status, 201);

    const users = (await pgDb.query(
      "SELECT id, phone FROM users WHERE phone IN ($1, $2, $3, $4) ORDER BY phone",
      [rootPhone, directPhone, level2Phone, buyerPhone]
    )).rows;
    assert.equal(users.length, 4);

    const root = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [rootPhone])).rows[0];
    const direct = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [directPhone])).rows[0];
    const level2 = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [level2Phone])).rows[0];
    const buyer = (await pgDb.query("SELECT id FROM users WHERE phone = $1", [buyerPhone])).rows[0];
    assert.ok(root && direct && level2 && buyer);

    await pgDb.query("UPDATE users SET balance = 100000, wallet = 100000 WHERE id = $1", [buyer.id]);
    const product = (await pgDb.query("SELECT id FROM products WHERE code = 'A1'")).rows[0];
    const { data: loginData } = await login(buyerPhone, password);

    const firstResponse = await post("/api/rentals", { productId: product.id }, loginData.token);
    const firstData = await firstResponse.json();
    assert.equal(firstResponse.status, 201);
    assert.equal(Number(firstData.referralCommission), 9000);
    assert.deepEqual(
      firstData.referralCommissions.map(item => [item.level, Number(item.amount)]),
      [[1, 6000], [2, 2000], [3, 1000]]
    );

    const rewards = (await pgDb.query(
      "SELECT referrer_id, referred_user_id, amount, rental_id, level FROM referral_rewards WHERE rental_id = $1 ORDER BY level",
      [firstData.rentalId]
    )).rows;
    assert.equal(rewards.length, 3);
    assert.deepEqual(rewards.map(row => [Number(row.referrer_id), Number(row.amount), Number(row.level)]), [
      [Number(level2.id), 6000, 1],
      [Number(direct.id), 2000, 2],
      [Number(root.id), 1000, 3]
    ]);

    const directAfterFirst = (await pgDb.query("SELECT balance, wallet FROM users WHERE id = $1", [level2.id])).rows[0];
    const level2AfterFirst = (await pgDb.query("SELECT balance, wallet FROM users WHERE id = $1", [direct.id])).rows[0];
    const rootAfterFirst = (await pgDb.query("SELECT balance, wallet FROM users WHERE id = $1", [root.id])).rows[0];
    assert.equal(Number(directAfterFirst.balance), 6000);
    assert.equal(Number(directAfterFirst.wallet), 6000);
    assert.equal(Number(level2AfterFirst.balance), 2000);
    assert.equal(Number(level2AfterFirst.wallet), 2000);
    assert.equal(Number(rootAfterFirst.balance), 1000);
    assert.equal(Number(rootAfterFirst.wallet), 1000);

    await pgDb.query("UPDATE users SET balance = 100000, wallet = 100000 WHERE id = $1", [buyer.id]);
    const secondResponse = await post("/api/rentals", { productId: product.id }, loginData.token);
    const secondData = await secondResponse.json();
    assert.equal(secondResponse.status, 201);
    assert.equal(Number(secondData.referralCommission), 9000);

    const rewardCount = await pgDb.query(
      "SELECT COUNT(*) AS count FROM referral_rewards WHERE referred_user_id = $1",
      [buyer.id]
    );
    assert.equal(Number(rewardCount.rows[0].count), 6);
  } finally {
    const ids = await pgDb.query("SELECT id FROM users WHERE phone IN ($1, $2, $3, $4)", [rootPhone, directPhone, level2Phone, buyerPhone]);
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
