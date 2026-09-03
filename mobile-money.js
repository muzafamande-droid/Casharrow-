const crypto = require("crypto");

function normalizeMsisdn(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.startsWith("256") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `256${digits}`;
  return null;
}

function configured() {
  return Boolean(
    process.env.MTN_BASE_URL &&
    process.env.MTN_COLLECTION_SUBSCRIPTION_KEY &&
    process.env.MTN_API_USER &&
    process.env.MTN_API_KEY
  );
}

async function parseResponse(response) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch (_) { body = { raw: text }; }
  return { ok: response.ok, status: response.status, body };
}

async function getAccessToken() {
  if (!configured()) throw new Error("MTN automatic deposits are not configured");

  const credentials = Buffer.from(
    `${process.env.MTN_API_USER}:${process.env.MTN_API_KEY}`
  ).toString("base64");

  const response = await fetch(
    `${process.env.MTN_BASE_URL.replace(/\/$/, "")}/collection/token/`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Ocp-Apim-Subscription-Key": process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const result = await parseResponse(response);
  if (!result.ok || !result.body.access_token) {
    throw new Error("Unable to authenticate with MTN Mobile Money");
  }
  return result.body.access_token;
}

async function requestPayment({ amount, phone, reference, callbackUrl }) {
  const accessToken = await getAccessToken();
  const targetEnvironment = process.env.MTN_TARGET_ENVIRONMENT || "mtnuganda";
  const currency = process.env.MTN_CURRENCY || "UGX";
  const baseUrl = process.env.MTN_BASE_URL.replace(/\/$/, "");

  const response = await fetch(`${baseUrl}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Ocp-Apim-Subscription-Key": process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
      "X-Target-Environment": targetEnvironment,
      "X-Reference-Id": reference,
      "X-Callback-Url": callbackUrl,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      amount: String(amount),
      currency,
      externalId: `CASHARROW-${reference}`,
      payer: { partyIdType: "MSISDN", partyId: phone },
      payerMessage: "CashArrow wallet deposit",
      payeeNote: "CashArrow wallet deposit"
    })
  });

  const result = await parseResponse(response);
  if (response.status !== 202) {
    console.error("MTN RequestToPay failed:", result.status, result.body);
    throw new Error("MTN could not start the payment request");
  }

  return { reference, status: "PENDING" };
}

async function getPaymentStatus(reference) {
  const accessToken = await getAccessToken();
  const targetEnvironment = process.env.MTN_TARGET_ENVIRONMENT || "mtnuganda";
  const baseUrl = process.env.MTN_BASE_URL.replace(/\/$/, "");

  const response = await fetch(
    `${baseUrl}/collection/v1_0/requesttopay/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Ocp-Apim-Subscription-Key": process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
        "X-Target-Environment": targetEnvironment
      }
    }
  );

  const result = await parseResponse(response);
  if (!result.ok) throw new Error("Unable to check MTN payment status");
  return result.body;
}

function makeReference() {
  return crypto.randomUUID();
}

module.exports = {
  normalizeMsisdn,
  configured,
  makeReference,
  requestPayment,
  getPaymentStatus
};
