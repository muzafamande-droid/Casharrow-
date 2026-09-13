const express = require("express");
const db = require("./database-pg");

const router = express.Router();

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }
  try {
    const jwt = require("jsonwebtoken");
    req.user = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}

router.get("/tasks", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, title, reward, done FROM tasks WHERE user_id = $1 ORDER BY id ASC",
      [req.user.id]
    );
    res.json({ success: true, tasks: result.rows });
  } catch (error) {
    console.error("Tasks lookup failed:", error);
    res.status(500).json({ success: false, message: "Unable to load tasks" });
  }
});

router.post("/tasks/:id/claim", authenticateToken, async (req, res) => {
  const taskId = Number(req.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid task ID" });
  }
  try {
    const result = await db.transaction(async client => {
      const task = await client.query(
        "SELECT id, title, reward, done FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [taskId, req.user.id]
      );
      if (!task.rowCount) return { error: "Task not found", status: 404 };
      const row = task.rows[0];
      if (Number(row.done) === 1) return { error: "Task already claimed", status: 409 };
      const title = String(row.title || "").trim().toLowerCase();
      const amount = Number(row.reward || 0);
      if (amount < 0) return { error: "Invalid task reward", status: 409 };

      // Only Daily check-in is self-completing. Other tasks require proof that
      // the required action actually happened before any wallet credit.
      if (title === "invite 3 friends") {
        const referred = await client.query(
          "SELECT COUNT(*)::int AS count FROM users WHERE referred_by = $1",
          [req.user.id]
        );
        if (Number(referred.rows[0].count) < 3) {
          return { error: "Invite 3 friends first. Your reward will unlock after 3 direct referrals join.", status: 409 };
        }
      } else if (title === "share app") {
        return { error: "This task cannot be rewarded until the share action can be verified.", status: 409 };
      } else if (title !== "daily check-in") {
        return { error: "This task is locked until its completion can be verified.", status: 409 };
      }

      await client.query("UPDATE tasks SET done = 1 WHERE id = $1 AND user_id = $2", [taskId, req.user.id]);
      if (amount > 0) {
        await client.query("UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2", [amount, req.user.id]);
        await client.query(
          "INSERT INTO transactions (id, user_id, type, amount, reference) VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Task Reward', $2, $3)",
          [req.user.id, amount, `TASK-${taskId}`]
        );
      }
      return { success: true, amount };
    });
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    res.json({ success: true, message: "Task reward claimed", amount: result.amount });
  } catch (error) {
    console.error("Task claim failed:", error);
    res.status(500).json({ success: false, message: "Unable to claim task" });
  }
});

router.get("/rewards", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, title, amount, claimed FROM rewards WHERE user_id = $1 ORDER BY id ASC",
      [req.user.id]
    );
    res.json({ success: true, rewards: result.rows });
  } catch (error) {
    console.error("Rewards lookup failed:", error);
    res.status(500).json({ success: false, message: "Unable to load rewards" });
  }
});

router.post("/rewards/:id/claim", authenticateToken, async (req, res) => {
  const rewardId = Number(req.params.id);
  if (!Number.isInteger(rewardId) || rewardId <= 0) {
    return res.status(400).json({ success: false, message: "Invalid reward ID" });
  }
  try {
    const result = await db.transaction(async client => {
      const reward = await client.query(
        "SELECT id, title, amount, claimed FROM rewards WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [rewardId, req.user.id]
      );
      if (!reward.rowCount) return { error: "Reward not found", status: 404 };
      const row = reward.rows[0];
      if (Number(row.claimed) === 1) return { error: "Reward already claimed", status: 409 };
      const amount = Number(row.amount || 0);
      if (amount < 0) return { error: "Invalid reward amount", status: 409 };

      // A reward must be explicitly unlocked by server-side business logic.
      // Legacy positive rewards without an eligibility record are never
      // allowed to become wallet credit merely because the button was pressed.
      if (amount > 0) {
        return { error: "This reward is not unlocked yet.", status: 409 };
      }

      await client.query("UPDATE rewards SET claimed = 1 WHERE id = $1 AND user_id = $2", [rewardId, req.user.id]);
      return { success: true, amount: 0 };
    });
    if (result.error) return res.status(result.status).json({ success: false, message: result.error });
    res.json({ success: true, message: "Reward claimed", amount: result.amount });
  } catch (error) {
    console.error("Reward claim failed:", error);
    res.status(500).json({ success: false, message: "Unable to claim reward" });
  }
});

router.get("/team", authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT member_name, earn FROM team WHERE user_id = $1 ORDER BY id DESC",
      [req.user.id]
    );
    const totalEarn = result.rows.reduce((sum, row) => sum + Number(row.earn || 0), 0);
    res.json({ success: true, members: result.rows, totalMembers: result.rowCount, totalEarn });
  } catch (error) {
    console.error("Team lookup failed:", error);
    res.status(500).json({ success: false, message: "Unable to load team" });
  }
});

module.exports = { router };
