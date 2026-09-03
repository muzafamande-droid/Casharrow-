const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const databasePath = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), "casharrow-rentals-")),
  "casharrow.db"
);

process.env.DATABASE_PATH = databasePath;
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin-password";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
process.env.NODE_ENV = "test";

const db = require("../database");
const rental = require("../rental-routes");
const app = require("../server");
app.use("/api", rental.router);

let server;
let baseUrl;

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
  await db.ready;
  await rental.ready();
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

test("product catalog contains the four series and twenty products", async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.products.length, 20);
  assert.deepEqual(
    data.products.filter(product => product.featured === 1).map(product => product.code),
    ["A1", "B1", "C1", "D1"]
  );
});

test("rental checkout stays blocked until a product is activated and configured", async () => {
  const registration = await post("/api/register", {
    phone: "0700000011",
    name: "Rental User",
    password: "password",
    confirmPassword: "password"
  });
  assert.equal(registration.status, 201);

  const { data: loginData } = await login("0700000011", "password");
  const product = db.prepare("SELECT id FROM products WHERE code = 'A1'").get();
  assert.ok(product);

  const response = await post("/api/rentals", { productId: product.id }, loginData.token);
  const data = await response.json();
  assert.equal(response.status, 409);
  assert.match(data.message, /not available/i);
});

test("configured rental deducts wallet balance and cannot complete before its end date", async () => {
  const user = db.prepare("SELECT id FROM users WHERE phone = ?").get("0700000011");
  const product = db.prepare("SELECT id FROM products WHERE code = 'A1'").get();
  db.prepare(`
    UPDATE products
    SET rental_fee = 1000, rental_days = 30, return_amount = 1500, active = 1
    WHERE id = ?
  `).run(product.id);
  db.prepare("UPDATE users SET balance = 5000, wallet = 5000 WHERE id = ?").run(user.id);

  const { data: loginData } = await login("0700000011", "password");
  const response = await post("/api/rentals", { productId: product.id }, loginData.token);
  const data = await response.json();
  assert.equal(response.status, 201);
  assert.equal(data.success, true);

  assert.equal(
    db.prepare("SELECT balance FROM users WHERE id = ?").get(user.id).balance,
    4000
  );

  const rentalRow = db.prepare("SELECT * FROM rentals WHERE id = ?").get(data.rentalId);
  assert.equal(rentalRow.status, "active");

  const earlyComplete = await post(`/api/rentals/${data.rentalId}/complete`, {}, loginData.token);
  assert.equal(earlyComplete.status, 409);
  assert.match((await earlyComplete.json()).message, /has not ended/i);
});
