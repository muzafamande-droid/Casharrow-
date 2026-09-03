const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is not configured");
}
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session"
    });
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }

  next();
}
app.use(express.static(path.join(__dirname, "public"), { index: false }));

// Server status
app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    message: "CashArrow server is running"
  });
});

const REFERRAL_REWARD = 5000;

const registerUser = db.transaction(({ phone, name, password, referralCode }) => {
  const existingUser = db
    .prepare("SELECT id FROM users WHERE phone = ?")
    .get(phone);

  if (existingUser) {
    return { error: "An account with this phone already exists", status: 409 };
  }

  const normalizedReferralCode = referralCode
    ? String(referralCode).trim().toUpperCase()
    : null;

  const referrer = normalizedReferralCode
    ? db
        .prepare("SELECT id, name FROM users WHERE referral_code = ?")
        .get(normalizedReferralCode)
    : null;

  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users
    (phone, name, password, referral_code, referred_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    phone,
    name,
    hash,
    null,
    referrer ? referrer.id : null
  );

  const newUserId = result.lastInsertRowid;
  const newReferralCode = "CA" + String(newUserId).padStart(6, "0");

  db.prepare(`
    UPDATE users
    SET referral_code = ?
    WHERE id = ?
  `).run(newReferralCode, newUserId);

  // Give every new member their own task/reward records.
  db.prepare(`
    INSERT INTO tasks (user_id, title, reward, done)
    VALUES (?, 'Invite 3 friends', 500, 0)
  `).run(newUserId);
  db.prepare(`
    INSERT INTO tasks (user_id, title, reward, done)
    VALUES (?, 'Daily check-in', 50, 0)
  `).run(newUserId);
  db.prepare(`
    INSERT INTO tasks (user_id, title, reward, done)
    VALUES (?, 'Share app', 200, 0)
  `).run(newUserId);

  db.prepare(`
    INSERT INTO rewards (user_id, title, amount, claimed)
    VALUES (?, 'Welcome', 0, 1)
  `).run(newUserId);
  db.prepare(`
    INSERT INTO rewards (user_id, title, amount, claimed)
    VALUES (?, 'VIP Bonus', 500, 0)
  `).run(newUserId);

  if (referrer) {
    const reward = db.prepare(`
      INSERT INTO referral_rewards
      (referrer_id, referred_user_id, amount)
      VALUES (?, ?, ?)
    `).run(referrer.id, newUserId, REFERRAL_REWARD);

    if (reward.changes === 1) {
      db.prepare(`
        INSERT INTO team
        (user_id, member_name, earn)
        VALUES (?, ?, ?)
      `).run(referrer.id, name, REFERRAL_REWARD);

      db.prepare(`
        UPDATE users
        SET balance = balance + ?, wallet = wallet + ?
        WHERE id = ?
      `).run(REFERRAL_REWARD, REFERRAL_REWARD, referrer.id);

      db.prepare(`
        INSERT INTO transactions
        (user_id, type, amount, date)
        VALUES (?, ?, ?, datetime('now'))
      `).run(
        referrer.id,
        "Referral Reward",
        REFERRAL_REWARD
      );
    }
  }

  return { newUserId, newReferralCode };
});

// Register
app.post("/api/register", (req, res) => {
  const { phone, name, password, confirmPassword, referralCode } = req.body;

  if (!phone || !name || !password || !confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Name, phone, password and confirm password are required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }

  let registration;
  try {
    registration = registerUser({ phone, name, password, referralCode });
  } catch (error) {
    console.error("Registration failed:", error);
    return res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }

  if (registration.error) {
    return res.status(registration.status).json({
      success: false,
      message: registration.error
    });
  }

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    userId: registration.newUserId,
    referralCode: registration.newReferralCode
  });
});

// Login
app.post("/api/login", (req, res) => {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({
      success: false,
      message: "Phone and password are required"
    });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE phone = ?")
    .get(phone);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({
      success: false,
      message: "Invalid phone or password"
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );

  res.json({
    success: true,
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      balance: user.balance,
      wallet: user.wallet,
      referralCode: user.referral_code
    }
  });
});

// Admin test route
app.get("/api/admin", authenticateToken, requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin access granted",
    admin: {
      id: req.user.id,
      role: req.user.role
    }
  });
});

// Admin dashboard
app.get("/api/admin/dashboard", authenticateToken, requireAdmin, (req, res) => {
  const totalUsers = db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get().count;

  const totalBalance = db
    .prepare("SELECT COALESCE(SUM(balance), 0) AS total FROM users")
    .get().total;

  const totalTasks = db
    .prepare("SELECT COUNT(*) AS count FROM tasks")
    .get().count;

  res.json({
    success: true,
    totalUsers,
    totalBalance,
    totalTasks
  });
});

// Admin users
app.get("/api/admin/users", authenticateToken, requireAdmin, (req, res) => {
  const users = db.prepare(`
    SELECT id, name, phone, balance, role, vip
    FROM users
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    users
  });
});

// Admin deposit requests
app.get("/api/admin/deposits", authenticateToken, requireAdmin, (req, res) => {
  const deposits = db.prepare(`
    SELECT id, user_id, amount, network, account, status, date, approved_at
    FROM deposits
    ORDER BY id DESC
  `).all();

  res.json({
    success: true,
    deposits
  });
});

// Approve a pending deposit and credit the user's balance exactly once
app.post("/api/admin/deposits/:id/approve", authenticateToken, requireAdmin, (req, res) => {
  const depositId = Number(req.params.id);

  if (!Number.isInteger(depositId) || depositId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid deposit ID"
    });
  }

  try {
    const result = db.transaction(() => {
      const deposit = db.prepare(`
        SELECT id, user_id, amount, status
        FROM deposits
        WHERE id = ?
      `).get(depositId);

      if (!deposit) {
        return { error: "Deposit request not found", status: 404 };
      }

      if (deposit.status !== "pending") {
        return { error: "Deposit has already been processed", status: 409 };
      }

      const update = db.prepare(`
        UPDATE deposits
        SET status = 'approved', approved_at = datetime('now')
        WHERE id = ? AND status = 'pending'
      `).run(depositId);

      if (update.changes !== 1) {
        return { error: "Deposit has already been processed", status: 409 };
      }

      db.prepare(`
        UPDATE users
        SET balance = balance + ?, wallet = wallet + ?
        WHERE id = ?
      `).run(deposit.amount, deposit.amount, deposit.user_id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Deposit', ?, datetime('now'))
      `).run(deposit.user_id, deposit.amount);

      return { success: true };
    })();

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: "Deposit approved and wallet credited"
    });
  } catch (error) {
    console.error("Deposit approval failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to approve deposit"
    });
  }
});

// My wallet
app.get("/api/wallet", authenticateToken, (req, res) => {
  const user = db.prepare(`
    SELECT id, balance, wallet
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  res.json({
    success: true,
    wallet: {
      balance: user.balance,
      wallet: user.wallet
    }
  });
});

// Create a deposit request. Money is NOT credited until an admin approves it.
app.post("/api/deposits", authenticateToken, (req, res) => {
  const { amount, network, account } = req.body;
  const depositAmount = Number(amount);

  if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid deposit amount"
    });
  }

  if (!network || !["MTN", "Airtel"].includes(network)) {
    return res.status(400).json({
      success: false,
      message: "Please select MTN or Airtel"
    });
  }

  if (!account || !String(account).trim()) {
    return res.status(400).json({
      success: false,
      message: "Enter your Mobile Money number"
    });
  }

  const result = db.prepare(`
    INSERT INTO deposits (user_id, amount, network, account, status, date)
    VALUES (?, ?, ?, ?, 'pending', datetime('now'))
  `).run(
    req.user.id,
    depositAmount,
    network,
    String(account).trim()
  );

  res.status(201).json({
    success: true,
    message: "Deposit request submitted. Your balance will update after approval.",
    depositId: result.lastInsertRowid
  });
});

// My deposit requests
app.get("/api/deposits", authenticateToken, (req, res) => {
  const deposits = db.prepare(`
    SELECT id, amount, network, account, status, date, approved_at
    FROM deposits
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);

  res.json({
    success: true,
    deposits
  });
});

// My transactions
app.get("/api/transactions", authenticateToken, (req, res) => {
  const transactions = db.prepare(`
    SELECT id, type, amount, date
    FROM transactions
    WHERE user_id = ?
    ORDER BY id DESC
  `).all(req.user.id);

  res.json({
    success: true,
    transactions
  });
});

// Create withdrawal request. Pending withdrawals reserve available balance
// logically, so a user cannot submit several pending requests that together
// exceed their current balance. The actual debit still happens on approval.
app.post("/api/withdrawals", authenticateToken, (req, res) => {
  const { amount, account } = req.body;

  if (!amount || !account) {
    return res.status(400).json({
      success: false,
      message: "Amount and account are required"
    });
  }

  const withdrawalAmount = Number(amount);

  if (!Number.isFinite(withdrawalAmount) || withdrawalAmount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid withdrawal amount"
    });
  }

  const accountNumber = String(account).trim();
  if (!accountNumber) {
    return res.status(400).json({
      success: false,
      message: "Account is required"
    });
  }

  try {
    const result = db.transaction(() => {
      const user = db.prepare(`
        SELECT id, balance
        FROM users
        WHERE id = ?
      `).get(req.user.id);

      if (!user) {
        return { error: "User not found", status: 404 };
      }

      const pending = db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS amount
        FROM withdrawals
        WHERE user_id = ? AND status = 'pending'
      `).get(req.user.id);

      const pendingAmount = Number(pending.amount || 0);
      const availableBalance = Number(user.balance) - pendingAmount;

      if (withdrawalAmount > availableBalance) {
        return {
          error: "Insufficient available balance. You already have pending withdrawals.",
          status: 400
        };
      }

      const insert = db.prepare(`
        INSERT INTO withdrawals (user_id, amount, account, status, date)
        VALUES (?, ?, ?, 'pending', datetime('now'))
      `).run(req.user.id, withdrawalAmount, accountNumber);

      return { success: true, withdrawalId: insert.lastInsertRowid };
    })();

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted",
      withdrawalId: result.withdrawalId
    });
  } catch (error) {
    console.error("Withdrawal request failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to submit withdrawal request"
    });
  }
});

// Ensure existing members also receive the standard task/reward records.
function ensureUserActivities(userId) {
  const taskDefaults = [
    ["Invite 3 friends", 500],
    ["Daily check-in", 50],
    ["Share app", 200]
  ];

  for (const [title, reward] of taskDefaults) {
    const exists = db.prepare(`
      SELECT id FROM tasks WHERE user_id = ? AND title = ?
    `).get(userId, title);

    if (!exists) {
      db.prepare(`
        INSERT INTO tasks (user_id, title, reward, done)
        VALUES (?, ?, ?, 0)
      `).run(userId, title, reward);
    }
  }

  const rewardDefaults = [
    ["Welcome", 0, 1],
    ["VIP Bonus", 500, 0]
  ];

  for (const [title, amount, claimed] of rewardDefaults) {
    const exists = db.prepare(`
      SELECT id FROM rewards WHERE user_id = ? AND title = ?
    `).get(userId, title);

    if (!exists) {
      db.prepare(`
        INSERT INTO rewards (user_id, title, amount, claimed)
        VALUES (?, ?, ?, ?)
      `).run(userId, title, amount, claimed);
    }
  }
}

// Tasks - only the authenticated member's tasks are returned.
app.get("/api/tasks", authenticateToken, (req, res) => {
  try {
    ensureUserActivities(req.user.id);

    const tasks = db.prepare(`
      SELECT id, title, reward,
        CASE
          WHEN title = 'Daily check-in'
            THEN CASE WHEN date((SELECT last_checkin FROM users WHERE id = ?)) = date('now') THEN 1 ELSE 0 END
          ELSE done
        END AS done
      FROM tasks
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id, req.user.id);

    res.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error("Loading tasks failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load tasks"
    });
  }
});

// Daily check-in is the only task that can be claimed automatically.
// Referral and sharing tasks require real verification and therefore cannot
// be converted into wallet credit merely by calling an API endpoint.
app.post("/api/tasks/:id/claim", authenticateToken, (req, res) => {
  const taskId = Number(req.params.id);

  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid task ID"
    });
  }

  try {
    const result = db.transaction(() => {
      const task = db.prepare(`
        SELECT id, title, reward
        FROM tasks
        WHERE id = ? AND user_id = ?
      `).get(taskId, req.user.id);

      if (!task) {
        return { error: "Task not found", status: 404 };
      }

      if (task.title !== "Daily check-in") {
        return {
          error: "This task requires verification before its reward can be claimed.",
          status: 400
        };
      }

      const user = db.prepare(`
        SELECT id, last_checkin
        FROM users
        WHERE id = ?
      `).get(req.user.id);

      if (!user) {
        return { error: "User not found", status: 404 };
      }

      const checkedToday = db.prepare(`
        SELECT 1
        WHERE date(?) = date('now')
      `).get(user.last_checkin);

      if (checkedToday) {
        return {
          error: "Daily check-in already claimed today.",
          status: 409
        };
      }

      db.prepare(`
        UPDATE users
        SET last_checkin = datetime('now'),
            balance = balance + ?,
            wallet = wallet + ?
        WHERE id = ?
      `).run(task.reward, task.reward, req.user.id);

      db.prepare(`
        UPDATE tasks
        SET done = 1
        WHERE id = ? AND user_id = ?
      `).run(task.id, req.user.id);

      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, date)
        VALUES (?, 'Daily Check-in Reward', ?, datetime('now'))
      `).run(req.user.id, task.reward);

      return { success: true, amount: task.reward };
    })();

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: "Daily check-in reward claimed",
      amount: result.amount
    });
  } catch (error) {
    console.error("Task claim failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to claim task reward"
    });
  }
});

// Rewards - only the authenticated member's rewards are returned.
app.get("/api/rewards", authenticateToken, (req, res) => {
  try {
    ensureUserActivities(req.user.id);

    const rewards = db.prepare(`
      SELECT id, title, amount, claimed
      FROM rewards
      WHERE user_id = ?
      ORDER BY id DESC
    `).all(req.user.id);

    res.json({
      success: true,
      rewards
    });
  } catch (error) {
    console.error("Loading rewards failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to load rewards"
    });
  }
});

// Claim a reward atomically and only when it belongs to the authenticated user.
app.post("/api/rewards/:id/claim", authenticateToken, (req, res) => {
  const rewardId = Number(req.params.id);

  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid reward ID"
    });
  }

  try {
    const result = db.transaction(() => {
      const reward = db.prepare(`
        SELECT id, title, amount, claimed
        FROM rewards
        WHERE id = ? AND user_id = ?
      `).get(rewardId, req.user.id);

      if (!reward) {
        return { error: "Reward not found", status: 404 };
      }

      if (Number(reward.claimed) === 1) {
        return { error: "Reward has already been claimed.", status: 409 };
      }

      const update = db.prepare(`
        UPDATE rewards
        SET claimed = 1
        WHERE id = ? AND user_id = ? AND claimed = 0
      `).run(reward.id, req.user.id);

      if (update.changes !== 1) {
        return { error: "Reward has already been claimed.", status: 409 };
      }

      db.prepare(`
        UPDATE users
        SET balance = balance + ?, wallet = wallet + ?
        WHERE id = ?
      `).run(reward.amount, reward.amount, req.user.id);

      if (Number(reward.amount) !== 0) {
        db.prepare(`
          INSERT INTO transactions (user_id, type, amount, date)
          VALUES (?, ?, ?, datetime('now'))
        `).run(req.user.id, `${reward.title} Reward`, reward.amount);
      }

      return { success: true, amount: reward.amount };
    })();

    if (result.error) {
      return res.status(result.status).json({
        success: false,
        message: result.error
      });
    }

    res.json({
      success: true,
      message: "Reward claimed successfully",
      amount: result.amount
    });
  } catch (error) {
    console.error("Reward claim failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to claim reward"
    });
  }
});

// Team
app.get("/api/team", authenticateToken, (req, res) => {
  const members = db.prepare(`
    SELECT member_name, earn
    FROM team
    WHERE user_id = ?
  `).all(req.user.id);

  const earnings = members.reduce(
    (total, member) => total + Number(member.earn || 0),
    0
  );

  res.json({
    success: true,
    members,
    memberCount: members.length,
    earnings
  });
});

// Website
app.get("/", (req, res) => {
  const htmlPath = path.join(__dirname, "public", "index.html");
  const html = fs.readFileSync(htmlPath, "utf8");
  const enhancedHtml = html.replace(
    "</body>",
    '  <script src="/casharrow-enhancements.js"></script>\n</body>'
  );
  res.type("html").send(enhancedHtml);
});

async function startServer() {
  await db.ready;
  app.listen(PORT, () => {
    console.log(`CashArrow is running on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch(error => {
    console.error("CashArrow startup failed:", error);
    process.exit(1);
  });
}

module.exports = app;
