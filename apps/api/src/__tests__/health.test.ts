import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import cors from '@fastify/cors';

test('Fastify Webhook Receiver - Health Endpoint', async () => {
  const app = Fastify();
  await app.register(cors);

  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'paypulse-api',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/health'
  });

  assert.equal(response.statusCode, 200);
  const json = JSON.parse(response.body);
  assert.equal(json.status, 'ok');
  assert.equal(json.service, 'paypulse-api');
  assert.equal(json.version, '1.0.0');
  assert.ok(json.timestamp);

  await app.close();
});

test('Fastify Webhook Receiver - Chaos Header Drop Filter', async () => {
  const app = Fastify();

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => {
    try {
      (req as any).rawBody = body;
      const json = JSON.parse(body.toString('utf-8'));
      done(null, json);
    } catch (err: any) {
      done(err, undefined);
    }
  });

  app.post('/api/webhooks/paypal', async (request, reply) => {
    const chaosHeader = request.headers['x-paypulse-chaos'];
    if (chaosHeader === 'drop') {
      return reply.status(200).send({
        status: 'dropped_by_chaos',
        note: 'Simulated network drop. Event logged as CHAOS_DROPPED.'
      });
    }
    return reply.status(200).send({ status: 'received' });
  });

  // Test 1: Chaos drop header
  const dropRes = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers: {
      'content-type': 'application/json',
      'x-paypulse-chaos': 'drop'
    },
    payload: {
      id: 'WH-TEST-CHAOS-001',
      event_type: 'PAYMENT.CAPTURE.COMPLETED'
    }
  });

  assert.equal(dropRes.statusCode, 200);
  const dropJson = JSON.parse(dropRes.body);
  assert.equal(dropJson.status, 'dropped_by_chaos');

  // Test 2: Normal webhook delivery
  const normalRes = await app.inject({
    method: 'POST',
    url: '/api/webhooks/paypal',
    headers: {
      'content-type': 'application/json'
    },
    payload: {
      id: 'WH-TEST-NORMAL-001',
      event_type: 'PAYMENT.CAPTURE.COMPLETED'
    }
  });

  assert.equal(normalRes.statusCode, 200);
  const normalJson = JSON.parse(normalRes.body);
  assert.equal(normalJson.status, 'received');

  await app.close();
});
