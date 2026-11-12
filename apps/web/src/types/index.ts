export type Realm = 'shop' | 'console';

export type Currency = 'USD' | 'EUR' | 'JPY';

export type OrderStatus =
  | 'CREATED'
  | 'SAVED'
  | 'APPROVED'
  | 'VOIDED'
  | 'COMPLETED'
  | 'PAYER_ACTION_REQUIRED'
  | 'BREACHED'
  | 'RECONCILING'
  | 'HEALED';

export type IncidentStatus =
  | 'DETECTED'
  | 'DIAGNOSING'
  | 'HEALED'
  | 'MANUAL_INTERVENTION_REQUIRED';

export type IncidentCategory =
  | 'ITEM_TOTAL_MISMATCH'
  | 'SIGNATURE_FAILURE'
  | 'OVERDUE_CAPTURE'
  | 'DUPLICATE_EVENT'
  | 'OUT_OF_ORDER'
  | 'AUTH_EXPIRED'
  | 'AUTH_HONOR_PERIOD_EXPIRING'
  | 'DATABASE_WRITE_FAILURE'
  | 'UNHANDLED_ERROR';

export interface Product {
  id: string;
  brand: string;
  name: string;
  colour: string;
  city: 'Tokyo' | 'Berlin' | 'Osaka' | string;
  origin: string;
  cur: Currency;
  base: number;
  ship: number;
  duty: number;
  fill: string;
  shape: number;
  eta: string;
}

export interface CartItem {
  prod: Product;
  size: number;
}

export interface OrderEvent {
  at: number;
  label: string;
  kind: 'n' | 'ok' | 'bad' | 'warn';
}

export interface Incident {
  id: string;
  order: string;
  cat: IncidentCategory | string;
  sev: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: IncidentStatus;
  lat?: number;
  patch: boolean;
  at: number;
}

export interface Order {
  id: string;
  amount: number;
  cur: Currency;
  status: OrderStatus;
  sla: number;
  createdAt: number;
  deadlineAt?: number;
  dropped: boolean;
  scenario?: 'drop' | 'forge' | 'ooo' | null;
  patch: boolean;
  item: string;
  cap: string;
  lat?: number;
  _b?: number;
  events: OrderEvent[];
  inc?: Incident;
}

export type ConsolePage = 'overview' | 'payments' | 'incidents';

export type LensType = 'risk' | 'pivot' | 'incident' | null;

export type SimulatorScenario = 'drop' | 'forge' | 'ooo';
