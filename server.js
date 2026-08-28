
const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/status", (req, res) => {
res.json({
success: true,
message: "CashArrow server is running"
});
});

app.get("*", (req, res) => {
res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
console.log("CashArrow is running on port ${PORT}");
});
