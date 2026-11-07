import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMoneyString,
  formatMoneyString,
  addMoney,
  subtractMoney,
  multiplyMoney,
  createMoney,
  serializeMoney,
  deserializeMoney
} from '../money.js';

test('Money - parsing and formatting USD', () => {
  const m = parseMoneyString('49.99', 'USD');
  assert.equal(m.amountMinor, 4999n);
  assert.equal(m.currency, 'USD');
  assert.equal(formatMoneyString(m), '49.99');
});

test('Money - JSON serialization safety', () => {
  const m = parseMoneyString('49.99', 'USD');
  const jsonString = JSON.stringify(m);
  const parsed = JSON.parse(jsonString);
  assert.equal(parsed.amountMinor, '4999');
  assert.equal(parsed.currency, 'USD');
  assert.equal(parsed.formatted, '49.99');

  const restored = deserializeMoney(parsed);
  assert.equal(restored.amountMinor, 4999n);
  assert.equal(restored.currency, 'USD');
});

test('Money - explicit serializeMoney helper', () => {
  const m = createMoney(15000n, 'EUR');
  const s = serializeMoney(m);
  assert.deepEqual(s, {
    amountMinor: '15000',
    currency: 'EUR',
    formatted: '150.00'
  });
});

test('Money - integer input for decimal currency', () => {
  const m = parseMoneyString('100', 'USD');
  assert.equal(m.amountMinor, 10000n);
  assert.equal(formatMoneyString(m), '100.00');
});

test('Money - zero decimal currency (JPY)', () => {
  const m = parseMoneyString('5000', 'JPY');
  assert.equal(m.amountMinor, 5000n);
  assert.equal(formatMoneyString(m), '5000');
});

test('Money - addition and subtraction without float rounding errors', () => {
  const a = parseMoneyString('0.10', 'USD');
  const b = parseMoneyString('0.20', 'USD');
  const sum = addMoney(a, b);
  assert.equal(sum.amountMinor, 30n);
  assert.equal(formatMoneyString(sum), '0.30');

  const diff = subtractMoney(sum, a);
  assert.equal(diff.amountMinor, 20n);
  assert.equal(formatMoneyString(diff), '0.20');
});

test('Money - multiplication by quantity', () => {
  const unit = parseMoneyString('19.99', 'USD');
  const total = multiplyMoney(unit, 3n);
  assert.equal(total.amountMinor, 5997n);
  assert.equal(formatMoneyString(total), '59.97');
});

test('Money - currency mismatch throws', () => {
  const a = createMoney(100n, 'USD');
  const b = createMoney(100n, 'EUR');
  assert.throws(() => addMoney(a, b), /Currency mismatch/);
});
