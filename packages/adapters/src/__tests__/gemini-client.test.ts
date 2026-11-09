import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GeminiDoctorClient } from '../gemini/client.js';

describe('GeminiDoctorClient - Modern Interactions API & Fallback', () => {
  it('should generate grounded diagnosis using Interactions API cascade fallback when offline', async () => {
    const client = new GeminiDoctorClient('mock-key-for-offline', 'https://mock.invalid.endpoint');
    const result = await client.diagnoseIncident({
      orderId: 'PP-9918',
      category: 'OVERDUE_CAPTURE',
      slaSeconds: 90,
      deliveryLatencySeconds: 44,
      captureId: 'CAP-9D3LA'
    });

    assert.ok(result);
    assert.strictEqual(result.category, 'OVERDUE_CAPTURE');
    assert.strictEqual(result.confidenceScore, 0.97);
    assert.ok(result.codePatch.includes('@paypal/paypal-server-sdk'));
    assert.ok(result.codePatch.includes('OrdersController'));
    assert.strictEqual(result.source, 'gemini-3.5-flash-lite-fallback');
  });

  it('should return deterministic grounded fixture when no key provided', async () => {
    const client = new GeminiDoctorClient('');
    const result = await client.diagnoseIncident({
      orderId: 'PP-9922',
      category: 'OVERDUE_CAPTURE',
      slaSeconds: 25,
      deliveryLatencySeconds: 32,
      captureId: 'CAP-4MN88'
    });

    assert.ok(result);
    assert.strictEqual(result.source, 'grounded-fixture');
    assert.ok(result.codePatch.includes('reconcileCapture'));
  });
});
