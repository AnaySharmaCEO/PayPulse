import test from 'node:test';
import assert from 'node:assert/strict';
import { PayPalWebhookVerifier } from '../paypal/signature-verifier.js';
import { PayPalOAuthClient } from '../paypal/oauth.js';

test('PayPalWebhookVerifier - rejects missing signature headers', async () => {
  const verifier = new PayPalWebhookVerifier({
    webhookId: 'WH12345ABCDE',
    simulationMode: true
  });

  // Empty headers
  const result1 = await verifier.verify({}, { id: 'EVT-1' });
  assert.equal(result1.verified, false);
  assert.equal(result1.status, 'FAILURE');
  assert.match(result1.reason || '', /MISSING_SIGNATURE_HEADERS/);

  // Partial headers missing transmission-sig
  const result2 = await verifier.verify({
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-123',
    'paypal-transmission-time': '2026-11-07T10:00:00Z'
  }, { id: 'EVT-1' });

  assert.equal(result2.verified, false);
  assert.equal(result2.status, 'FAILURE');
  assert.match(result2.reason || '', /MISSING_SIGNATURE_HEADERS/);
});

test('PayPalWebhookVerifier - rejects invalid non-alphanumeric webhookId', async () => {
  const verifier = new PayPalWebhookVerifier({
    webhookId: 'invalid-id-with-dashes!', // violates ^[a-zA-Z0-9]+$ regex
    simulationMode: false
  });

  const headers = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-123',
    'paypal-transmission-sig': 'valid_sig_base64',
    'paypal-transmission-time': '2026-11-07T10:00:00Z'
  };

  const result = await verifier.verify(headers, { id: 'EVT-1' });
  assert.equal(result.verified, false);
  assert.equal(result.status, 'ERROR');
  assert.match(result.reason || '', /INVALID_WEBHOOK_ID/);
});

test('PayPalWebhookVerifier - simulation mode validates signature successfully', async () => {
  const verifier = new PayPalWebhookVerifier({
    webhookId: 'WHVALID12345',
    simulationMode: true
  });

  const headers = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-123',
    'paypal-transmission-sig': 'valid_base64_sig',
    'paypal-transmission-time': '2026-11-07T10:00:00Z'
  };

  const result = await verifier.verify(headers, { id: 'EVT-VALID' });
  assert.equal(result.verified, true);
  assert.equal(result.status, 'SUCCESS');
});

test('PayPalWebhookVerifier - simulation mode rejects tampered signature', async () => {
  const verifier = new PayPalWebhookVerifier({
    webhookId: 'WHVALID12345',
    simulationMode: true
  });

  const headers = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-123',
    'paypal-transmission-sig': 'INVALID_TEST_SIGNATURE',
    'paypal-transmission-time': '2026-11-07T10:00:00Z'
  };

  const result = await verifier.verify(headers, { id: 'EVT-TAMPERED' });
  assert.equal(result.verified, false);
  assert.equal(result.status, 'FAILURE');
  assert.match(result.reason || '', /SIMULATED_SIGNATURE_FAILURE/);
});

test('PayPalWebhookVerifier - live verification API calls upstream', async () => {
  let requestedEndpoint = '';
  let sentPayload: any = null;

  const mockFetch: typeof fetch = async (input, init) => {
    requestedEndpoint = String(input);
    if (requestedEndpoint.includes('/v1/oauth2/token')) {
      return new Response(JSON.stringify({
        access_token: 'MOCK_TOKEN',
        expires_in: 32400
      }), { status: 200 });
    }
    if (requestedEndpoint.includes('/v1/notifications/verify-webhook-signature')) {
      sentPayload = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({
        verification_status: 'SUCCESS'
      }), { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  };

  const oauthClient = new PayPalOAuthClient({
    clientId: 'test-id',
    clientSecret: 'test-secret',
    fetchFn: mockFetch
  });

  const verifier = new PayPalWebhookVerifier({
    webhookId: 'WH998877AABB',
    oauthClient,
    fetchFn: mockFetch,
    simulationMode: false
  });

  const headers = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.sandbox.paypal.com/cert.pem',
    'paypal-transmission-id': 'trans-live-1',
    'paypal-transmission-sig': 'real_signature_data',
    'paypal-transmission-time': '2026-11-07T10:15:00Z'
  };

  const result = await verifier.verify(headers, { id: 'WH-EVT-99', event_type: 'PAYMENT.CAPTURE.COMPLETED' });

  assert.equal(result.verified, true);
  assert.equal(result.status, 'SUCCESS');
  assert.equal(sentPayload.webhook_id, 'WH998877AABB');
  assert.equal(sentPayload.transmission_sig, 'real_signature_data');
});
