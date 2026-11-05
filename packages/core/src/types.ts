/**
 * @paypulse/core - Domain Types
 * Pure TypeScript definitions with zero runtime I/O dependencies.
 */

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'CAD' | 'AUD' | 'JPY';

export interface Money {
  readonly amountMinor: bigint;
  readonly currency: CurrencyCode;
}

export type OrderStatus =
  | 'CREATED'
  | 'SAVED'
  | 'APPROVED'
  | 'VOIDED'
  | 'COMPLETED'
  | 'PAYER_ACTION_REQUIRED';

export type OrderIntent = 'CAPTURE' | 'AUTHORIZE';

export interface OrderItem {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly unitAmount: Money;
}

export interface Order {
  readonly id: string;
  readonly paypalOrderId: string;
  readonly intent: OrderIntent;
  readonly status: OrderStatus;
  readonly totalAmount: Money;
  readonly items: readonly OrderItem[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type IncidentCategory =
  | 'ITEM_TOTAL_MISMATCH'
  | 'SIGNATURE_FAILURE'
  | 'OVERDUE_CAPTURE'
  | 'DUPLICATE_EVENT'
  | 'OUT_OF_ORDER'
  | 'AUTH_EXPIRED'
  | 'DATABASE_WRITE_FAILURE'
  | 'UNHANDLED_ERROR';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentStatus = 'DETECTED' | 'DIAGNOSING' | 'HEALED' | 'MANUAL_INTERVENTION_REQUIRED';

export type HealingActionType =
  | 'RECONCILE_FROM_ORDERS_API'
  | 'RETRY_WEBHOOK_DELIVERY'
  | 'EXTEND_AUTHORIZATION'
  | 'VOID_AND_ALERT'
  | 'NOOP_ALREADY_SETTLED';

export interface HealingPlan {
  readonly action: HealingActionType;
  readonly reason: string;
  readonly automated: boolean;
  readonly confidenceScore: number;
}

export interface Incident {
  readonly id: string;
  readonly orderId: string;
  readonly category: IncidentCategory;
  readonly severity: IncidentSeverity;
  readonly status: IncidentStatus;
  readonly detectedAt: string;
  readonly resolvedAt?: string;
  readonly rootCause?: string;
  readonly healingPlan?: HealingPlan;
}

export type ExpectationStatus = 'PENDING' | 'FULFILLED' | 'BREACHED' | 'CANCELLED';

export interface WebhookExpectation {
  readonly id: string;
  readonly orderId: string;
  readonly expectedEventType: string;
  readonly expectedBefore: string;
  readonly status: ExpectationStatus;
  readonly createdAt: string;
}
