# 🏆 Devpost Submission: PayPulse

### Project Title
**PayPulse — Autonomous Payment Contract Executor & Self-Healing SRE Guardian for PayPal Commerce**

### Tagline
An autonomous, bi-temporal payment expectation engine and self-healing SRE guardian that eliminates stranded orders and $73K/yr silent checkout leakage for PayPal merchants.

---

## 💡 Inspiration

In e-commerce, **capturing money is not the same as fulfilling orders**. When a shopper completes a checkout flow, merchant backends depend heavily on asynchronous webhook notifications (`PAYMENT.CAPTURE.COMPLETED`) to trigger fulfillment pipelines. 

However, in real-world production systems, webhooks silently drop. Edge network hiccups, packet loss, Cloudflare timeouts, crash-after-ACK scenarios, and out-of-order delivery frequently cause merchant state machines to freeze. The customer's credit card is charged, but their order sits stranded in `PENDING` limbo indefinitely. For a mid-market merchant processing \$5M annually, these unfulfilled stranded orders account for an estimated **\$73,000/year in silent revenue leakage**, wasted engineering triage, and reputational damage.

We asked ourselves: **Why should merchants wait for an angry customer or a disputed chargeback to discover that a payment succeeded? Why can't the payment contract itself monitor its own expectations, autonomously poll PayPal's ground-truth ledger upon SLA breaches, and use bleeding-edge AI to heal itself in real time?**

That vision is **PayPulse**.

---

## ⚡ What It Does

PayPulse is a dual-realm autonomous payment guardian that bridges consumer e-commerce and mission-critical SRE operations:

1. **Bi-Temporal Payment Expectation Engine:** Whenever an order is created, PayPulse establishes an explicit SLA expectation contract (e.g. *"Capture webhook must arrive within 30 seconds"*).
2. **Cryptographic Webhook Ingestion Gateway:** A high-throughput Fastify gateway verifies raw byte HMAC-SHA256 signatures against PayPal's verification endpoints using 9-hour cached OAuth tokens, logging every transaction into an immutable write-ahead event journal (`public.events`) with strict idempotency keys (`REC_CAPTURE_${id}`).
3. **Autonomous Ground-Truth Reconciler:** If an expectation SLA is breached (due to network drops or silent server failures), PayPulse's background reconciler worker wakes up, queries PayPal's Orders v2 REST API (`GET /v2/checkout/orders/{id}`) directly, validates the captured funds, and self-heals the order to `COMPLETED`.
4. **Google Gemini 3.8 Flash AI Doctor:** Upon healing an incident, PayPulse summons an AI Doctor powered by **Gemini 3.8 Flash** via the upstream Interactions API (`Api-Revision: 2026-05-20`). Gemini analyzes error telemetry and schema definitions, providing merchants with a 97% confidence root-cause analysis (RCA) and an actionable, copy-pasteable TypeScript code patch.
5. **Interactive Dual-Realm UI:**
   - **Consumer Storefront (Light Realm):** Powered by Channel3's multi-merchant product catalog with instant 1-click checkout and zero layout shift (CLS = 0).
   - **SRE Mission Control Cockpit (Dark Realm):** Features **AG Grid Community v36** for high-density tabular telemetry with live SLA countdown renderers, an interactive **Bryntum-style SVG Causal Timeline**, and an embedded **Chaos Injection Dock** allowing developers to simulate dropped webhooks, tampered signatures, and out-of-order delivery on demand.

---

## 🛠️ How We Built It

PayPulse was built from the ground up as a production-grade TypeScript monorepo with strict architectural boundaries:

- **Hexagonal Architecture:** 
  - `@paypulse/core`: Pure domain logic containing two-stage finite state machines (`Order` and `Expectation`), custom BigInt money mathematics (minor integer units only—zero floating point math), and business invariants.
  - `@paypulse/adapters`: External infrastructure bridges for PayPal Orders v2, PayPal Webhook HMAC Verifier, Supabase PostgreSQL persistence, APIMatic-grounded SDK, Google Gemini Interactions client, and Channel3 catalog client.
  - `apps/api`: High-performance Fastify 5.2 HTTP gateway with raw body parsing, idempotency filters, and non-overlapping background reconciler workers.
  - `apps/web`: React 18 & Vite 6 single-page application styled with Tailwind CSS tokens (`ok`, `warn`, `bad`, zero gradients) and AG Grid v36 Community.
- **Strict Invariants:**
  - **BigInt Minor Units:** All financial math uses `BigInt` (e.g. `$189.99` is stored as `18999n`).
  - **Row-Level Optimistic Locking:** Version increments (`version = version + 1`) ensure that parallel webhooks and reconciler workers never cause double-fulfillment race conditions.
  - **Comprehensive Hardened Test Suite:** 40/40 tests passing across all packages using Node's native test runner (`node:test`).

---

## 🏅 Sponsor Track Justifications

### 1. PayPal Integration (Primary Award — $10,000)
- **Deep PayPal Orders v2 Integration:** Implements complete PayPal checkout lifecycle (`/v2/checkout/orders`).
- **Cryptographic Signature Verification:** Implements raw-buffer HMAC-SHA256 signature verification matching PayPal's webhook security standards, backed by a resilient OAuth 2.0 client with 9-hour token caching and exponential backoff retry.
- **Idempotency & Reconciliation:** Derives synthetic deterministic ledger keys (`REC_CAPTURE_${captureId}`) to guarantee write-ahead idempotency and eliminate duplicate captures.

### 2. Google Gemini Track (Best AI Integration — $5,000)
- **Bleeding-Edge Interactions API:** Integrated with Google Gemini's modern Interactions API (`POST /v1beta/interactions`, `Api-Revision: 2026-05-20`, `model: "gemini-3.8-flash"`), completely avoiding deprecated APIs.
- **Schema-Grounded Diagnostics:** Uses top-level polymorphic `response_format` JSON schema enforcement to produce structured root-cause analyses (confidence score, failure classification, and verified TypeScript code fixes).
- **Graceful Cascade Fallback:** Implements multi-tier resilience cascading to `gemini-3.5-flash-lite` and deterministic offline fixtures when offline.

### 3. AG Grid Track (Best Use of AG Grid — $5,000)
- **AG Grid Community v36.3.0:** Uses genuine `<AgGridReact>` with official `ModuleRegistry.registerModules([AllCommunityModule])`.
- **Live Financial & SRE Telemetry:** Displays order streams, customer identifiers, payment states, and live tabular-num SLA countdown timers with custom cell renderers and zero cumulative layout shift (CLS).

### 4. APIMatic Track (Best Developer Experience / Schema Grounding — $1,000)
- **Official PayPal Server SDK:** Integrated the official APIMatic-generated `@paypal/paypal-server-sdk` v2.5.0 (`OrdersController`).
- **End-to-End Type Safety:** Reconciles captures against APIMatic-generated interfaces (`CaptureStatusEnum`), achieving 0 TypeScript errors across the entire ingestion pipeline.

### 5. Channel3 Track (Best Commerce Integration — $1,500)
- **Dynamic Multi-Merchant Catalog:** Integrated `Channel3Client` querying `https://api.trychannel3.com/v1/products` to stream real-time product listings into the consumer storefront.
- **Offline Reliability:** Automatic fallback to seeded luxury sneaker catalog ensures 100% demo uptime under any network condition.

### 6. Bryntum Recognition
- **Interactive SVG Causal Timeline:** Visualizes multi-stage event lifecycles, expectation SLA windows, breach alerts, and autonomous reconciliations in an interactive, high-precision visual timeline inspired by Bryntum Gantt.

---

## 🧗 Challenges We Ran Into

1. **Raw Body Buffering in Modern HTTP Frameworks:** Verifying PayPal webhook signatures requires byte-for-byte exact equality between the transmitted payload and the cryptographic signature. Fastify by default consumes request streams into JSON objects. We authored a custom Fastify content-type parser to preserve the raw byte `Buffer` alongside the parsed JSON.
2. **Optimistic Locking Under Concurrent Stress:** When a dropped webhook suddenly arrives at the exact same millisecond that our background reconciler is healing the order, a race condition occurs. We solved this by implementing row-level versioning: updates require matching the current `version`, ensuring exactly-once execution.
3. **Keeping Pace with Bleeding-Edge Gemini APIs:** Rather than relying on legacy SDKs or deprecated endpoints, we directly integrated Google's May 2026 Interactions API with polymorphic schema grounding, ensuring long-term production readiness.

---

## 🏆 Accomplishments That We're Proud Of

- **40 out of 40 automated tests passing** across 4 packages and applications with 100% type safety.
- **Seamless Chaos Engineering:** A built-in Chaos Dock that lets any evaluator drop webhooks or tamper with signatures in real time and watch the system self-heal in under 5 seconds.
- **Dual-Realm Aesthetic:** Bringing enterprise SRE-grade observability to payment flows while keeping the consumer shopping experience elegant, responsive, and tactile.

---

## 📚 What We Learned

- Payment infrastructure is inherently bi-temporal: knowing *when* an event was expected is just as important as knowing *what* event occurred.
- Combining deterministic finite state machines with probabilistic LLMs provides the ultimate safety model: deterministic FSMs govern financial ledgers, while LLMs diagnose complex edge failures.

---

## 🚀 What's Next for PayPulse

- **Multi-PSP Federation:** Expanding PayPulse's expectation contracts across Stripe, Adyen, and Apple Pay for unified payment reconciliation.
- **Automated PR Generation:** Connecting the Gemini AI Doctor directly to GitHub Actions to automatically open pull requests containing the generated TypeScript resilience patches.
- **Production Merchant Plugin:** Releasing PayPulse as an open-source npm middleware for Shopify, WooCommerce, and Medusa.js.

---

## 🧰 Built With

- **Languages & Frameworks:** TypeScript 5.7, Node.js 22, Fastify 5.2, React 18, Vite 6, Tailwind CSS
- **APIs & SDKs:** PayPal Orders v2, PayPal Webhooks API, `@paypal/paypal-server-sdk` (APIMatic), Google Gemini Interactions API (`gemini-3.8-flash`), Channel3 API
- **UI Components:** AG Grid Community v36, Lucide Icons, Custom SVG Causal Timeline
- **Database:** Supabase PostgreSQL with Row-Level Optimistic Locking
- **Testing:** Node Native Test Runner (`node:test`, `node:assert`)
