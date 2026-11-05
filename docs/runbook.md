# Operational Runbook & Local Setup

This document provides instructions for local environment configuration, executing integration spikes, running test suites, and managing database migrations.

---

## Prerequisites

- Node.js >= 22.0.0
- npm >= 10.0.0
- Supabase account with an active project
- PayPal Developer account with Sandbox access
- Google Gemini API key

---

## Environment Setup

1. Copy the example configuration template:
   ```bash
   cp .env.example .env
   ```

2. Populate `.env` with required API credentials:
   - `PAYPAL_CLIENT_ID`: PayPal Sandbox App Client ID
   - `PAYPAL_CLIENT_SECRET`: PayPal Sandbox App Secret
   - `PAYPAL_ENVIRONMENT`: `sandbox`
   - `PAYPAL_WEBHOOK_ID`: Generated via Edge Function registration or dashboard
   - `SUPABASE_URL`: Project URL (e.g., `https://<project-ref>.supabase.co`)
   - `SUPABASE_ANON_KEY`: Supabase anon/public API key
   - `GEMINI_API_KEY`: Google Gemini API key

---

## Verifying External Connections (Feasibility Spikes)

To verify that third-party credentials and network endpoints are functioning correctly, run the isolated spike scripts:

```bash
# Verify PayPal OAuth, Order v2 creation, and polling
node --env-file=.env spikes/s1-paypal-orders/index.mjs

# Verify PayPal Webhook signature verification endpoint
node --env-file=.env spikes/s2-paypal-webhooks/index.mjs

# Verify Supabase Cloud connection and PostgREST availability
node --env-file=.env spikes/s3-supabase/index.mjs

# Verify Google Gemini Interactions API with structured JSON output
node --env-file=.env spikes/s7-gemini/index.mjs
```

---

## Running Automated Tests

Run unit test suites across core domain packages:

```bash
# Build TypeScript packages
npm run build

# Run unit tests
npm run test

# Typecheck all packages
npm run typecheck
```

---

## Database Schema & Migrations

Database tables, row-level security policies, and explicit permissions are located in `backend/supabase/migrations/`.

To apply migrations manually via the Supabase SQL Editor:
1. Open your Supabase Dashboard.
2. Navigate to **SQL Editor**.
3. Paste the contents of `backend/supabase/migrations/20261105000001_init_schema.sql`.
4. Click **Run**.
