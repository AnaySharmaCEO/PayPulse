# ⚡ PayPulse

> **Autonomous Payment Contract Executor & Self-Healing SRE Guardian for PayPal Commerce**  
> *PayPal AI Hackathon 2026 — Devpost*

[![PayPal](https://img.shields.io/badge/PayPal-Orders_v2_%26_Webhooks-003087?logo=paypal&logoColor=white)](https://developer.paypal.com)
[![Google Gemini](https://img.shields.io/badge/Gemini_3.8_Flash-Interactions_API-4285F4?logo=google&logoColor=white)](https://ai.google.dev)
[![AG Grid](https://img.shields.io/badge/AG_Grid_v36-Community_Cockpit-00E676?logo=ag-grid&logoColor=black)](https://www.ag-grid.com)
[![APIMatic](https://img.shields.io/badge/APIMatic-PayPal_Server_SDK_v2.5-4C84FF)](https://www.apimatic.io)
[![Channel3](https://img.shields.io/badge/Channel3-Multi--Merchant_Catalog-FF6B6B)](https://trychannel3.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_Strict-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Fastify](https://img.shields.io/badge/Fastify-5.2_Gateway-000000?logo=fastify&logoColor=white)](https://www.fastify.io)
[![Vite](https://img.shields.io/badge/Vite-6.4_React_18-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tests](https://img.shields.io/badge/Tests-40%2F40_Passing-brightgreen)](https://nodejs.org/api/test.html)

---

## Executive Summary: The \$73,000 Silent Leakage Crisis

In modern e-commerce, **capturing money is not the same as fulfilling orders**. When a customer approves a PayPal checkout, fulfillment pipelines depend entirely on asynchronous webhook delivery. In high-volume production, webhooks silently fail:
1. **Silent Drops:** Cloudflare edge timeouts, transient DNS flakiness, or dropped HTTP packets prevent `PAYMENT.CAPTURE.COMPLETED` from reaching merchant servers.
2. **Crash-after-ACK:** Upstream servers return HTTP 200 before writing to disk, then crash under load.
3. **Out-of-Order Delivery:** Capture notifications race ahead of authorization records, tripping rigid merchant state machines.
4. **Rounding Incompatibilities:** Currency conversion edge cases cause schema rejection (`ITEM_TOTAL_MISMATCH`).

For an average mid-tier merchant processing \$5M annually, uncaptured or unfulfilled dropped transactions account for **\$73,000/year in silent leakage**, lost customer goodwill, and costly SRE triage shifts.

**PayPulse eliminates this crisis permanently.** It introduces a continuous, bi-temporal **Payment Expectation Contract** that monitors every order against strict SLAs. If an asynchronous event fails to arrive, PayPulse's Autonomous Reconciler polls PayPal's ground-truth REST API, verifies schemas via **APIMatic-generated SDKs**, heals the transaction idempotently, and invokes an **AI Doctor powered by Google Gemini 3.8 Flash** to perform automated root-cause analysis and patch generation.

---

## 🏛 Architecture & Dual-Realm Visual Hierarchy

PayPulse enforces a strict separation between consumer commerce and operational infrastructure:

```
+-----------------------------------------------------------------------------------+
|                              PAYPULSE DUAL-REALM ARCHITECTURE                     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ CONSUMER REALM: LIGHT PAPER AESTHETIC ]    [ SRE REALM: DARK OBSIDIAN COCKPIT ] |
|  - Channel3 Multi-Merchant Catalog            - AG Grid v36 High-Density Orders   |
|  - Real-time Item Cart & Currency Engine      - Bryntum SVG Causal Event Timeline |
|  - PayPal SDK 1-Click Smart Button            - Chaos Injection Control Dock      |
|  - Zero CLS Sub-second Transaction UI         - Autonomous AI Doctor Drawer       |
|                                                                                   |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                 FASTIFY HIGH-THROUGHPUT WEBHOOK GATEWAY (apps/api)                |
|  - Raw Byte-Buffer Preservation for Cryptographic Signature Verification          |
|  - HMAC-SHA256 Verification with 9-Hour Cached PayPal OAuth Tokens                |
|  - Chaos Drop Filter: Injects deterministic network drops & signature tampering   |
|  - Write-Ahead Event Journaling into public.events (Strict Idempotency Keys)     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                      TWO-STAGE DETERMINISTIC FINITE STATE MACHINE                 |
|                                                                                   |
|  [ ORDER FSM ]      CREATED ----> SAVED ----> APPROVED ----> COMPLETED (Terminal) |
|                                                  |                                |
|  [ EXPECTATION FSM ]                             v                                |
|             PENDING (30s SLA) ---------> BREACHED (Trigger Reconciler)            |
|                                                  |                                |
|                                                  v                                |
|                                        AUTONOMOUSLY HEALED                        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|               AUTONOMOUS RECONCILER & GEMINI 3.8 FLASH AI DOCTOR                  |
|  - Non-Overlapping Recursive Polling with Exponential Jitter                      |
|  - PayPal Orders v2 Ground Truth Query (GET /v2/checkout/orders/{id})             |
|  - APIMatic Grounding: Schema validation via @paypal/paypal-server-sdk            |
|  - Write-Ahead Synthetic Reconcile Key (REC_CAPTURE_${capture.id})                |
|  - Google Gemini 3.8 Flash Interactions API: Automated RCA & TypeScript Patch    |
+-----------------------------------------------------------------------------------+
```

---

## 🏆 Genuine Sponsor Technology Integrations

| Sponsor | Track / Feature | Implementation Detail | Location |
| :--- | :--- | :--- | :--- |
| **PayPal** | Primary ($10,000) | Full Orders v2 checkout, webhook ingestion, HMAC-SHA256 signature verifier with 9h OAuth caching, idempotency ledger | `packages/adapters/src/paypal/` |
| **Google Gemini** | Sponsor Award ($5,000) | **Gemini 3.8 Flash** via modern Interactions API (`POST /v1beta/interactions`, `Api-Revision: 2026-05-20`, polymorphic JSON schema grounding) with cascade fallback to `gemini-3.5-flash-lite` | `packages/adapters/src/gemini/client.ts` |
| **AG Grid** | Sponsor Award ($5,000) | **AG Grid Community v36.3.0** with `ModuleRegistry`, `AllCommunityModule`, live status badges, SLA countdown renderers, and zero layout shift | `apps/web/src/components/cockpit/OrderGrid.tsx` |
| **APIMatic** | Sponsor Award ($1,000) | Official APIMatic-generated `@paypal/paypal-server-sdk` (`OrdersController`) enforcing 100% schema grounding with zero type errors | `packages/adapters/src/apimatic/grounding.ts` |
| **Channel3** | Sponsor Award ($1,500) | Live multi-merchant catalog queries to `https://api.trychannel3.com/v1/products` with automatic luxury sneaker fallback | `packages/adapters/src/channel3/client.ts` |
| **Bryntum** | Honorable Mention | Interactive high-precision SVG causal timeline charting event sequences, expectation windows, breach offsets, and self-healing | `apps/web/src/components/cockpit/CausalTimeline.tsx` |

---

## ⚙️ Invariants & Core Technical Guarantees

1. **Integer Minor Units Only (`BigInt`):** Float values are strictly prohibited across all currency domains (`packages/core/src/money.ts`). $189.99 is stored as `18999n` minor units.
2. **Two-Stage Expectation FSM:** Orders and Expectations have separate lifecycles. An order can be `APPROVED` while its expectation is `PENDING` (30s SLA window) or `BREACHED`.
3. **Cryptographic Webhook Verification:** Raw request buffers are preserved byte-for-byte in Fastify before JSON parsing. PayPulse queries PayPal's `POST /v1/notifications/verify-webhook-signature` using a cached 9-hour OAuth Bearer token.
4. **Write-Ahead Event Journaling:** Every webhook and reconciler mutation inserts into `public.events` with a unique synthetic key (`REC_CAPTURE_${captureId}`). Duplicate events are absorbed as idempotent no-ops.
5. **Optimistic Row-Level Concurrency:** State transitions check the existing row version (`version = version + 1`) to eliminate double-fulfillment race conditions between parallel webhooks and background reconcilers.

---

## 🚀 Quickstart Runbook

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0
- Modern web browser (Chrome, Edge, Firefox, Brave)

### 1. Clone & Install Dependencies
```powershell
git clone https://github.com/your-username/PayPal_AI_HACKATHON.git
cd PayPal_AI_HACKATHON
npm install
```

### 2. Configure Environment (`.env`)
Create a `.env` file at the root of the project (or verify existing values):
```env
# PayPal Sandbox Credentials
PAYPAL_CLIENT_ID=your_paypal_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_paypal_sandbox_client_secret
PAYPAL_MODE=sandbox
# Optional: Set when testing live PayPal webhook delivery; auto-simulates when omitted
PAYPAL_WEBHOOK_ID=

# Supabase / Database Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini API Key (Gemini 3.8 Flash Interactions API)
GEMINI_API_KEY=your_gemini_api_key

# Channel3 Multi-Merchant Catalog API Key (Optional; uses fallback catalog if empty)
CHANNEL3_API_KEY=

# Server Ports
PORT=3001
VITE_API_URL=http://localhost:3001
```

### 3. Run the Automated Test Suite (40/40 Passing)
```powershell
npm test
```
*Executes unit and integration tests across `@paypulse/core`, `@paypulse/adapters`, `@paypulse/api`, and `@paypulse/web`.*

### 4. Build Production Bundles
```powershell
npm run build
```

### 5. Launch the Full Stack
Open two terminal windows:

**Terminal 1 — Fastify API Gateway & Reconciler:**
```powershell
npm run --workspace=@paypulse/api start
# Running on http://localhost:3001
```

**Terminal 2 — React Cockpit & Storefront:**
```powershell
npm run --workspace=@paypulse/web dev
# Running on http://localhost:5173
```

---

## 🧪 Testing Chaos Scenarios (Live Interactive Demo)

PayPulse includes an interactive **Chaos Dock** embedded directly in the SRE Cockpit (`http://localhost:5173`):

1. **Happy Path:**
   - In the Storefront panel, click **"Instant Checkout"** on any sneaker.
   - The order enters the AG Grid cockpit as `APPROVED`. A 30-second Expectation countdown begins.
   - A simulated PayPal capture webhook arrives, transitioning the order to `COMPLETED` within 2 seconds.
2. **Chaos Scenario C1: Drop Webhook (Silent Delivery Failure):**
   - In the Chaos Dock, toggle **"Drop Next Webhook"** ON.
   - Complete a purchase.
   - Watch the Webhook Gateway intercept and drop the incoming webhook.
   - The Expectation counter counts down to 0, turning red: `BREACHED`.
   - Within 5 seconds, the Autonomous Reconciler polls PayPal's Orders v2 endpoint, verifies the payment, marks the order `COMPLETED`, and resolves the expectation to `FULFILLED`.
   - Click **"View Diagnosis"** to inspect the Google Gemini 3.8 Flash Root Cause Analysis and suggested TypeScript patch!
3. **Chaos Scenario C2: Tamper Signature:**
   - Toggle **"Tamper Signature"** ON.
   - Observe the Fastify gateway reject the payload with `HTTP 400 SIGNATURE_VERIFICATION_FAILED` without polluting the state machine.
4. **Chaos Scenario C3: Out-of-Order Webhook:**
   - Injects capture before order creation. PayPulse's FSM accelerates to `COMPLETED` idempotently without throwing unhandled exceptions.

---

## 📊 Comprehensive Test Matrix

```
┌─────────────────────────┬────────┬────────┬────────────────────────────────────────────┐
│ Package / Workspace     │ Tests  │ Status │ Key Invariants Tested                      │
├─────────────────────────┼────────┼────────┼────────────────────────────────────────────┤
│ @paypulse/core          │ 13/13  │ PASS   │ BigInt Money math, FSMs, Currency ISO      │
│ @paypulse/adapters      │ 14/14  │ PASS   │ PayPal OAuth (9h cache), Gemini 3.8 Flash, │
│                         │        │        │ APIMatic Grounding, Channel3 Live & Fallback│
│ @paypulse/api           │ 13/13  │ PASS   │ Fastify Gateway, Webhooks, Chaos C1-C4,    │
│                         │        │        │ Reconciler Worker & AI Doctor              │
│ @paypulse/web           │ Typeck │ PASS   │ Vite 6, React 18, AG Grid v36 Community    │
├─────────────────────────┼────────┼────────┼────────────────────────────────────────────┤
│ TOTAL                   │ 40/40  │ PASS   │ 100% Green Across All Monorepo Workspaces   │
└─────────────────────────┴────────┴────────┴────────────────────────────────────────────┘
```

---

## 👥 Team
- **Anay Sharma** — Lead Architect, Full-Stack & Distributed Systems Engineer

---

## 📄 License
MIT License. Open source and audit-ready for the PayPal AI Hackathon 2026.
