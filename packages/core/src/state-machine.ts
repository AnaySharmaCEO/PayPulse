import type { ExpectationStatus, IncidentStatus, OrderStatus } from './types.js';

export class StateTransitionError extends Error {
  constructor(entity: string, current: string, attempted: string) {
    super(`Illegal state transition for ${entity}: cannot transition from "${current}" to "${attempted}"`);
    this.name = 'StateTransitionError';
  }
}

/**
 * Valid transitions for PayPal Order state.
 */
const VALID_ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  CREATED: ['SAVED', 'APPROVED', 'VOIDED', 'PAYER_ACTION_REQUIRED'],
  SAVED: ['APPROVED', 'VOIDED'],
  APPROVED: ['COMPLETED', 'VOIDED'],
  COMPLETED: [], // Terminal
  VOIDED: [], // Terminal
  PAYER_ACTION_REQUIRED: ['APPROVED', 'VOIDED']
};

export function canTransitionOrder(current: OrderStatus, target: OrderStatus): boolean {
  if (current === target) return true; // Idempotent no-op
  const allowed = VALID_ORDER_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

export function transitionOrder(current: OrderStatus, target: OrderStatus): OrderStatus {
  if (current === target) return current;
  if (!canTransitionOrder(current, target)) {
    throw new StateTransitionError('Order', current, target);
  }
  return target;
}

/**
 * Valid transitions for PayPulse Incident state.
 */
const VALID_INCIDENT_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  DETECTED: ['DIAGNOSING', 'HEALED', 'MANUAL_INTERVENTION_REQUIRED'],
  DIAGNOSING: ['HEALED', 'MANUAL_INTERVENTION_REQUIRED'],
  HEALED: [], // Terminal
  MANUAL_INTERVENTION_REQUIRED: ['HEALED']
};

export function canTransitionIncident(current: IncidentStatus, target: IncidentStatus): boolean {
  if (current === target) return true;
  const allowed = VALID_INCIDENT_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

export function transitionIncident(current: IncidentStatus, target: IncidentStatus): IncidentStatus {
  if (current === target) return current;
  if (!canTransitionIncident(current, target)) {
    throw new StateTransitionError('Incident', current, target);
  }
  return target;
}

/**
 * Valid transitions for Webhook SLA Expectations.
 */
const VALID_EXPECTATION_TRANSITIONS: Record<ExpectationStatus, readonly ExpectationStatus[]> = {
  PENDING: ['FULFILLED', 'BREACHED', 'CANCELLED'],
  FULFILLED: [], // Terminal
  BREACHED: ['FULFILLED'], // A late event can fulfill a previously breached expectation
  CANCELLED: [] // Terminal
};

export function canTransitionExpectation(current: ExpectationStatus, target: ExpectationStatus): boolean {
  if (current === target) return true;
  const allowed = VALID_EXPECTATION_TRANSITIONS[current];
  return allowed ? allowed.includes(target) : false;
}

export function transitionExpectation(current: ExpectationStatus, target: ExpectationStatus): ExpectationStatus {
  if (current === target) return current;
  if (!canTransitionExpectation(current, target)) {
    throw new StateTransitionError('WebhookExpectation', current, target);
  }
  return target;
}
