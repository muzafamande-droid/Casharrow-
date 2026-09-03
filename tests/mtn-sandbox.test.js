const assert = require("node:assert/strict");
const test = require("node:test");

process.env.MTN_ENVIRONMENT = "sandbox";
delete process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED;

const momo = require("../mobile-money-v3");

test("normalizes Ugandan MSISDN values", () => {
  assert.equal(momo.normalizeMsisdn("0700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("256700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("12345"), null);
});

test("sandbox is disabled until explicitly enabled and credentialed", () => {
  delete process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED;
  delete process.env.MTN_COLLECTION_SUBSCRIPTION_KEY;
  delete process.env.MTN_API_USER;
  delete process.env.MTN_API_KEY;
  assert.equal(momo.config().baseUrl, momo.SANDBOX_BASE_URL);
  assert.equal(momo.config().targetEnvironment, "sandbox");
  assert.equal(momo.config().currency, "EUR");
  assert.equal(momo.configured(), false);
});

test("production mode never enables this sandbox integration", () => {
  process.env.MTN_ENVIRONMENT = "production";
  process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED = "true";
  process.env.MTN_COLLECTION_SUBSCRIPTION_KEY = "test-subscription";
  process.env.MTN_API_USER = "test-user";
  process.env.MTN_API_KEY = "test-key";
  assert.equal(momo.configured(), false);
  process.env.MTN_ENVIRONMENT = "sandbox";
});

test("deposit references are deterministic UUID-shaped values", () => {
  const a = momo.makeReference(42);
  const b = momo.makeReference(42);
  const c = momo.makeReference(43);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});
