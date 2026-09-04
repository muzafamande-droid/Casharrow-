const assert = require("node:assert/strict");
const test = require("node:test");

process.env.MTN_ENVIRONMENT = "sandbox";
delete process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED;

afterEach(() => {
  process.env.MTN_ENVIRONMENT = "sandbox";
  delete process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED;
  delete process.env.MTN_COLLECTION_SUBSCRIPTION_KEY;
  delete process.env.MTN_API_USER;
  delete process.env.MTN_API_KEY;
  delete process.env.MTN_BASE_URL;
});

const momo = require("../mobile-money-sandbox");

test("normalizes Ugandan MSISDN values", () => {
  assert.equal(momo.normalizeMsisdn("0700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("256700123456"), "256700123456");
  assert.equal(momo.normalizeMsisdn("12345"), null);
});

test("sandbox is disabled until explicitly enabled and credentialed", () => {
  assert.equal(momo.configured(), false);
});

test("production mode cannot enable the sandbox integration", () => {
  process.env.MTN_ENVIRONMENT = "production";
  process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED = "true";
  process.env.MTN_COLLECTION_SUBSCRIPTION_KEY = "test-subscription";
  process.env.MTN_API_USER = "test-user";
  process.env.MTN_API_KEY = "test-key";
  process.env.MTN_BASE_URL = momo.SANDBOX_BASE_URL;

  assert.equal(momo.configured(), false);
});

test("non-sandbox MTN base URLs cannot enable this integration", () => {
  process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED = "true";
  process.env.MTN_COLLECTION_SUBSCRIPTION_KEY = "test-subscription";
  process.env.MTN_API_USER = "test-user";
  process.env.MTN_API_KEY = "test-key";
  process.env.MTN_BASE_URL = "https://example.invalid";

  assert.equal(momo.configured(), false);
});

test("deposit references are deterministic UUID-shaped values", () => {
  const a = momo.makeReference(42);
  const b = momo.makeReference(42);
  const c = momo.makeReference(43);
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
});
