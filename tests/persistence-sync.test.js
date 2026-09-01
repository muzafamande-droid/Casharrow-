const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const databaseSource = fs.readFileSync(
  path.join(__dirname, "..", "database.js"),
  "utf8"
);

test("PostgreSQL persistence sync is non-destructive", () => {
  assert.doesNotMatch(
    databaseSource,
    /TRUNCATE\s+referral_rewards,\s+team,\s+deposits,\s+withdrawals,\s+transactions,\s+rewards,\s+tasks,\s+users/i,
    "sync must never wipe durable PostgreSQL tables"
  );

  assert.match(
    databaseSource,
    /ON CONFLICT \(id\) DO UPDATE SET/,
    "sync must upsert rows by stable primary key"
  );

  assert.match(
    databaseSource,
    /syncEnabled\s*=\s*true/,
    "PostgreSQL sync must only be enabled after restore completes"
  );
});
