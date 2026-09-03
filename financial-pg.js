const db = require("./database-pg");

async function getUser(clientOrPool, userId, forUpdate = false) {
  const result = await clientOrPool.query(
    `SELECT id, phone, name, role, balance, wallet, referral_code, referred_by
       FROM users WHERE id = $1 ${forUpdate ? "FOR UPDATE" : ""}`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getWallet(userId) {
  const user = await getUser(db.pool, userId);
  if (!user) throw new Error("User not found");
  return { balance: Number(user.balance), wallet: Number(user.wallet) };
}

async function recordTransaction(client, userId, type, amount, reference = null) {
  const result = await client.query(
    `INSERT INTO transactions (id, user_id, type, amount, date)
     VALUES (nextval('casharrow_transactions_id_seq'), $1, $2, $3, NOW())
     RETURNING id`,
    [userId, type, amount]
  );
  return result.rows[0].id;
}

async function creditWallet(client, userId, amount, type) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Credit amount must be positive");
  const user = await getUser(client, userId, true);
  if (!user) throw new Error("User not found");
  await client.query("UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2", [value, userId]);
  await recordTransaction(client, userId, type, value);
  return getUser(client, userId);
}

async function debitWallet(client, userId, amount, type) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Debit amount must be positive");
  const user = await getUser(client, userId, true);
  if (!user) throw new Error("User not found");
  if (Number(user.balance) < value || Number(user.wallet) < value) throw new Error("Insufficient balance");
  await client.query("UPDATE users SET balance = balance - $1, wallet = wallet - $1 WHERE id = $2", [value, userId]);
  await recordTransaction(client, userId, type, -value);
  return getUser(client, userId);
}

async function createDeposit({ userId, amount, network, account, providerReference = null }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Deposit amount must be positive");
  return db.transaction(async client => {
    const user = await getUser(client, userId, false);
    if (!user) throw new Error("User not found");
    const result = await client.query(
      `INSERT INTO deposits (id, user_id, amount, network, account, status, date)
       VALUES (nextval('casharrow_deposits_id_seq'), $1, $2, $3, $4, 'pending', NOW()) RETURNING *`,
      [userId, value, network, account]
    );
    return result.rows[0];
  });
}

async function approveDeposit(depositId) {
  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM deposits WHERE id = $1 FOR UPDATE", [depositId]);
    const deposit = result.rows[0];
    if (!deposit) throw new Error("Deposit not found");
    if (deposit.status === "approved") return deposit;
    if (deposit.status !== "pending") throw new Error(`Deposit is already ${deposit.status}`);
    await creditWallet(client, deposit.user_id, deposit.amount, "Deposit");
    const updated = await client.query(
      "UPDATE deposits SET status = 'approved', approved_at = NOW() WHERE id = $1 RETURNING *",
      [depositId]
    );
    return updated.rows[0];
  });
}

async function createWithdrawal({ userId, amount, account }) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error("Withdrawal amount must be positive");
  return db.transaction(async client => {
    const user = await getUser(client, userId, true);
    if (!user) throw new Error("User not found");
    if (Number(user.balance) < value || Number(user.wallet) < value) throw new Error("Insufficient balance");
    const result = await client.query(
      `INSERT INTO withdrawals (id, user_id, amount, account, status, date)
       VALUES (nextval('casharrow_withdrawals_id_seq'), $1, $2, $3, 'pending', NOW()) RETURNING *`,
      [userId, value, account]
    );
    return result.rows[0];
  });
}

async function approveWithdrawal(withdrawalId) {
  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE", [withdrawalId]);
    const withdrawal = result.rows[0];
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status === "approved") return withdrawal;
    if (withdrawal.status !== "pending") throw new Error(`Withdrawal is already ${withdrawal.status}`);
    await debitWallet(client, withdrawal.user_id, withdrawal.amount, "Withdrawal");
    const updated = await client.query(
      "UPDATE withdrawals SET status = 'approved', approved_at = NOW() WHERE id = $1 RETURNING *",
      [withdrawalId]
    );
    return updated.rows[0];
  });
}

module.exports = {
  getWallet,
  recordTransaction,
  creditWallet,
  debitWallet,
  createDeposit,
  approveDeposit,
  createWithdrawal,
  approveWithdrawal
};
