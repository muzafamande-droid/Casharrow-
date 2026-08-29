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
const { phone, name, password } = req.body;

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

const hash = bcrypt.hashSync(password, 10);

const result = db.prepare("INSERT INTO users (phone, name, password) VALUES (?, ?, ?)").run(phone, name, hash);

res.status(201).json({
success: true,
message: "Account created successfully",
userId: result.lastInsertRowid
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
    wallet: user.wallet
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

// Tasks
app.get("/api/tasks", (req, res) => {
const tasks = db.prepare("SELECT id, title, reward, done FROM tasks ORDER BY id DESC").all();

res.json({
success: true,
tasks
});
});


// Rewards
app.get("/api/rewards", (req, res) => {
const rewards = db.prepare("SELECT id, title, amount, claimed FROM rewards ORDER BY id DESC").all();

res.json({
success: true,
rewards
});
});

// Website
app.get("*", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`CashArrow is running on port ${PORT}`);
});
