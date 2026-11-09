import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PRODUCTS, calcTotal, formatMoney } from '../data/mockProducts.js';

describe('PayPulse Web Suite Smoke Tests', () => {
  it('should verify products have correct landed cost calculations', () => {
    assert.strictEqual(PRODUCTS.length, 3);
    const tokyoShoe = PRODUCTS[0];
    assert.strictEqual(tokyoShoe.id, 'am90');
    assert.strictEqual(calcTotal(tokyoShoe), 15900 + 1899 + 1200); // 18999
  });

  it('should format multi-currency amounts correctly', () => {
    const usd = formatMoney(18999, 'USD');
    assert.ok(usd.includes('189.99') || usd.includes('$189.99'));

    const eur = formatMoney(11900, 'EUR');
    assert.ok(eur.includes('119.00') || eur.includes('€119.00'));

    const jpy = formatMoney(28600, 'JPY');
    assert.ok(jpy.includes('28,600') || jpy.includes('¥28,600'));
  });
});
