const express = require("express");
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
app.use(express.static(path.join(__dirname, "public")));

// Server status
app.get("/api/status", (req, res) => {
res.json({
success: true,
message: "CashArrow server is running"
});
});

// Register
app.post("/api/register", (req, res) => {

  const { phone, name, password, referralCode } = req.body;

  if (!phone || !name || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, phone and password are required"
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  const existingUser = db
    .prepare("SELECT id FROM users WHERE phone = ?")
    .get(phone);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "An account with this phone already exists"
    });
  }

  let referrer = null;

  if (referralCode) {
    referrer = db
      .prepare("SELECT id, name FROM users WHERE referral_code = ?")
      .get(referralCode);
  }

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

  const newReferralCode =
    "CA" + String(newUserId).padStart(6, "0");

  db.prepare(`
    UPDATE users
    SET referral_code = ?
    WHERE id = ?
  `).run(newReferralCode, newUserId);

  /*
    Add the new member to the referrer's team
    and give the referrer UGX 5,000.
  */

  if (referrer) {

  const referralReward = 5000;

    db.prepare(`
      INSERT INTO team
      (user_id, member_name, earn)
      VALUES (?, ?, ?)
    `).run(
      referrer.id,
      name,
      referralReward
    );

    db.prepare(`
      UPDATE users
      SET balance = balance + ?
      WHERE id = ?
    `).run(
      referralReward,
      referrer.id
    );

    db.prepare(`
      INSERT INTO transactions
      (user_id, type, amount, date)
      VALUES (?, ?, ?, datetime('now'))
    `).run(
      referrer.id,
      "Referral Reward",
      referralReward
    );
  }

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    userId: newUserId,
    referralCode: newReferralCode
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
// Create withdrawal request
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

  const user = db.prepare(`
    SELECT id, balance
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  if (withdrawalAmount > user.balance) {
    return res.status(400).json({
      success: false,
      message: "Insufficient balance"
    });
  }

  const result = db.prepare(`
    INSERT INTO withdrawals (user_id, amount, account, status, date)
    VALUES (?, ?, ?, 'pending', datetime('now'))
  `).run(req.user.id, withdrawalAmount, account);

  res.status(201).json({
    success: true,
    message: "Withdrawal request submitted",
    withdrawalId: result.lastInsertRowid
  });
});
// Tasks
app.get("/api/tasks", (req, res) => {
  const tasks = db
    .prepare("SELECT id, title, reward, done FROM tasks ORDER BY id DESC")
    .all();

  res.json({
    success: true,
    tasks
  });
});

// Rewards
app.get("/api/rewards", (req, res) => {
  const rewards = db
    .prepare("SELECT id, title, amount, claimed FROM rewards ORDER BY id DESC")
    .all();

  res.json({
    success: true,
    rewards
  });
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
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CashArrow is running on port ${PORT}`);
});
