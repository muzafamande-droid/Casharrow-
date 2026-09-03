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
    /CREATE TABLE IF NOT EXISTS _sync_changes/,
    "local mutations must be journaled"
  );

  assert.match(
    databaseSource,
    /syncPendingChanges\(\)/,
    "normal synchronization must process only journaled changes"
  );

  assert.match(
    databaseSource,
    /DELETE FROM _sync_changes WHERE seq <= \?/,
    "journal entries must be cleared only after a successful sync"
  );

  assert.match(
    databaseSource,
    /syncEnabled\s*=\s*true/,
    "PostgreSQL sync must only be enabled after restore completes"
  );

  assert.match(
    databaseSource,
    /flushPersistence\(\)/,
    "tests and shutdown flows must be able to wait for queued persistence work"
  );
});
