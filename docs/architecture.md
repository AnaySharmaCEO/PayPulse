# System Architecture

PayPulse is an autonomous payment guardian and self-healing layer designed for PayPal merchant integrations. It detects payment delivery gaps, enforces transaction idempotency, and reconciles stranded authorizations and captures without requiring manual merchant intervention.

---

## High-Level Topology

```
+-------------------------------------------------------------------------+
|                                PAYPULSE                                  |
|                                                                         |
|  +--------------------+    +--------------------+    +---------------+  |
|  | Ingestion Pipeline | -> | Expectation Engine | -> | AI Diagnostician |
|  | - Raw HMAC Check   |    | - Dynamic SLAs     |    | - Schema Fixes|  |
|  | - Idempotent Inbox |    | - State Machine    |    | - Grounding   |  |
|  +--------------------+    +--------------------+    +---------------+  |
|            |                         |                       |          |
|            v                         v                       v          |
|  +-------------------------------------------------------------------+  |
|  |                     PostgreSQL Ledger & Journal                   |  |
|  |            (Orders, Events, Expectations, Incidents)              |  |
|  +-------------------------------------------------------------------+  |
|                                      ^                                  |
|                                      | Scheduled Query (Every 60s)      |
|                        +---------------------------+                    |
|                        | Reconciler (Orders API)   |                    |
|                        +---------------------------+                    |
+-------------------------------------------------------------------------+
```

---

## Core Subsystems

### 1. Ingestion Pipeline
- Receives inbound HTTP POST notifications from PayPal Sandbox or Live environments.
- Captures raw request buffer prior to JSON deserialization to preserve byte sequence for cryptographic verification.
- Queries PayPal signature verification endpoint (`POST /v1/notifications/verify-webhook-signature`) using certificate and transmission headers.
- Writes to an idempotent event journal keyed by PayPal `event_id` UUID. Duplicate events return HTTP 200 immediately without executing business logic twice.

### 2. Expectation State Machine
When an order is created or authorized via the PayPal Orders v2 API, PayPulse registers an expectation row specifying:
- `order_id`: UUID reference to local order record.
- `paypal_order_id`: PayPal checkout order reference.
- `expected_event_type`: Expected terminal webhook event (`PAYMENT.CAPTURE.COMPLETED`).
- `expected_before`: Absolute UTC timestamp representing the delivery SLA (default: 90 seconds).
- `status`: Lifecycle state (`PENDING`, `FULFILLED`, `BREACHED`, `CANCELLED`).

If a matching event arrives before the deadline, status transitions to `FULFILLED`. If the deadline passes without the event, status transitions to `BREACHED`, raising an incident for the reconciler.

### 3. Background Reconciler
- Operates on a 60-second periodic interval via database cron scheduling (`pg_cron`).
- Selects all `BREACHED` expectations.
- Queries PayPal Orders v2 API directly (`GET /v2/checkout/orders/{id}`) using authenticated server credentials.
- Detects whether the transaction completed at PayPal.
- If completed: synthesizes the missing event into the ledger, marks the order completed, and resolves the incident.
- If voided or expired: transitions the order to terminal failed state and records root cause.

### 4. Monetary Representation
All currency calculations across database columns and domain models use integer minor units (`amount_minor` as `BIGINT`) paired with three-letter ISO currency codes (`currency` as `VARCHAR(3)`). Floating point numbers (`FLOAT`, `DOUBLE`, JavaScript `Number` decimals) are strictly prohibited across all financial calculation paths to eliminate IEEE-754 precision errors.
