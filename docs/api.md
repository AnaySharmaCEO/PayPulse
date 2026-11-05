# API Contracts & Webhook Reference

This document outlines the external and internal API contracts for PayPulse, including inbound PayPal webhook specifications, order creation endpoints, and incident query interfaces.

---

## 1. Webhook Ingestion Endpoint

### `POST /api/webhooks/paypal`

Receives asynchronous event notifications sent by PayPal.

#### Headers Required
- `PAYPAL-AUTH-ALGO`: Algorithm used to generate the signature (e.g., `SHA256withRSA`).
- `PAYPAL-CERT-URL`: URL for the public certificate used to verify the signature.
- `PAYPAL-TRANSMISSION-ID`: Unique UUID assigned to the notification.
- `PAYPAL-TRANSMISSION-SIG`: Base64-encoded cryptographic signature.
- `PAYPAL-TRANSMISSION-TIME`: UTC timestamp when the notification was generated.

#### Response Codes
- `200 OK`: Event processed or duplicate event detected and safely ignored.
- `400 Bad Request`: Missing mandatory headers or malformed JSON payload.
- `401 Unauthorized`: Cryptographic signature verification rejected by PayPal verification service.
- `500 Internal Server Error`: Unhandled database write failure.

---

## 2. Order Creation & Expectation Registration

### `POST /api/orders`

Creates a new local order record and registers a corresponding webhook expectation.

#### Request Body
```json
{
  "paypal_order_id": "2H5794056T052090L",
  "intent": "AUTHORIZE",
  "currency": "USD",
  "total_amount_minor": 4999,
  "customer_email": "buyer@example.com",
  "expected_sla_seconds": 90
}
```

#### Response Body
```json
{
  "id": "e6a0d2f0-f99a-4c2c-8a1a-4a6f79e2c4b1",
  "paypal_order_id": "2H5794056T052090L",
  "status": "CREATED",
  "expectation_id": "8f8db541-b847-4f81-80f2-53b67c29bc15",
  "expected_before": "2026-11-05T09:00:00Z"
}
```

---

## 3. Incident Diagnostics & Reconciliation Query

### `GET /api/incidents`

Lists active and resolved payment incidents.

#### Query Parameters
- `status`: Filter by incident status (`DETECTED`, `DIAGNOSING`, `HEALED`, `MANUAL_INTERVENTION_REQUIRED`).
- `category`: Filter by failure category (`ITEM_TOTAL_MISMATCH`, `SIGNATURE_FAILURE`, `OVERDUE_CAPTURE`, etc.).

#### Response Body
```json
[
  {
    "id": "3b29c5a2-9f37-4d40-b6bb-2a628a8d052d",
    "paypal_order_id": "2H5794056T052090L",
    "category": "OVERDUE_CAPTURE",
    "severity": "HIGH",
    "status": "HEALED",
    "root_cause": "Webhook notification dropped in transit. Order reconciled via direct Orders v2 polling.",
    "remediation_action": "RECONCILE_FROM_ORDERS_API",
    "automated": true,
    "confidence_score": 0.99,
    "detected_at": "2026-11-05T08:45:00Z",
    "resolved_at": "2026-11-05T08:45:47Z"
  }
]
```
