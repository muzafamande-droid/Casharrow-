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
        "SELECT id, reward, done FROM tasks WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [taskId, req.user.id]
      );
      if (!task.rowCount) return { error: "Task not found", status: 404 };
      if (Number(task.rows[0].done) === 1) return { error: "Task already claimed", status: 409 };
      const amount = Number(task.rows[0].reward || 0);
      if (amount < 0) return { error: "Invalid task reward", status: 409 };
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
        "SELECT id, amount, claimed FROM rewards WHERE id = $1 AND user_id = $2 FOR UPDATE",
        [rewardId, req.user.id]
      );
      if (!reward.rowCount) return { error: "Reward not found", status: 404 };
      if (Number(reward.rows[0].claimed) === 1) return { error: "Reward already claimed", status: 409 };
      const amount = Number(reward.rows[0].amount || 0);
      if (amount < 0) return { error: "Invalid reward amount", status: 409 };
      await client.query("UPDATE rewards SET claimed = 1 WHERE id = $1 AND user_id = $2", [rewardId, req.user.id]);
      if (amount > 0) {
        await client.query("UPDATE users SET balance = balance + $1, wallet = wallet + $1 WHERE id = $2", [amount, req.user.id]);
        await client.query(
          "INSERT INTO transactions (id, user_id, type, amount, reference) VALUES (nextval('casharrow_transactions_id_seq'), $1, 'Reward', $2, $3)",
          [req.user.id, amount, `REWARD-${rewardId}`]
        );
      }
      return { success: true, amount };
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
