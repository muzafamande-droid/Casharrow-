const db = require("./database-pg");

function money(value, field) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${field} must be a positive amount`);
  return n;
}

async function getUser(client, userId, forUpdate = false) {
  const result = await client.query(
    `SELECT id, phone, name, role, balance, wallet, reserved_balance, referral_code, referred_by
       FROM users WHERE id = $1 ${forUpdate ? "FOR UPDATE" : ""}`,
    [userId]
  );
  return result.rows[0] || null;
}

async function recordTransaction(client, userId, type, amount, reference = null) {
  const result = await client.query(
    `INSERT INTO transactions (id, user_id, type, amount, reference, date)
     VALUES (nextval('casharrow_transactions_id_seq'), $1, $2, $3, $4, NOW())
     RETURNING id`,
    [userId, type, amount, reference]
  );
  return result.rows[0].id;
}

async function getWallet(userId) {
  const user = await getUser(db.pool, userId);
  if (!user) throw new Error("User not found");
  const balance = Number(user.balance);
  const reserved = Number(user.reserved_balance || 0);
  return { balance, wallet: Number(user.wallet), reservedBalance: reserved, availableBalance: balance - reserved };
}

async function creditWallet(client, userId, amount, type, reference = null) {
  const value = money(amount, "Credit amount");
  const user = await getUser(client, userId, true);
  if (!user) throw new Error("User not found");
  await client.query(
    "UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2",
    [value, userId]
  );
  await recordTransaction(client, userId, type, value, reference);
  return getUser(client, userId);
}

async function createDeposit({ userId, amount, network, account, providerReference = null, idempotencyKey = null }) {
  const value = money(amount, "Deposit amount");
  return db.transaction(async client => {
    const user = await getUser(client, userId);
    if (!user) throw new Error("User not found");

    if (idempotencyKey) {
      const existing = await client.query(
        "SELECT * FROM deposits WHERE idempotency_key = $1 AND user_id = $2 LIMIT 1",
        [idempotencyKey, userId]
      );
      if (existing.rowCount) return existing.rows[0];
    }

    if (providerReference) {
      const existing = await client.query(
        "SELECT id, user_id FROM deposits WHERE provider_reference = $1 LIMIT 1",
        [providerReference]
      );
      if (existing.rowCount) {
        if (Number(existing.rows[0].user_id) === Number(userId)) return existing.rows[0];
        throw new Error("Provider reference is already linked to another deposit");
      }
    }

    const result = await client.query(
      `INSERT INTO deposits
        (id, user_id, amount, network, account, status, provider_reference, idempotency_key, date)
       VALUES
        (nextval('casharrow_deposits_id_seq'), $1, $2, $3, $4, 'pending', $5, $6, NOW())
       RETURNING *`,
      [userId, value, String(network || "").trim().toUpperCase(), String(account || "").trim(), providerReference, idempotencyKey]
    );
    return result.rows[0];
  });
}

async function approveDeposit(depositId, { providerReference = null } = {}) {
  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM deposits WHERE id = $1 FOR UPDATE", [depositId]);
    const deposit = result.rows[0];
    if (!deposit) throw new Error("Deposit not found");
    if (deposit.status === "approved") return deposit;
    if (deposit.status !== "pending") throw new Error(`Deposit is already ${deposit.status}`);

    if (providerReference && deposit.provider_reference && providerReference !== deposit.provider_reference) {
      throw new Error("Provider reference does not match deposit");
    }

    if (providerReference) {
      const duplicate = await client.query(
        "SELECT id FROM deposits WHERE provider_reference = $1 AND id <> $2 LIMIT 1",
        [providerReference, depositId]
      );
      if (duplicate.rowCount) throw new Error("Provider reference is already linked to another deposit");
    }

    await creditWallet(client, deposit.user_id, deposit.amount, "Deposit", providerReference || deposit.provider_reference);
    const updated = await client.query(
      `UPDATE deposits
       SET status = 'approved', approved_at = NOW(), provider_reference = COALESCE($2, provider_reference)
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [depositId, providerReference]
    );
    return updated.rows[0];
  });
}

async function failDeposit(depositId) {
  return db.transaction(async client => {
    const result = await client.query(
      "UPDATE deposits SET status = 'failed' WHERE id = $1 AND status = 'pending' RETURNING *",
      [depositId]
    );
    if (!result.rowCount) {
      const current = await client.query("SELECT * FROM deposits WHERE id = $1", [depositId]);
      if (!current.rowCount) throw new Error("Deposit not found");
      return current.rows[0];
    }
    return result.rows[0];
  });
}

async function createWithdrawal({ userId, amount, account, network = null, idempotencyKey = null }) {
  const value = money(amount, "Withdrawal amount");
  return db.transaction(async client => {
    const user = await getUser(client, userId, true);
    if (!user) throw new Error("User not found");

    if (idempotencyKey) {
      const existing = await client.query(
        "SELECT * FROM withdrawals WHERE idempotency_key = $1 AND user_id = $2 LIMIT 1",
        [idempotencyKey, userId]
      );
      if (existing.rowCount) return existing.rows[0];
    }

    const available = Number(user.balance) - Number(user.reserved_balance || 0);
    if (available < value || Number(user.wallet) < value) throw new Error("Insufficient available balance");

    await client.query(
      "UPDATE users SET reserved_balance = reserved_balance + $1 WHERE id = $2",
      [value, userId]
    );

    const result = await client.query(
      `INSERT INTO withdrawals
        (id, user_id, amount, account, network, status, idempotency_key, date)
       VALUES
        (nextval('casharrow_withdrawals_id_seq'), $1, $2, $3, $4, 'pending', $5, NOW())
       RETURNING *`,
      [userId, value, String(account || "").trim(), network ? String(network).trim().toUpperCase() : null, idempotencyKey]
    );
    return result.rows[0];
  });
}

async function approveWithdrawal(withdrawalId, { providerReference = null } = {}) {
  const payoutReference = String(providerReference || "").trim();
  if (!payoutReference) throw new Error("Provider reference is required before approving a withdrawal");

  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE", [withdrawalId]);
    const withdrawal = result.rows[0];
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status === "approved") return withdrawal;
    if (withdrawal.status !== "pending") throw new Error(`Withdrawal is already ${withdrawal.status}`);
    if (withdrawal.provider_reference && withdrawal.provider_reference !== payoutReference) {
      throw new Error("Provider reference does not match withdrawal");
    }

    const duplicate = await client.query(
      "SELECT id FROM withdrawals WHERE provider_reference = $1 AND id <> $2 LIMIT 1",
      [payoutReference, withdrawalId]
    );
    if (duplicate.rowCount) throw new Error("Provider reference is already linked to another withdrawal");

    const user = await getUser(client, withdrawal.user_id, true);
    if (!user) throw new Error("User not found");
    if (Number(user.reserved_balance || 0) < Number(withdrawal.amount)) {
      throw new Error("Withdrawal reservation is missing");
    }
    if (Number(user.balance) < Number(withdrawal.amount) || Number(user.wallet) < Number(withdrawal.amount)) {
      throw new Error("Insufficient balance for withdrawal approval");
    }

    await client.query(
      `UPDATE users
       SET balance = balance - $1,
           wallet = wallet - $1,
           reserved_balance = reserved_balance - $1
       WHERE id = $2`,
      [withdrawal.amount, withdrawal.user_id]
    );

    await recordTransaction(client, withdrawal.user_id, "Withdrawal", -Number(withdrawal.amount), payoutReference);

    const updated = await client.query(
      `UPDATE withdrawals
       SET status = 'approved', approved_at = NOW(), provider_reference = $2
       WHERE id = $1 AND status = 'pending'
       RETURNING *`,
      [withdrawalId, payoutReference]
    );
    return updated.rows[0];
  });
}

async function rejectWithdrawal(withdrawalId) {
  return db.transaction(async client => {
    const result = await client.query("SELECT * FROM withdrawals WHERE id = $1 FOR UPDATE", [withdrawalId]);
    const withdrawal = result.rows[0];
    if (!withdrawal) throw new Error("Withdrawal not found");
    if (withdrawal.status === "rejected") return withdrawal;
    if (withdrawal.status !== "pending") throw new Error(`Withdrawal is already ${withdrawal.status}`);

    await client.query(
      "UPDATE users SET reserved_balance = GREATEST(0, reserved_balance - $1) WHERE id = $2",
      [withdrawal.amount, withdrawal.user_id]
    );
    const updated = await client.query(
      "UPDATE withdrawals SET status = 'rejected', approved_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *",
      [withdrawalId]
    );
    return updated.rows[0];
  });
}

module.exports = {
  getWallet,
  recordTransaction,
  creditWallet,
  createDeposit,
  approveDeposit,
  failDeposit,
  createWithdrawal,
  approveWithdrawal,
  rejectWithdrawal
};
