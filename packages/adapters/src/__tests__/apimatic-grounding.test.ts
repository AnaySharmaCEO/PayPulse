import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OrdersController } from '@paypal/paypal-server-sdk';
import { reconcileCaptureWithApimatic } from '../apimatic/order-grounding.js';

describe('APIMatic Grounding & PayPal Server SDK', () => {
  it('should instantiate OrdersController from official APIMatic-generated SDK', () => {
    assert.ok(OrdersController);
    assert.strictEqual(typeof OrdersController, 'function');
  });

  it('should reconcile completed capture with valid schema typing', async () => {
    const mockController = {
      getOrder: async ({ id }: { id: string }) => {
        return {
          result: {
            id,
            status: 'COMPLETED',
            purchaseUnits: [
              {
                payments: {
                  captures: [
                    {
                      id: 'CAP-9D3LA',
                      status: 'COMPLETED'
                    }
                  ]
                }
              }
            ]
          }
        };
      }
    } as unknown as OrdersController;

    const res = await reconcileCaptureWithApimatic(mockController, 'PP-9918');
    assert.ok(res);
    assert.strictEqual(res.eventId, 'REC_CAPTURE_CAP-9D3LA');
    assert.strictEqual(res.captureId, 'CAP-9D3LA');
    assert.strictEqual(res.schemaValidated, true);
  });
});
