const db = require("./database-pg");

// AVEILOT referral payout day: the 5th of every month.
const PAYOUT_DAY = 5;
const LOCAL_TZ = "Africa/Kampala";
const WORKER_INTERVAL_MS = Math.max(Number(process.env.REFERRAL_PAYOUT_WORKER_MS || 60000), 30000);

async function ensureReferralPayoutSchema() {
  await db.query(`
    ALTER TABLE referral_rewards
      ADD COLUMN IF NOT EXISTS payout_status TEXT,
      ADD COLUMN IF NOT EXISTS payout_date DATE,
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

    UPDATE referral_rewards
       SET payout_status = 'paid'
     WHERE payout_status IS NULL;

    ALTER TABLE referral_rewards
      ALTER COLUMN payout_status SET DEFAULT 'pending',
      ALTER COLUMN payout_status SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_referral_rewards_payout
      ON referral_rewards(payout_status, payout_date, referrer_id);
  `);

  // Existing referral rewards were already credited by the previous system,
  // so they stay paid. New rewards are held until the next monthly payout day.
  await db.query(`
    CREATE OR REPLACE FUNCTION aveilot_hold_new_referral_reward()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $fn$
    DECLARE
      local_date DATE := (NEW.created_at AT TIME ZONE '${LOCAL_TZ}')::date;
      this_month DATE := date_trunc('month', local_date)::date;
      release_date DATE;
    BEGIN
      IF COALESCE(NEW.payout_status, 'pending') <> 'pending' THEN
        RETURN NEW;
      END IF;

      IF EXTRACT(DAY FROM local_date) < ${PAYOUT_DAY} THEN
        release_date := this_month + ${PAYOUT_DAY - 1};
      ELSE
        release_date := (this_month + INTERVAL '1 month')::date + ${PAYOUT_DAY - 1};
      END IF;

      NEW.payout_status := 'pending';
      NEW.payout_date := release_date;

      UPDATE users
         SET balance = balance - NEW.amount,
             wallet = wallet - NEW.amount,
             reserved_balance = reserved_balance + NEW.amount
       WHERE id = NEW.referrer_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Referral referrer % does not exist', NEW.referrer_id;
      END IF;

      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_aveilot_hold_new_referral_reward ON referral_rewards;
    CREATE TRIGGER trg_aveilot_hold_new_referral_reward
      BEFORE INSERT ON referral_rewards
      FOR EACH ROW
      EXECUTE FUNCTION aveilot_hold_new_referral_reward();
  `);
}

async function releaseDueReferralRewards() {
  return db.transaction(async client => {
    const due = await client.query(`
      SELECT id, referrer_id, amount, rental_id, level
      FROM referral_rewards
      WHERE payout_status = 'pending'
        AND payout_date <= (NOW() AT TIME ZONE '${LOCAL_TZ}')::date
      ORDER BY id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 500
    `);

    let released = 0;
    for (const reward of due.rows) {
      const amount = Number(reward.amount || 0);
      if (amount <= 0) {
        await client.query(
          "UPDATE referral_rewards SET payout_status = 'paid', paid_at = NOW() WHERE id = $1",
          [reward.id]
        );
        continue;
      }

      const user = await client.query(
        "SELECT id FROM users WHERE id = $1 FOR UPDATE",
        [reward.referrer_id]
      );
      if (!user.rowCount) continue;

      await client.query(
        `UPDATE users
            SET balance = balance + $1,
                wallet = wallet + $1,
                reserved_balance = GREATEST(reserved_balance - $1, 0)
          WHERE id = $2`,
        [amount, reward.referrer_id]
      );

      await client.query(
        `INSERT INTO transactions (id, user_id, type, amount, reference, date)
         VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Referral Payout', $2, $3, NOW())`,
        [reward.referrer_id, amount, `referral-payout:${reward.id}`]
      );

      await client.query(
        "UPDATE referral_rewards SET payout_status = 'paid', paid_at = NOW() WHERE id = $1",
        [reward.id]
      );
      released += amount;
    }

    return { count: due.rowCount, released };
  });
}

function startReferralPayoutWorker() {
  const run = async () => {
    try {
      const result = await releaseDueReferralRewards();
      if (result.count > 0) {
        console.log(`AVEILOT referral payout: released UGX ${result.released} across ${result.count} reward(s)`);
      }
    } catch (error) {
      console.error("AVEILOT referral payout worker failed:", error);
    }
  };

  run();
  setInterval(run, WORKER_INTERVAL_MS);
}

module.exports = {
  PAYOUT_DAY,
  ensureReferralPayoutSchema,
  releaseDueReferralRewards,
  startReferralPayoutWorker
};
