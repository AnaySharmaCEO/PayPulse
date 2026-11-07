import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../app.js';
import { PayPalWebhookVerifier, SupabaseClient, type DbOrder, type DbEvent, type DbExpectation, type DbIncident } from '@paypulse/adapters';

/**
 * In-memory Mock Supabase Client for deterministic edge-router testing
 */
class MockSupabaseClient extends SupabaseClient {
  public orders: DbOrder[] = [];
  public events: DbEvent[] = [];
  public expectations: DbExpectation[] = [];
  public incidents: DbIncident[] = [];

  constructor() {
    super({ baseUrl: 'http://mock-supabase', apiKey: 'mock-key' });
  }

  override async insertOrder(order: DbOrder): Promise<DbOrder[]> {
    const record: DbOrder = {
      ...order,
      id: `ord-${this.orders.length + 1}`,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.orders.push(record);
    return [record];
  }

  override async findOrderByPayPalId(paypalOrderId: string): Promise<DbOrder | null> {
    return this.orders.find(o => o.paypal_order_id === paypalOrderId) || null;
  }

  override async updateOrderStatus(orderId: string, status: DbOrder['status'], version?: number): Promise<DbOrder | null> {
    const order = this.orders.find(o => o.id === orderId);
    if (!order) return null;
    order.status = status;
    order.version = (order.version || 1) + 1;
    order.updated_at = new Date().toISOString();
    return order;
  }

  override async findEventByEventId(eventId: string): Promise<DbEvent | null> {
    return this.events.find(e => e.event_id === eventId) || null;
  }

  override async insertEvent(event: DbEvent): Promise<{ inserted: boolean; event: DbEvent }> {
    const existing = await this.findEventByEventId(event.event_id);
    if (existing) {
      return { inserted: false, event: existing };
    }
    const record: DbEvent = { ...event, id: `evt-${this.events.length + 1}`, created_at: new Date().toISOString() };
    this.events.push(record);
    return { inserted: true, event: record };
  }

  override async insertExpectation(exp: DbExpectation): Promise<DbExpectation[]> {
    const record: DbExpectation = { ...exp, id: `exp-${this.expectations.length + 1}`, created_at: new Date().toISOString() };
    this.expectations.push(record);
    return [record];
  }

  override async findExpectationsByOrderId(orderId: string): Promise<DbExpectation[]> {
    return this.expectations.filter(e => e.order_id === orderId && e.status === 'PENDING');
  }

  override async updateExpectation(id: string, status: DbExpectation['status']): Promise<DbExpectation | null> {
    const exp = this.expectations.find(e => e.id === id);
    if (!exp) return null;
    exp.status = status;
    exp.resolved_at = new Date().toISOString();
    return exp;
  }

  override async insertIncident(incident: DbIncident): Promise<DbIncident[]> {
    const record: DbIncident = { ...incident, id: `inc-${this.incidents.length + 1}`, detected_at: new Date().toISOString() };
    this.incidents.push(record);
    return [record];
  }

  override async getOrders(): Promise<DbOrder[]> { return this.orders; }
  override async getEvents(): Promise<DbEvent[]> { return this.events; }
  override async getExpectations(): Promise<DbExpectation[]> { return this.expectations; }
  override async getIncidents(): Promise<DbIncident[]> { return this.incidents; }
}

test('Webhook Ingestion - Rejects missing signature headers with HTTP 400', async () => {
  const mockSupabase = new MockSupabaseClient();
  const verifier = new PayPalWebhookVerifier({ webhookId: 'WH12345TEST', simulationMode: true });
  const app = await buildApp({ verifier, supabase: mockSupabase });

  const res = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers: { 'content-type': 'application/json' },
    payload: { id: 'WH-TEST-NO-SIG', event_type: 'PAYMENT.CAPTURE.COMPLETED' }
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.error, 'SIGNATURE_VERIFICATION_FAILED');
  assert.match(body.reason, /MISSING_SIGNATURE_HEADERS/);

  // Verifies an incident was logged
  assert.equal(mockSupabase.incidents.length, 1);
  assert.equal(mockSupabase.incidents[0].category, 'SIGNATURE_FAILURE');

  await app.close();
});

test('Webhook Ingestion - Rejects tampered signature with HTTP 400', async () => {
  const mockSupabase = new MockSupabaseClient();
  const verifier = new PayPalWebhookVerifier({ webhookId: 'WH12345TEST', simulationMode: true });
  const app = await buildApp({ verifier, supabase: mockSupabase });

  const res = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers: {
      'content-type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'trans-tamper-1',
      'paypal-transmission-sig': 'INVALID_TEST_SIGNATURE',
      'paypal-transmission-time': '2026-11-07T10:00:00Z'
    },
    payload: { id: 'WH-TEST-TAMPERED', event_type: 'PAYMENT.CAPTURE.COMPLETED' }
  });

  assert.equal(res.statusCode, 400);
  const body = JSON.parse(res.body);
  assert.equal(body.error, 'SIGNATURE_VERIFICATION_FAILED');

  await app.close();
});

test('Webhook Ingestion - Valid signature succeeds and journalizes event', async () => {
  const mockSupabase = new MockSupabaseClient();
  const verifier = new PayPalWebhookVerifier({ webhookId: 'WH12345TEST', simulationMode: true });
  const app = await buildApp({ verifier, supabase: mockSupabase });

  const res = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers: {
      'content-type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
      'paypal-transmission-id': 'trans-valid-1',
      'paypal-transmission-sig': 'VALID_SIG_MOCK',
      'paypal-transmission-time': '2026-11-07T10:00:00Z'
    },
    payload: {
      id: 'WH-EVT-VALID-001',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource_type: 'checkout-order',
      resource: { id: 'PP-ORDER-12345' }
    }
  });

  assert.equal(res.statusCode, 200);
  const body = JSON.parse(res.body);
  assert.equal(body.status, 'received');
  assert.equal(body.event_id, 'WH-EVT-VALID-001');

  // Verify journal insertion
  assert.equal(mockSupabase.events.length, 1);
  assert.equal(mockSupabase.events[0].event_id, 'WH-EVT-VALID-001');
  assert.equal(mockSupabase.events[0].signature_verified, true);

  await app.close();
});

test('Webhook Ingestion - Duplicate arrival is absorbed idempotently (no error)', async () => {
  const mockSupabase = new MockSupabaseClient();
  const verifier = new PayPalWebhookVerifier({ webhookId: 'WH12345TEST', simulationMode: true });
  const app = await buildApp({ verifier, supabase: mockSupabase });

  const headers = {
    'content-type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-dup-1',
    'paypal-transmission-sig': 'VALID_SIG_MOCK',
    'paypal-transmission-time': '2026-11-07T10:00:00Z'
  };

  const payload = {
    id: 'WH-EVT-DUP-001',
    event_type: 'CHECKOUT.ORDER.APPROVED',
    resource_type: 'checkout-order',
    resource: { id: 'PP-ORDER-DUP' }
  };

  // First arrival
  const res1 = await app.inject({ method: 'POST', url: '/api/webhooks/paypal', headers, payload });
  assert.equal(res1.statusCode, 200);
  assert.equal(JSON.parse(res1.body).status, 'received');
  assert.equal(mockSupabase.events.length, 1);

  // Duplicate arrival
  const res2 = await app.inject({ method: 'POST', url: '/api/webhooks/paypal', headers, payload });
  assert.equal(res2.statusCode, 200);
  const body2 = JSON.parse(res2.body);
  assert.equal(body2.status, 'duplicate_ignored');
  assert.equal(body2.event_id, 'WH-EVT-DUP-001');

  // Events count remains 1 (no duplicate row written)
  assert.equal(mockSupabase.events.length, 1);

  await app.close();
});

test('Two-Stage Expectation State Machine - Complete Order Lifecycle Progression', async () => {
  const mockSupabase = new MockSupabaseClient();
  const verifier = new PayPalWebhookVerifier({ webhookId: 'WH12345TEST', simulationMode: true });
  const app = await buildApp({ verifier, supabase: mockSupabase });

  const paypalOrderId = 'PP-ORDER-FLOW-999';

  // Step 1: Order created on storefront
  const createRes = await app.inject({
    method: 'POST',
    url: '/api/orders',
    payload: {
      paypal_order_id: paypalOrderId,
      intent: 'CAPTURE',
      currency: 'USD',
      total_amount_minor: 18999,
      customer_email: 'buyer@example.com'
    }
  });

  assert.equal(createRes.statusCode, 201);
  const orderData = JSON.parse(createRes.body).order;
  assert.equal(orderData.status, 'CREATED');

  // Stage 1 Expectation registered
  assert.equal(mockSupabase.expectations.length, 1);
  const stage1Exp = mockSupabase.expectations[0];
  assert.equal(stage1Exp.expected_event_type, 'CHECKOUT.ORDER.APPROVED');
  assert.equal(stage1Exp.status, 'PENDING');

  const headers = {
    'content-type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-flow-1',
    'paypal-transmission-sig': 'VALID_SIG_MOCK',
    'paypal-transmission-time': '2026-11-07T10:05:00Z'
  };

  // Step 2: Buyer approves payment in modal -> Ingest CHECKOUT.ORDER.APPROVED
  const approveRes = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers,
    payload: {
      id: 'WH-EVT-APPROVED-001',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource_type: 'checkout-order',
      resource: { id: paypalOrderId }
    }
  });

  assert.equal(approveRes.statusCode, 200);

  // Verify: Order is now APPROVED
  const orderAfterApproval = await mockSupabase.findOrderByPayPalId(paypalOrderId);
  assert.equal(orderAfterApproval?.status, 'APPROVED');

  // Verify: Stage 1 expectation is FULFILLED, Stage 2 expectation is PENDING (90s SLA)
  assert.equal(stage1Exp.status, 'FULFILLED');
  assert.equal(mockSupabase.expectations.length, 2);
  const stage2Exp = mockSupabase.expectations[1];
  assert.equal(stage2Exp.expected_event_type, 'PAYMENT.CAPTURE.COMPLETED');
  assert.equal(stage2Exp.status, 'PENDING');

  // Step 3: Payment captured -> Ingest PAYMENT.CAPTURE.COMPLETED
  const captureRes = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers,
    payload: {
      id: 'WH-EVT-CAPTURE-001',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource_type: 'capture',
      resource: {
        id: 'CAP-998877',
        supplementary_data: {
          related_ids: { order_id: paypalOrderId }
        }
      }
    }
  });

  assert.equal(captureRes.statusCode, 200);

  // Verify: Order is now COMPLETED
  const finalOrder = await mockSupabase.findOrderByPayPalId(paypalOrderId);
  assert.equal(finalOrder?.status, 'COMPLETED');

  // Verify: Stage 2 expectation is FULFILLED
  assert.equal(stage2Exp.status, 'FULFILLED');

  await app.close();
});
