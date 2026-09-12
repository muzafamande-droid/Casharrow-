const db = require("./database-pg");
const financial = require("./financial-pg-v2");
const provider = require("./mobile-money-provider");

let timer = null;
let running = false;

async function reconcileDeposits() {
  const result = await db.query(`
    SELECT id, network, provider_reference
    FROM deposits
    WHERE status = 'pending'
      AND provider_reference LIKE 'aveilot-deposit-%'
    ORDER BY id ASC
    LIMIT 50
  `);
  for (const deposit of result.rows) {
    try {
      const status = await provider.getStatus(deposit.network, "collection", deposit.provider_reference);
      if (status.status === "successful") {
        await financial.approveDeposit(deposit.id, { providerReference: deposit.provider_reference });
        console.log(`AVEILOT deposit ${deposit.id} confirmed by ${deposit.network}`);
      } else if (status.status === "failed") {
        await financial.failDeposit(deposit.id);
        console.log(`AVEILOT deposit ${deposit.id} failed at ${deposit.network}`);
      }
    } catch (error) {
      console.error(`AVEILOT deposit reconciliation failed for ${deposit.id}:`, error.message);
    }
  }
}

async function reconcileWithdrawals() {
  const result = await db.query(`
    SELECT id, network, provider_reference
    FROM withdrawals
    WHERE status = 'pending'
      AND provider_reference LIKE 'aveilot-withdrawal-%'
    ORDER BY id ASC
    LIMIT 50
  `);
  for (const withdrawal of result.rows) {
    try {
      const status = await provider.getStatus(withdrawal.network, "disbursement", withdrawal.provider_reference);
      if (status.status === "successful") {
        await financial.approveWithdrawal(withdrawal.id, { providerReference: withdrawal.provider_reference });
        console.log(`AVEILOT withdrawal ${withdrawal.id} confirmed by ${withdrawal.network}`);
      } else if (status.status === "failed") {
        await financial.rejectWithdrawal(withdrawal.id);
        console.log(`AVEILOT withdrawal ${withdrawal.id} failed at ${withdrawal.network}`);
      }
    } catch (error) {
      console.error(`AVEILOT withdrawal reconciliation failed for ${withdrawal.id}:`, error.message);
    }
  }
}

async function reconcile() {
  if (running || !provider.automationEnabled()) return;
  running = true;
  try {
    await reconcileDeposits();
    await reconcileWithdrawals();
  } finally {
    running = false;
  }
}

function startPaymentProviderWorker() {
  if (timer) return;
  const interval = Math.max(15000, Number(process.env.PAYMENT_STATUS_POLL_MS || 30000));
  timer = setInterval(() => reconcile().catch(error => console.error("AVEILOT payment reconciliation failed:", error)), interval);
  if (typeof timer.unref === "function") timer.unref();
  reconcile().catch(error => console.error("AVEILOT initial payment reconciliation failed:", error));
  console.log(`AVEILOT payment provider worker enabled; polling every ${interval}ms`);
}

module.exports = { startPaymentProviderWorker, reconcile };
