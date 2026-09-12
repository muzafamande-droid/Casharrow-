const crypto = require("crypto");

const UGX = "UGX";
const DEFAULT_TIMEOUT_MS = 30000;

function automationEnabled() {
  return String(process.env.PAYMENTS_AUTOMATION_ENABLED || "false").toLowerCase() === "true";
}

function requireEnv(names, provider) {
  const missing = names.filter(name => !process.env[name]);
  if (missing.length) throw new Error(`${provider} provider is not configured: missing ${missing.join(", ")}`);
}

function jsonHeaders(extra = {}) {
  return { "Content-Type": "application/json", Accept: "application/json", ...extra };
}

async function request(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.PAYMENT_HTTP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS));
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!response.ok) {
      const message = data?.message || data?.error || data?.status?.message || `Provider HTTP ${response.status}`;
      const error = new Error(message);
      error.status = response.status;
      error.providerResponse = data;
      throw error;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function uuid() { return crypto.randomUUID(); }
function normalizePhone(phone) {
  const raw = String(phone || "").replace(/\s+/g, "").trim();
  if (/^0\d{9}$/.test(raw)) return `256${raw.slice(1)}`;
  if (/^256\d{9}$/.test(raw)) return raw;
  throw new Error("Mobile Money number must be a valid Uganda number");
}

let mtnTokenCache = { token: null, expiresAt: 0, type: null };
async function mtnToken(type) {
  const prefix = type === "collection" ? "MTN_COLLECTION" : "MTN_DISBURSEMENT";
  const cached = mtnTokenCache[type];
  if (cached?.token && cached.expiresAt > Date.now() + 30000) return cached.token;

  requireEnv([`${prefix}_API_USER`, `${prefix}_API_KEY`, `${prefix}_SUBSCRIPTION_KEY`], "MTN");
  const base = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
  const target = process.env.MTN_MOMO_TARGET_ENV || "sandbox";
  const basic = Buffer.from(`${process.env[`${prefix}_API_USER`]}:${process.env[`${prefix}_API_KEY`]}`).toString("base64");
  const response = await request(`${base}/${type === "collection" ? "collection" : "disbursement"}/token/`, {
    method: "POST",
    headers: jsonHeaders({
      Authorization: `Basic ${basic}`,
      "Ocp-Apim-Subscription-Key": process.env[`${prefix}_SUBSCRIPTION_KEY`],
      "X-Target-Environment": target
    })
  });
  const token = response.access_token;
  if (!token) throw new Error("MTN did not return an access token");
  mtnTokenCache[type] = { token, expiresAt: Date.now() + Number(response.expires_in || 3600) * 1000, type };
  return token;
}

async function mtnCollect({ amount, phone, reference, externalId }) {
  requireEnv(["MTN_COLLECTION_API_USER", "MTN_COLLECTION_API_KEY", "MTN_COLLECTION_SUBSCRIPTION_KEY"], "MTN");
  const base = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
  const target = process.env.MTN_MOMO_TARGET_ENV || "sandbox";
  const token = await mtnToken("collection");
  const providerReference = externalId || uuid();
  await request(`${base}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: jsonHeaders({
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": process.env.MTN_COLLECTION_SUBSCRIPTION_KEY,
      "X-Target-Environment": target,
      "X-Reference-Id": providerReference,
      "X-Callback-Url": process.env.MTN_COLLECTION_CALLBACK_URL || ""
    }),
    body: JSON.stringify({
      amount: String(amount),
      currency: UGX,
      externalId: reference || providerReference,
      payer: { partyIdType: "MSISDN", partyId: normalizePhone(phone) },
      payerMessage: process.env.MTN_COLLECTION_PAYER_MESSAGE || "AVEILOT deposit",
      payeeNote: process.env.MTN_COLLECTION_PAYEE_NOTE || "AVEILOT deposit"
    })
  });
  return { providerReference, status: "pending" };
}

async function mtnStatus(type, providerReference) {
  const prefix = type === "collection" ? "MTN_COLLECTION" : "MTN_DISBURSEMENT";
  requireEnv([`${prefix}_API_USER`, `${prefix}_API_KEY`, `${prefix}_SUBSCRIPTION_KEY`], "MTN");
  const base = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
  const target = process.env.MTN_MOMO_TARGET_ENV || "sandbox";
  const token = await mtnToken(type);
  const endpoint = type === "collection" ? `collection/v1_0/requesttopay/${encodeURIComponent(providerReference)}` : `disbursement/v1_0/transfer/${encodeURIComponent(providerReference)}`;
  const data = await request(`${base}/${endpoint}`, {
    method: "GET",
    headers: jsonHeaders({ Authorization: `Bearer ${token}`, "Ocp-Apim-Subscription-Key": process.env[`${prefix}_SUBSCRIPTION_KEY`], "X-Target-Environment": target })
  });
  const raw = String(data?.status || data?.financialTransactionStatus || "").toLowerCase();
  if (["successful", "success", "completed"].includes(raw)) return { status: "successful", raw: data };
  if (["failed", "rejected", "cancelled"].includes(raw)) return { status: "failed", raw: data };
  return { status: "pending", raw: data };
}

async function mtnDisburse({ amount, phone, reference, externalId }) {
  requireEnv(["MTN_DISBURSEMENT_API_USER", "MTN_DISBURSEMENT_API_KEY", "MTN_DISBURSEMENT_SUBSCRIPTION_KEY"], "MTN");
  const base = process.env.MTN_MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";
  const target = process.env.MTN_MOMO_TARGET_ENV || "sandbox";
  const token = await mtnToken("disbursement");
  const providerReference = externalId || uuid();
  await request(`${base}/disbursement/v1_0/transfer`, {
    method: "POST",
    headers: jsonHeaders({
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": process.env.MTN_DISBURSEMENT_SUBSCRIPTION_KEY,
      "X-Target-Environment": target,
      "X-Reference-Id": providerReference,
      "X-Callback-Url": process.env.MTN_DISBURSEMENT_CALLBACK_URL || ""
    }),
    body: JSON.stringify({
      amount: String(amount),
      currency: UGX,
      externalId: reference || providerReference,
      payee: { partyIdType: "MSISDN", partyId: normalizePhone(phone) },
      payerMessage: process.env.MTN_DISBURSEMENT_PAYER_MESSAGE || "AVEILOT withdrawal",
      payeeNote: process.env.MTN_DISBURSEMENT_PAYEE_NOTE || "AVEILOT withdrawal"
    })
  });
  return { providerReference, status: "pending" };
}

let airtelTokenCache = { token: null, expiresAt: 0 };
async function airtelToken() {
  requireEnv(["AIRTEL_CLIENT_ID", "AIRTEL_CLIENT_SECRET", "AIRTEL_PUBLIC_KEY"], "Airtel");
  if (airtelTokenCache.token && airtelTokenCache.expiresAt > Date.now() + 30000) return airtelTokenCache.token;
  const base = process.env.AIRTEL_API_BASE_URL || "https://openapi.airtel.africa";
  const data = await request(`${base}/auth/oauth2/token`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ client_id: process.env.AIRTEL_CLIENT_ID, client_secret: process.env.AIRTEL_CLIENT_SECRET, grant_type: "client_credentials" })
  });
  if (!data.access_token) throw new Error("Airtel did not return an access token");
  airtelTokenCache = { token: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
  return data.access_token;
}

async function airtelRequest(path, body) {
  const base = process.env.AIRTEL_API_BASE_URL || "https://openapi.airtel.africa";
  const token = await airtelToken();
  return request(`${base}${path}`, {
    method: "POST",
    headers: jsonHeaders({ Authorization: `Bearer ${token}`, "X-Country": "UG", "X-Currency": UGX, "X-Client-Id": process.env.AIRTEL_CLIENT_ID }),
    body: JSON.stringify(body)
  });
}

async function airtelCollect({ amount, phone, reference, externalId }) {
  const providerReference = externalId || uuid();
  await airtelRequest(process.env.AIRTEL_COLLECTION_PATH || "/merchant/v1/payments/", {
    reference: reference || providerReference,
    subscriber: { country: "UG", currency: UGX, msisdn: normalizePhone(phone).replace(/^256/, "") },
    transaction: { amount: Number(amount), country: "UG", currency: UGX, id: providerReference }
  });
  return { providerReference, status: "pending" };
}

async function airtelDisburse({ amount, phone, reference, externalId }) {
  const providerReference = externalId || uuid();
  await airtelRequest(process.env.AIRTEL_DISBURSEMENT_PATH || "/standard/v1/disbursements/", {
    payee: { msisdn: normalizePhone(phone).replace(/^256/, "") },
    reference: reference || providerReference,
    transaction: { amount: Number(amount), id: providerReference, type: "B2C", currency: UGX }
  });
  return { providerReference, status: "pending" };
}

async function airtelStatus(type, providerReference) {
  const base = process.env.AIRTEL_API_BASE_URL || "https://openapi.airtel.africa";
  const token = await airtelToken();
  const path = type === "collection"
    ? `${process.env.AIRTEL_COLLECTION_STATUS_PATH || "/standard/v1/payments/"}${encodeURIComponent(providerReference)}`
    : `${process.env.AIRTEL_DISBURSEMENT_STATUS_PATH || "/standard/v1/disbursements/"}${encodeURIComponent(providerReference)}`;
  const data = await request(`${base}${path}`, {
    method: "GET",
    headers: jsonHeaders({ Authorization: `Bearer ${token}`, "X-Country": "UG", "X-Currency": UGX, "X-Client-Id": process.env.AIRTEL_CLIENT_ID })
  });
  const code = String(data?.status?.code || data?.status?.response_code || data?.transaction?.status || "").toUpperCase();
  const message = String(data?.status?.message || "").toLowerCase();
  if (code === "200" || ["SUCCESS", "SUCCESSFUL", "COMPLETED"].includes(code) || message.includes("success")) return { status: "successful", raw: data };
  if (["400", "401", "402", "403", "404", "500"].includes(code) || message.includes("fail")) return { status: "failed", raw: data };
  return { status: "pending", raw: data };
}

function providerConfigured(network) {
  const n = String(network || "").toUpperCase();
  if (n === "MTN") return Boolean(process.env.MTN_COLLECTION_API_USER && process.env.MTN_COLLECTION_API_KEY && process.env.MTN_COLLECTION_SUBSCRIPTION_KEY);
  if (n === "AIRTEL") return Boolean(process.env.AIRTEL_CLIENT_ID && process.env.AIRTEL_CLIENT_SECRET && process.env.AIRTEL_PUBLIC_KEY);
  return false;
}

function status() {
  return {
    automationEnabled: automationEnabled(),
    mtn: { configured: providerConfigured("MTN"), targetEnvironment: process.env.MTN_MOMO_TARGET_ENV || "sandbox" },
    airtel: { configured: providerConfigured("AIRTEL"), targetEnvironment: process.env.AIRTEL_TARGET_ENV || "live" }
  };
}

async function collect(args) {
  if (!automationEnabled()) throw new Error("Payment automation is disabled");
  if (String(args.network).toUpperCase() === "MTN") return mtnCollect(args);
  if (String(args.network).toUpperCase() === "AIRTEL") return airtelCollect(args);
  throw new Error("Unsupported Mobile Money network");
}

async function disburse(args) {
  if (!automationEnabled()) throw new Error("Payment automation is disabled");
  if (String(args.network).toUpperCase() === "MTN") return mtnDisburse(args);
  if (String(args.network).toUpperCase() === "AIRTEL") return airtelDisburse(args);
  throw new Error("Unsupported Mobile Money network");
}

async function getStatus(network, type, providerReference) {
  if (String(network).toUpperCase() === "MTN") return mtnStatus(type, providerReference);
  if (String(network).toUpperCase() === "AIRTEL") return airtelStatus(type, providerReference);
  throw new Error("Unsupported Mobile Money network");
}

module.exports = { automationEnabled, providerConfigured, status, collect, disburse, getStatus, normalizePhone };
