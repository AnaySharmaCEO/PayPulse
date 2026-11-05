/**
 * PayPulse Ingestion API & Edge Router
 * Fastify HTTP Server for Webhook Ingestion, Chaos Proxy, and Operational Cockpit.
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { SupabaseClient } from './supabase-client.js';

const fastify = Fastify({
  logger: true
});

// Register CORS for frontend cockpit access
await fastify.register(cors, {
  origin: true
});

const supabase = new SupabaseClient();

// Add rawBody decorator on requests for exact cryptographic signature verification
fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
  try {
    (req as any).rawBody = body;
    const json = JSON.parse(body.toString('utf-8'));
    done(null, json);
  } catch (err: any) {
    done(err, undefined);
  }
});

// 1. Health check endpoint
fastify.get('/health', async () => {
  return {
    status: 'ok',
    service: 'paypulse-api',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  };
});

// 2. PayPal Webhook Receiver
fastify.post('/api/webhooks/paypal', async (request, reply) => {
  const headers = request.headers;
  const rawBody = (request as any).rawBody as Buffer;
  const payload = request.body as Record<string, any>;

  fastify.log.info({ eventType: payload?.event_type, eventId: payload?.id }, 'Received PayPal webhook');

  // Check Chaos Lab header trigger
  const chaosHeader = headers['x-paypulse-chaos'];
  if (chaosHeader === 'drop') {
    fastify.log.warn({ eventId: payload?.id }, 'CHAOS LAB: Webhook dropped by request header filter');
    try {
      // Record the dropped event to events table as CHAOS_DROPPED
      await supabase.insertEvent({
        event_id: payload?.id || `chaos-${Date.now()}`,
        event_type: payload?.event_type || 'UNKNOWN',
        resource_type: payload?.resource_type || 'UNKNOWN',
        resource_id: payload?.resource?.id,
        signature_verified: false,
        payload: payload || {},
        status: 'CHAOS_DROPPED',
        source: 'CHAOS_LAB',
        processed_at: new Date().toISOString()
      });
    } catch (e: any) {
      fastify.log.error({ err: e.message }, 'Failed to record dropped chaos event');
    }

    return reply.status(200).send({
      status: 'dropped_by_chaos',
      note: 'Simulated network drop. Event logged as CHAOS_DROPPED.'
    });
  }

  // Normal Ingestion Path
  try {
    const eventId = payload?.id || `evt-${Date.now()}`;
    const eventType = payload?.event_type || 'UNKNOWN';
    const resourceType = payload?.resource_type || 'UNKNOWN';
    const resourceId = payload?.resource?.id;

    // Record to write-ahead event journal
    await supabase.insertEvent({
      event_id: eventId,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      signature_verified: false, // Updated to true after signature validation
      payload,
      status: 'RECEIVED',
      source: 'PAYPAL_WEBHOOK'
    });

    return reply.status(200).send({
      status: 'received',
      event_id: eventId
    });
  } catch (err: any) {
    fastify.log.error({ err: err.message }, 'Error persisting webhook');
    return reply.status(500).send({ error: 'Database persistence error', details: err.message });
  }
});

// 3. Create Order & Register Initial Expectation
fastify.post('/api/orders', async (request, reply) => {
  const body = request.body as {
    paypal_order_id: string;
    intent?: 'CAPTURE' | 'AUTHORIZE';
    currency?: string;
    total_amount_minor: number;
    customer_email?: string;
  };

  if (!body.paypal_order_id) {
    return reply.status(400).send({ error: 'paypal_order_id is required' });
  }

  try {
    const inserted = await supabase.insertOrder({
      paypal_order_id: body.paypal_order_id,
      intent: body.intent || 'CAPTURE',
      status: 'CREATED',
      currency: body.currency || 'USD',
      total_amount_minor: body.total_amount_minor || 0,
      customer_email: body.customer_email
    });

    const order = inserted[0];

    // Automatically register Stage 1 Expectation (Buyer Approval window: 30 minutes)
    const expectedBefore = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    await supabase.insertExpectation({
      order_id: order.id!,
      paypal_order_id: order.paypal_order_id,
      expected_event_type: 'CHECKOUT.ORDER.APPROVED',
      expected_before: expectedBefore,
      status: 'PENDING'
    });

    return reply.status(201).send({
      order,
      expectation_registered: true
    });
  } catch (err: any) {
    fastify.log.error({ err: err.message }, 'Failed to create order');
    return reply.status(500).send({ error: err.message });
  }
});

// 4. Query Orders
fastify.get('/api/orders', async () => {
  return supabase.getOrders();
});

// 5. Query Events
fastify.get('/api/events', async () => {
  return supabase.getEvents();
});

// 6. Query Expectations
fastify.get('/api/expectations', async () => {
  return supabase.getExpectations();
});

// 7. Query Incidents
fastify.get('/api/incidents', async () => {
  return supabase.getIncidents();
});

const start = async () => {
  const port = Number(process.env.PORT || 3001);
  try {
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`PayPulse Ingestion API running at http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
