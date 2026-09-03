const crypto = require("crypto");

const SANDBOX_BASE_URL = "https://sandbox.momodeveloper.mtn.com";

function normalizeMsisdn(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `256${digits}`;
  return null;
}

function config() {
  return {
    baseUrl: String(process.env.MTN_BASE_URL || SANDBOX_BASE_URL).replace(/\/$/, ""),
    targetEnvironment: "sandbox",
    currency: String(process.env.MTN_CURRENCY || "EUR").trim().toUpperCase(),
    enabled: process.env.MTN_AUTOMATIC_DEPOSITS_ENABLED === "true",
    subscriptionKey: process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
    apiUser: process.env.MTN_API_USER,
    apiKey: process.env.MTN_API_KEY
  };
}

function configured() {
  const c = config();
  return c.enabled && Boolean(c.subscriptionKey && c.apiUser && c.apiKey) && c.baseUrl === SANDBOX_BASE_URL;
}

function makeReference(depositId) {
  const digest = crypto.createHash("sha256").update(`casharrow-mtn-sandbox:${depositId}`).digest("hex");
  return `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
}

async function parseResponse(response) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { raw: text }; }
  return { ok: response.ok, status: response.status, body };
}

let token = null;
let tokenExpiresAt = 0;
let tokenPromise = null;

async function getAccessToken() {
  if (!configured()) throw new Error("MTN sandbox automatic deposits are not configured");
  if (token && tokenExpiresAt > Date.now() + 60000) return token;
  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const c = config();
    const basic = Buffer.from(`${c.apiUser}:${c.apiKey}`).toString("base64");
    const response = await fetch(`${c.baseUrl}/collection/token/`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Ocp-Apim-Subscription-Key": c.subscriptionKey,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    const result = await parseResponse(response);
    if (!result.ok || !result.body.access_token) throw new Error(`MTN sandbox authentication failed (${result.status})`);
    token = result.body.access_token;
    tokenExpiresAt = Date.now() + Number(result.body.expires_in || 3600) * 1000;
    return token;
  })();

  try { return await tokenPromise; } finally { tokenPromise = null; }
}

async function requestPayment({ amount, phone, reference, callbackUrl }) {
  const c = config();
  const accessToken = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Ocp-Apim-Subscription-Key": c.subscriptionKey,
    "X-Target-Environment": c.targetEnvironment,
    "X-Reference-Id": reference,
    "Content-Type": "application/json"
  };
  if (callbackUrl) headers["X-Callback-Url"] = callbackUrl;

  const response = await fetch(`${c.baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      amount: String(amount),
      currency: c.currency,
      externalId: `CASHARROW-${reference}`,
      payer: { partyIdType: "MSISDN", partyId: phone },
      payerMessage: "CashArrow wallet deposit",
      payeeNote: "CashArrow wallet deposit"
    })
  });

  const result = await parseResponse(response);
  if (response.status !== 202) {
    console.error("MTN RequestToPay failed:", result.status, result.body);
    throw new Error(`MTN RequestToPay failed (${result.status})`);
  }
  return { reference, status: "PENDING" };
}

async function getPaymentStatus(reference) {
  const c = config();
  const accessToken = await getAccessToken();
  const response = await fetch(`${c.baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": c.subscriptionKey,
      "X-Target-Environment": c.targetEnvironment
    }
  });
  const result = await parseResponse(response);
  if (!result.ok) throw new Error(`MTN payment status failed (${result.status})`);
  return result.body;
}

module.exports = { SANDBOX_BASE_URL, normalizeMsisdn, config, configured, makeReference, requestPayment, getPaymentStatus };
