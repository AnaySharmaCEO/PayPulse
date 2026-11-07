import test from 'node:test';
import assert from 'node:assert/strict';
import { PayPalOAuthClient } from '../paypal/oauth.js';

test('PayPalOAuthClient - fetches and caches token', async () => {
  let callCount = 0;

  const mockFetch: typeof fetch = async (input, init) => {
    callCount++;
    return new Response(JSON.stringify({
      access_token: 'MOCK_BEARER_TOKEN_999',
      token_type: 'Bearer',
      expires_in: 32400,
      app_id: 'APP-123'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const client = new PayPalOAuthClient({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    fetchFn: mockFetch
  });

  // First call fetches from endpoint
  const token1 = await client.getAccessToken();
  assert.equal(token1, 'MOCK_BEARER_TOKEN_999');
  assert.equal(callCount, 1);

  // Second immediate call returns cached token without hitting endpoint
  const token2 = await client.getAccessToken();
  assert.equal(token2, 'MOCK_BEARER_TOKEN_999');
  assert.equal(callCount, 1);

  // Clearing cache forces a refresh
  client.clearCache();
  const token3 = await client.getAccessToken();
  assert.equal(token3, 'MOCK_BEARER_TOKEN_999');
  assert.equal(callCount, 2);
});

test('PayPalOAuthClient - throws if credentials missing', async () => {
  const client = new PayPalOAuthClient({
    clientId: '',
    clientSecret: ''
  });

  await assert.rejects(
    async () => client.getAccessToken(),
    /PayPal credentials missing/
  );
});

test('PayPalOAuthClient - retries on transient errors', async () => {
  let attempts = 0;

  const mockFetch: typeof fetch = async () => {
    attempts++;
    if (attempts === 1) {
      return new Response('Transient 503 Service Unavailable', { status: 503 });
    }
    return new Response(JSON.stringify({
      access_token: 'RETRY_SUCCESS_TOKEN',
      token_type: 'Bearer',
      expires_in: 3600,
      app_id: 'APP-123'
    }), { status: 200 });
  };

  const client = new PayPalOAuthClient({
    clientId: 'id',
    clientSecret: 'secret',
    fetchFn: mockFetch
  });

  const token = await client.getAccessToken();
  assert.equal(token, 'RETRY_SUCCESS_TOKEN');
  assert.equal(attempts, 2);
});
