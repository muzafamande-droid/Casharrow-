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

  // The real A1 policy costs UGX 30,000, so the test user must be funded above that amount.
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
