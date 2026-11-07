import test from 'node:test';
import assert from 'node:assert/strict';
import {
  transitionOrder,
  canTransitionOrder,
  transitionIncident,
  transitionExpectation,
  StateTransitionError
} from '../state-machine.js';

test('Order State Machine - valid progression', () => {
  assert.equal(transitionOrder('CREATED', 'APPROVED'), 'APPROVED');
  assert.equal(transitionOrder('APPROVED', 'COMPLETED'), 'COMPLETED');
  assert.equal(transitionOrder('CREATED', 'COMPLETED'), 'COMPLETED'); // Direct capture acceleration
});

test('Order State Machine - idempotent self-transition', () => {
  assert.equal(transitionOrder('CREATED', 'CREATED'), 'CREATED');
  assert.equal(transitionOrder('COMPLETED', 'COMPLETED'), 'COMPLETED');
});

test('Order State Machine - illegal transition throws', () => {
  assert.equal(canTransitionOrder('COMPLETED', 'CREATED'), false);
  assert.throws(
    () => transitionOrder('COMPLETED', 'CREATED'),
    StateTransitionError
  );
});

test('Incident State Machine - valid flow', () => {
  assert.equal(transitionIncident('DETECTED', 'DIAGNOSING'), 'DIAGNOSING');
  assert.equal(transitionIncident('DIAGNOSING', 'HEALED'), 'HEALED');
});

test('Expectation State Machine - SLA breach can be healed by late delivery', () => {
  assert.equal(transitionExpectation('PENDING', 'BREACHED'), 'BREACHED');
  assert.equal(transitionExpectation('BREACHED', 'FULFILLED'), 'FULFILLED');
});
