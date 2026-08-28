const express = require("express");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
res.json({
success: true,
message: "CashArrow server is running"
});
});

app.get("/api/tasks", (req, res) => {
const tasks = db.prepare(
"SELECT id, title, reward, done FROM tasks ORDER BY id DESC"
).all();

res.json({
success: true,
tasks
});
});

app.get("/api/rewards", (req, res) => {
const rewards = db.prepare(
"SELECT id, title, amount, claimed FROM rewards ORDER BY id DESC"
).all();

res.json({
success: true,
rewards
});
});

app.get("*", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
console.log("CashArrow is running on port ${PORT}");
});
