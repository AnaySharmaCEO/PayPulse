import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SupabaseClient,
  PayPalOrdersClient,
  type DbExpectation,
  type DbOrder,
  type DbEvent,
  type DbIncident
} from '@paypulse/adapters';
import { ReconcilerWorker } from '../reconciler/worker.js';
import { buildApp } from '../app.js';

describe('Autonomous Reconciler Worker & AI Doctor', () => {
  it('should detect breached expectation, query ground truth, heal order, and generate AI Doctor diagnosis', async () => {
    const expiredTimestamp = new Date(Date.now() - 30 * 1000).toISOString();

    const mockExpectation: DbExpectation = {
      id: 'exp-uuid-1',
      order_id: 'ord-uuid-1',
      paypal_order_id: 'PAYPAL-ORD-9918',
      expected_event_type: 'PAYMENT.CAPTURE.COMPLETED',
      expected_before: expiredTimestamp,
      status: 'PENDING'
    };

    const mockOrder: DbOrder = {
      id: 'ord-uuid-1',
      paypal_order_id: 'PAYPAL-ORD-9918',
      intent: 'CAPTURE',
      status: 'APPROVED',
      currency: 'USD',
      total_amount_minor: 18999,
      version: 1
    };

    const expectationsStore: DbExpectation[] = [{ ...mockExpectation }];
    const ordersStore: DbOrder[] = [{ ...mockOrder }];
    const eventsStore: DbEvent[] = [];
    const incidentsStore: DbIncident[] = [];

    const mockSupabase = {
      findBreachedExpectations: async () => {
        return expectationsStore.filter(
          e => e.status === 'PENDING' && new Date(e.expected_before) <= new Date()
        );
      },
      updateExpectation: async (id: string, status: DbExpectation['status']) => {
        const exp = expectationsStore.find(e => e.id === id);
        if (exp) exp.status = status;
        return exp || null;
      },
      findOrderById: async (id: string) => {
        return ordersStore.find(o => o.id === id) || null;
      },
      findOrderByPayPalId: async (id: string) => {
        return ordersStore.find(o => o.paypal_order_id === id) || null;
      },
      updateOrderStatus: async (id: string, status: DbOrder['status']) => {
        const ord = ordersStore.find(o => o.id === id);
        if (ord) ord.status = status;
        return ord || null;
      },
      insertEvent: async (event: DbEvent) => {
        eventsStore.push(event);
        return { inserted: true, event };
      },
      insertIncident: async (incident: DbIncident) => {
        const saved = { ...incident, id: `inc-${incidentsStore.length + 1}` };
        incidentsStore.push(saved);
        return [saved];
      },
      updateIncident: async (id: string, updates: Partial<DbIncident>) => {
        const inc = incidentsStore.find(i => i.id === id);
        if (inc) Object.assign(inc, updates);
        return inc || null;
      }
    } as unknown as SupabaseClient;

    const mockOrdersClient = {
      getOrder: async (id: string) => {
        return {
          id,
          status: 'COMPLETED',
          intent: 'CAPTURE',
          purchase_units: [
            {
              payments: {
                captures: [
                  {
                    id: 'CAP-AUTONOMOUS-777',
                    status: 'COMPLETED',
                    amount: { currency_code: 'USD', value: '189.99' }
                  }
                ]
              }
            }
          ]
        };
      }
    } as unknown as PayPalOrdersClient;

    const worker = new ReconcilerWorker({
      supabase: mockSupabase,
      ordersClient: mockOrdersClient,
      intervalMs: 1000,
      enableJitter: false
    });

    const report = await worker.tick();

    assert.strictEqual(report.scannedExpectations, 1);
    assert.strictEqual(report.breachedCount, 1);
    assert.strictEqual(report.healedCount, 1);
    assert.strictEqual(report.errors.length, 0);

    // 1. Verify Expectation FULFILLED
    assert.strictEqual(expectationsStore[0].status, 'FULFILLED');

    // 2. Verify Order HEALED / COMPLETED
    assert.strictEqual(ordersStore[0].status, 'COMPLETED');

    // 3. Verify Deterministic Synthetic Event in Journal
    assert.strictEqual(eventsStore.length, 1);
    assert.strictEqual(eventsStore[0].event_id, 'REC_CAPTURE_CAP-AUTONOMOUS-777');
    assert.strictEqual(eventsStore[0].source, 'RECONCILER');
    assert.strictEqual(eventsStore[0].signature_verified, true);

    // 4. Verify AI Doctor Incident Logged & Healed
    assert.strictEqual(incidentsStore.length, 1);
    assert.strictEqual(incidentsStore[0].category, 'OVERDUE_CAPTURE');
    assert.strictEqual(incidentsStore[0].status, 'HEALED');
    assert.strictEqual(incidentsStore[0].confidence_score, 0.97);
    assert.ok(incidentsStore[0].code_patch?.includes('@paypal/paypal-server-sdk'));
  });

  it('should expose /api/reconciler/tick endpoint on Fastify instance', async () => {
    const app = await buildApp({ logger: false });
    const response = await app.inject({
      method: 'POST',
      url: '/api/reconciler/tick',
      payload: {}
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok('scannedExpectations' in body);
    assert.ok('healedCount' in body);
    await app.close();
  });
});
