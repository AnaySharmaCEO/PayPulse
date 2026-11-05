# PayPulse

PayPulse is an autonomous payment guardian and self-healing layer for PayPal integrations. It eliminates stranded orders, detects payment delivery failures outside PayPal's native retry scope, and reconciles transaction states in real time without manual merchant intervention.

---

## The Problem

When a customer completes a checkout flow, the merchant application depends on asynchronous event notifications (webhooks) to trigger fulfillment. In production environments, several failure modes occur that native retry mechanisms cannot resolve:

1. **Crash-after-ACK:** The merchant endpoint acknowledges HTTP 200 before persisting the transaction, but crashes during execution.
2. **Out-of-Order Delivery:** A capture event arrives before authorization records finish writing, resulting in state machine errors.
3. **Dropped Delivery:** Network transit errors leave the order stranded in pending status indefinitely while customer funds are already captured.
4. **Item Total Mismatch:** Schema rounding discrepancies block order creation entirely (`ITEM_TOTAL_MISMATCH`).

PayPulse acts as an automated safety layer that monitors event expectations, enforces idempotency, and autonomously heals orders using direct PayPal Orders v2 polling and schema-grounded diagnostics.

---

## Architecture Overview

```
[PayPal Sandbox / Live]
         |
         | (Webhooks)
         v
[PayPulse Ingestion] ---> [Idempotent Journal]
         |
         v
[Expectation State Machine] <--- [Periodic Reconciler (pg_cron)]
         |
         v (On SLA Breach)
[AI Diagnostician (Gemini + APIMatic)] ---> [Autonomous Healing Action]
```

- **Hexagonal Architecture:** Pure domain logic lives in `@paypulse/core` with zero I/O dependencies. Adapters handle external network boundaries.
- **Strict Money Math:** Integer minor units (`BIGINT`) with ISO currency codes across all calculations. Floating-point numbers are prohibited.
- **Idempotent Ingestion:** Every webhook event is keyed by its PayPal `event_id` UUID.
- **Deterministic First, AI Second:** Deterministic rules govern financial state transitions. AI diagnostics provide root-cause analysis and code fixes.

---

## Repository Structure

```
.
├── apps/
│   └── web/                   # Operational dashboard & demo storefront
├── backend/
│   └── supabase/              # Database migrations and configuration
├── packages/
│   ├── core/                  # Domain core (money, state machine, types)
│   └── adapters/              # External API adapters (PayPal, Supabase, Gemini)
├── docs/                      # Technical documentation
│   ├── architecture.md        # System architecture and data flow
│   ├── api.md                 # API contracts and webhook schemas
│   └── runbook.md             # Setup, testing, and operation guide
├── spikes/                    # Feasibility spike scripts (isolated experiments)
└── .github/workflows/         # Automation workflows (e.g., Supabase keepalive)
```

---

## Quickstart

### Prerequisites
- Node.js >= 22.0.0
- npm >= 10.0.0

### Setup
```bash
# Clone the repository
git clone https://github.com/AnaySharmaCEO/PayPulse.git
cd PayPulse

# Install workspace dependencies
npm install

# Build core packages
npm run build

# Run unit test suite
npm run test
```

For complete local configuration and spike execution instructions, refer to [docs/runbook.md](docs/runbook.md).

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
