# CashArrow MTN Mobile Money Sandbox

CashArrow uses MTN Collections RequestToPay for the sandbox deposit flow.

## Render environment variables

Set these only when you are ready to test against the MTN sandbox:

- `MTN_AUTOMATIC_DEPOSITS_ENABLED=true`
- `MTN_ENVIRONMENT=sandbox` (optional; sandbox is the default)
- `MTN_BASE_URL=https://sandbox.momodeveloper.mtn.com` (optional; this exact sandbox host is enforced)
- `MTN_COLLECTION_SUBSCRIPTION_KEY=<your sandbox subscription key>`
- `MTN_API_USER=<your sandbox API user>`
- `MTN_API_KEY=<your sandbox API key>`
- `MTN_CURRENCY=EUR` (default for the sandbox integration; use the currency required by the MTN sandbox account)
- `MTN_CALLBACK_URL=https://<your-casharrow-host>/api/mobile-money/mtn/callback` (optional; polling is still used as the source of truth)

## Safety rules

- Automatic deposits stay disabled unless `MTN_AUTOMATIC_DEPOSITS_ENABLED=true`.
- The integration refuses to run against a production MTN host.
- The wallet is credited only after MTN reports `SUCCESSFUL`.
- CashArrow verifies the provider reference, amount, currency when supplied, and payer MSISDN before crediting.
- The wallet credit and deposit status change happen in one database transaction and only while the deposit is still `pending`.
- Failed, rejected, cancelled, and timed-out payments do not credit the wallet.
- Pending deposits are polled for up to three minutes and are resumed after a server restart when sandbox credentials are enabled.
- MTN callbacks are treated as a fast path only; status polling remains the source of truth because MTN documents that callbacks are sent once without retry.

## Before production

Do not switch this sandbox module to real-money production traffic. Production onboarding, credentials, callback configuration, reconciliation, settlement handling, monitoring, and operational controls must be implemented and verified separately.
