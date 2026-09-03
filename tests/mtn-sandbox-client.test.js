const assert = require("node:assert/strict");
const test = require("node:test");

const momo = require("../mobile-money-sandbox");

test("sandbox configuration defaults are safe", () => {
  delete process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED;
  delete process.env.MTN_COLLECTION_SUBSCRIPTION_KEY;
  delete process.env.MTN_API_USER;
  delete process.env.MTN_API_KEY;
  delete process.env.MTN_BASE_URL;

  const config = momo.config();
  assert.equal(config.baseUrl, momo.SANDBOX_BASE_URL);
  assert.equal(config.targetEnvironment, "sandbox");
  assert.equal(config.currency, "EUR");
  assert.equal(momo.configured(), false);
});

test("sandbox integration cannot be redirected to a production endpoint", () => {
  process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED = "true";
  process.env.MTN_COLLECTION_SUBSCRIPTION_KEY = "subscription";
  process.env.MTN_API_USER = "user";
  process.env.MTN_API_KEY = "key";
  process.env.MTN_BASE_URL = "https://proxy.momoapi.mtn.com";
  assert.equal(momo.configured(), false);
  delete process.env.MTN_BASE_URL;
});

test("Ugandan phone numbers normalize consistently", () => {
  assert.equal(momo.normalizeMsisdn("0700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("256700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("12345"), null);
});

test("deposit reference is deterministic and unique per deposit", () => {
  const first = momo.makeReference(10);
  const same = momo.makeReference(10);
  const other = momo.makeReference(11);
  assert.equal(first, same);
  assert.notEqual(first, other);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});

// Keep the sandbox client tests network-free: real MTN calls belong in the sandbox integration stage.
