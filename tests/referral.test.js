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
process.env.ADMIN_PASSWORD = "admin-password";
process.env.JWT_SECRET = "test-secret";

const app = require("../server");
const db = require("../database");

let server;
let baseUrl;

async function register(user) {
  const response = await fetch(`${baseUrl}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });

  return { status: response.status, body: await response.json() };
}

test.before(async () => {
  server = app.listen(0);
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
  server.close();
  db.close();
  fs.rmSync(path.dirname(databasePath), { recursive: true, force: true });
});

test("referrals save the link owner, grow their team, and reward exactly once", async () => {
  const referrerRegistration = await register({
    name: "Referrer",
    phone: "0700000002",
    password: "password"
  });
  assert.equal(referrerRegistration.status, 201);
  assert.equal(referrerRegistration.body.referralCode, "CA000002");

  for (const [index, phone] of ["0700000003", "0700000004", "0700000005"].entries()) {
    const registration = await register({
      name: `Invitee ${index + 1}`,
      phone,
      password: "password",
      referralCode: "ca000002"
    });
    assert.equal(registration.status, 201);
  }

  const referrer = db.prepare("SELECT id, balance FROM users WHERE phone = ?")
    .get("0700000002");
  const invitees = db.prepare("SELECT referred_by FROM users WHERE phone LIKE '070000000%'")
    .all();
  const team = db.prepare("SELECT member_name, earn FROM team WHERE user_id = ?")
    .all(referrer.id);
  const rewards = db.prepare("SELECT amount FROM referral_rewards WHERE referrer_id = ?")
    .all(referrer.id);
  const transactions = db.prepare("SELECT amount FROM transactions WHERE user_id = ? AND type = ?")
    .all(referrer.id, "Referral Reward");

  assert.equal(referrer.balance, 15000);
  assert.equal(invitees.filter(user => user.referred_by === referrer.id).length, 3);
  assert.equal(team.length, 3);
  assert.deepEqual(team.map(member => member.earn), [5000, 5000, 5000]);
  assert.deepEqual(rewards.map(reward => reward.amount), [5000, 5000, 5000]);
  assert.deepEqual(transactions.map(transaction => transaction.amount), [5000, 5000, 5000]);

  const loginResponse = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: "0700000002", password: "password" })
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const authHeaders = { Authorization: `Bearer ${login.token}` };
  const [walletResponse, teamResponse, transactionsResponse] = await Promise.all([
    fetch(`${baseUrl}/api/wallet`, { headers: authHeaders }),
    fetch(`${baseUrl}/api/team`, { headers: authHeaders }),
    fetch(`${baseUrl}/api/transactions`, { headers: authHeaders })
  ]);
  const [wallet, teamResponseBody, transactionsResponseBody] = await Promise.all([
    walletResponse.json(),
    teamResponse.json(),
    transactionsResponse.json()
  ]);

  assert.equal(wallet.wallet.balance, 15000);
  assert.equal(teamResponseBody.memberCount, 3);
  assert.equal(teamResponseBody.earnings, 15000);
  assert.equal(transactionsResponseBody.transactions.length, 3);

  const retry = await register({
    name: "Invitee 1",
    phone: "0700000003",
    password: "password",
    referralCode: "CA000002"
  });
  assert.equal(retry.status, 409);
  assert.equal(db.prepare("SELECT balance FROM users WHERE id = ?").get(referrer.id).balance, 15000);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM team WHERE user_id = ?").get(referrer.id).count, 3);
  assert.equal(db.prepare("SELECT COUNT(*) AS count FROM referral_rewards WHERE referrer_id = ?").get(referrer.id).count, 3);
});
