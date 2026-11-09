import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Channel3Client, SEEDED_CHANNEL3_PRODUCTS } from '../channel3/client.js';

describe('Channel3 Client - Multi-Merchant Catalog', () => {
  it('should return seeded items when no API key provided', async () => {
    const client = new Channel3Client({ apiKey: '' });
    const products = await client.getProducts();

    assert.strictEqual(products.length, 3);
    assert.strictEqual(products[0].id, 'am90');
    assert.strictEqual(products[0].source, 'seeded-catalog');
    assert.strictEqual(products[0].brand, 'Nike');
  });

  it('should parse live API payload when API key provided and endpoint responds', async () => {
    const mockFetch = async () => {
      return {
        ok: true,
        json: async () => ({
          products: [
            {
              id: 'c3-shoe-1',
              brand: 'Salomon',
              title: 'XT-6 GORE-TEX',
              origin: 'Annecy, France',
              currency: 'EUR',
              price_minor: 18000,
              shipping_minor: 1500,
              duty_minor: 900
            }
          ]
        })
      } as unknown as Response;
    };

    const client = new Channel3Client({
      apiKey: 'test-c3-key',
      baseUrl: 'https://mock.channel3.api',
      fetchFn: mockFetch as typeof fetch
    });

    const products = await client.getProducts();
    assert.strictEqual(products.length, 1);
    assert.strictEqual(products[0].id, 'c3-shoe-1');
    assert.strictEqual(products[0].brand, 'Salomon');
    assert.strictEqual(products[0].source, 'channel3-live');
  });
});
