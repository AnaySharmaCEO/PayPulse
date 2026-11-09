/**
 * PayPulse Ingestion API & Edge Router
 * Fastify Application Factory with Cryptographic Signature Verification,
 * Idempotent Journaling, and Two-Stage Expectation State Transitions.
 */

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { transitionOrder } from '@paypulse/core';
import {
  PayPalWebhookVerifier,
  PayPalOrdersClient,
  SupabaseClient,
  Channel3Client,
  type WebhookSignatureHeaders
} from '@paypulse/adapters';
import { ReconcilerWorker } from './reconciler/worker.js';

export interface AppOptions {
  verifier?: PayPalWebhookVerifier;
  supabase?: SupabaseClient;
  reconciler?: ReconcilerWorker;
  autoStartReconciler?: boolean;
  logger?: boolean;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const fastify = Fastify({
    logger: options.logger ?? false
  });

  await fastify.register(cors, {
    origin: true
  });

  const supabase = options.supabase || new SupabaseClient();
  const verifier = options.verifier || new PayPalWebhookVerifier();
  const channel3 = new Channel3Client();
  const reconciler =
    options.reconciler ||
    new ReconcilerWorker({
      supabase,
      ordersClient: new PayPalOrdersClient()
    });

  if (options.autoStartReconciler) {
    reconciler.start();
  }

  fastify.addHook('onClose', async () => {
    reconciler.stop();
  });

  // Custom parser preserving raw binary buffer on application/json for cryptographic signature verification
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

  // 2. PayPal Webhook Receiver with Signature Verification & Two-Stage State Machine
  fastify.post('/api/webhooks/paypal', async (request, reply) => {
    const headers = request.headers as WebhookSignatureHeaders;
    const payload = (request.body as Record<string, any>) || {};

    const eventId = payload.id;
    const eventType = payload.event_type || 'UNKNOWN';
    const resource = payload.resource || {};
    const resourceType = payload.resource_type || 'UNKNOWN';
    const resourceId = resource.id;

    if (!eventId) {
      return reply.status(400).send({ error: 'INVALID_PAYLOAD: Missing webhook event id' });
    }

    // A. Chaos Lab Header Trigger (Simulated Webhook Drop)
    const chaosHeader = headers['x-paypulse-chaos'];
    if (chaosHeader === 'drop') {
      fastify.log.warn({ eventId }, 'CHAOS LAB: Webhook dropped by request header filter');
      try {
        await supabase.insertEvent({
          event_id: eventId,
          event_type: eventType,
          resource_type: resourceType,
          resource_id: resourceId,
          signature_verified: false,
          payload,
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

    // B. Upstream Cryptographic Signature Verification
    const verification = await verifier.verify(headers, payload);

    if (!verification.verified) {
      fastify.log.warn({ eventId, reason: verification.reason }, 'Webhook signature verification rejected');

      // Log incident in persistence journal
      try {
        await supabase.insertIncident({
          category: 'SIGNATURE_FAILURE',
          severity: 'HIGH',
          status: 'DETECTED',
          root_cause: `Webhook signature verification failed: ${verification.reason}`,
          remediation_action: 'Verify PayPal webhook credentials and certificate authenticity',
          automated: false,
          confidence_score: 1.0
        });
      } catch (err: any) {
        fastify.log.error({ err: err.message }, 'Failed to record signature failure incident');
      }

      return reply.status(400).send({
        error: 'SIGNATURE_VERIFICATION_FAILED',
        reason: verification.reason
      });
    }

    // C. Idempotent Journal Insertion (Deduplication)
    const { inserted, event } = await supabase.insertEvent({
      event_id: eventId,
      event_type: eventType,
      resource_type: resourceType,
      resource_id: resourceId,
      signature_verified: true,
      payload,
      status: 'RECEIVED',
      source: 'PAYPAL_WEBHOOK',
      processed_at: new Date().toISOString()
    });

    if (!inserted) {
      // Event already recorded in write-ahead log: absorb as idempotent no-op
      fastify.log.info({ eventId }, 'Duplicate webhook event received; idempotently ignored');
      return reply.status(200).send({
        status: 'duplicate_ignored',
        event_id: eventId
      });
    }

    // D. State Machine & Two-Stage Expectation Progression
    try {
      // Extract PayPal Order ID from event payload
      let paypalOrderId: string | undefined = undefined;
      if (eventType.startsWith('CHECKOUT.ORDER.')) {
        paypalOrderId = resource.id;
      } else if (eventType.startsWith('PAYMENT.CAPTURE.')) {
        paypalOrderId = resource.supplementary_data?.related_ids?.order_id || resource.custom_id || resource.invoice_id;
      }

      if (paypalOrderId) {
        const order = await supabase.findOrderByPayPalId(paypalOrderId);

        if (order && order.id) {
          // Case 1: Buyer approved checkout
          if (eventType === 'CHECKOUT.ORDER.APPROVED') {
            const nextStatus = transitionOrder(order.status, 'APPROVED');
            await supabase.updateOrderStatus(order.id, nextStatus, order.version);

            // Fulfill Stage 1 expectations
            const expectations = await supabase.findExpectationsByOrderId(order.id);
            for (const exp of expectations) {
              if (exp.expected_event_type === 'CHECKOUT.ORDER.APPROVED' && exp.id) {
                await supabase.updateExpectation(exp.id, 'FULFILLED');
              }
            }

            // Register Stage 2 Expectation: PAYMENT.CAPTURE.COMPLETED within 90 seconds SLA
            const captureDeadline = new Date(Date.now() + 90 * 1000).toISOString();
            await supabase.insertExpectation({
              order_id: order.id,
              paypal_order_id: paypalOrderId,
              expected_event_type: 'PAYMENT.CAPTURE.COMPLETED',
              expected_before: captureDeadline,
              status: 'PENDING'
            });
          }

          // Case 2: Payment captured / completed
          if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
            const nextStatus = transitionOrder(order.status, 'COMPLETED');
            await supabase.updateOrderStatus(order.id, nextStatus, order.version);

            // Fulfill all pending expectations for this order
            const expectations = await supabase.findExpectationsByOrderId(order.id);
            for (const exp of expectations) {
              if (exp.id) {
                await supabase.updateExpectation(exp.id, 'FULFILLED');
              }
            }
          }
        }
      }

      return reply.status(200).send({
        status: 'received',
        event_id: eventId
      });
    } catch (stateErr: any) {
      fastify.log.error({ err: stateErr.message }, 'Error during order state transition');
      return reply.status(200).send({
        status: 'received_with_state_warning',
        event_id: eventId,
        warning: stateErr.message
      });
    }
  });

  // 3. Create Order & Register Stage 1 Expectation
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

  // 4. Autonomous Reconciler Trigger
  fastify.post('/api/reconciler/tick', async (request, reply) => {
    const body = (request.body as Record<string, any>) || {};
    const report = await reconciler.tick(body.as_of);
    return reply.status(200).send(report);
  });

  // 5. Query Endpoints
  fastify.get('/api/catalog', async () => channel3.getProducts());
  fastify.get('/api/orders', async () => supabase.getOrders());
  fastify.get('/api/events', async () => supabase.getEvents());
  fastify.get('/api/expectations', async () => supabase.getExpectations());
  fastify.get('/api/incidents', async () => supabase.getIncidents());

  return fastify;
}
