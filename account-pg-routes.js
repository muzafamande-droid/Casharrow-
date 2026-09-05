const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./database-pg");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) throw new Error("JWT_SECRET environment variable is not configured");

function normalizeUgandanPhone(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("256")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "256" + digits.slice(1);
  return digits;
}

function phoneCandidates(value) {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  const normalized = normalizeUgandanPhone(value);
  const candidates = new Set([raw, digits, normalized]);
  if (normalized.startsWith("256") && normalized.length === 12) candidates.add("0" + normalized.slice(3));
  return [...candidates].filter(Boolean);
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required" });
  try { req.user = jwt.verify(authHeader.slice(7), JWT_SECRET); next(); }
  catch { return res.status(401).json({ success: false, message: "Invalid or expired session" }); }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ success: false, message: "Admin access required" });
  next();
}

router.post("/register", async (req, res) => {
  const { phone, name, password, confirmPassword, referralCode } = req.body;
  if (!phone || !name || !password || !confirmPassword) return res.status(400).json({ success: false, message: "Name, phone, password and confirm password are required" });
  if (String(password).length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  if (password !== confirmPassword) return res.status(400).json({ success: false, message: "Passwords do not match" });

  const normalizedPhone = normalizeUgandanPhone(phone);
  const normalizedName = String(name).trim();
  const normalizedReferralCode = referralCode ? String(referralCode).trim().toUpperCase() : null;
  if (!normalizedPhone || normalizedPhone.length < 10) return res.status(400).json({ success: false, message: "Enter a valid Ugandan phone number" });

  try {
    const result = await db.transaction(async client => {
      const existing = await client.query("SELECT id FROM users WHERE phone = ANY($1::text[])", [phoneCandidates(phone)]);
      if (existing.rowCount) return { error: "An account with this phone already exists", status: 409 };

      let referrer = null;
      if (normalizedReferralCode) {
        const found = await client.query("SELECT id, name FROM users WHERE referral_code = $1 FOR UPDATE", [normalizedReferralCode]);
        referrer = found.rows[0] || null;
      }

      const hash = await bcrypt.hash(password, 12);
      const inserted = await client.query(`
        INSERT INTO users (id, phone, name, password, role, balance, wallet, reserved_balance, vip, referral_code, referred_by)
        VALUES (nextval('casharrow_users_id_seq'), $1, $2, $3, 'user', 0, 0, 0, 1, NULL, $4)
        RETURNING id, name, phone, role, balance, wallet, referral_code
      `, [normalizedPhone, normalizedName, hash, referrer ? referrer.id : null]);

      const user = inserted.rows[0];
      const newReferralCode = "CA" + String(user.id).padStart(6, "0");
      await client.query("UPDATE users SET referral_code = $1 WHERE id = $2", [newReferralCode, user.id]);

      await client.query(`
        INSERT INTO tasks (id, user_id, title, reward, done)
        VALUES
          (nextval('casharrow_tasks_id_seq'), $1, 'Invite 3 friends', 500, 0),
          (nextval('casharrow_tasks_id_seq'), $1, 'Daily check-in', 50, 0),
          (nextval('casharrow_tasks_id_seq'), $1, 'Share app', 200, 0)
      `, [user.id]);

      await client.query(`
        INSERT INTO rewards (id, user_id, title, amount, claimed)
        VALUES
          (nextval('casharrow_rewards_id_seq'), $1, 'Welcome', 0, 1),
          (nextval('casharrow_rewards_id_seq'), $1, 'VIP Bonus', 500, 0)
      `, [user.id]);

      return { userId: Number(user.id), referralCode: newReferralCode };
    });

    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    return res.status(201).json({ success: true, message: "Account created successfully", userId: result.userId, referralCode: result.referralCode });
  } catch (error) {
    console.error("PostgreSQL registration failed:", error);
    if (error.code === "23505") return res.status(409).json({ success: false, message: "An account with this phone already exists" });
    return res.status(500).json({ success: false, message: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ success: false, message: "Phone and password are required" });
  try {
    const result = await db.query("SELECT id, name, phone, password, role, balance, wallet, referral_code FROM users WHERE phone = ANY($1::text[])", [phoneCandidates(phone)]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ success: false, message: "Invalid phone or password" });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ success: true, message: "Login successful", token, user: { id: Number(user.id), name: user.name, phone: user.phone, role: user.role, balance: Number(user.balance), wallet: Number(user.wallet), referralCode: user.referral_code } });
  } catch (error) {
    console.error("PostgreSQL login failed:", error);
    return res.status(500).json({ success: false, message: "Login failed" });
  }
});

router.get("/admin", authenticateToken, requireAdmin, (req, res) => res.json({ success: true, message: "Admin access granted", admin: { id: Number(req.user.id), role: req.user.role } }));

router.get("/admin/dashboard", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query(`SELECT (SELECT COUNT(*) FROM users) AS total_users, (SELECT COALESCE(SUM(balance), 0) FROM users) AS total_balance, (SELECT COUNT(*) FROM tasks) AS total_tasks`);
    const row = result.rows[0];
    res.json({ success: true, totalUsers: Number(row.total_users), totalBalance: Number(row.total_balance), totalTasks: Number(row.total_tasks) });
  } catch (error) {
    console.error("Admin dashboard failed:", error);
    res.status(500).json({ success: false, message: "Unable to load admin dashboard" });
  }
});

router.get("/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await db.query("SELECT id, name, phone, balance, role, vip FROM users ORDER BY id DESC");
    res.json({ success: true, users: result.rows.map(user => ({ id: Number(user.id), name: user.name, phone: user.phone, balance: Number(user.balance), role: user.role, vip: Number(user.vip) })) });
  } catch (error) {
    console.error("Admin users lookup failed:", error);
    res.status(500).json({ success: false, message: "Unable to load users" });
  }
});

module.exports = { router };
