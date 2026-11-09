export type Realm = 'store' | 'cockpit';

export type Currency = 'USD' | 'EUR' | 'JPY';

export type OrderStatus = 'APPROVED' | 'COMPLETED' | 'BREACHED' | 'RECONCILING' | 'HEALED';

export interface Product {
  id: string;
  brand: string;
  name: string;
  origin: string;
  cur: Currency;
  base: number;
  ship: number;
  duty: number;
  fill: string;
}

export interface CartItem {
  prod: Product;
  size: number;
}

export interface Order {
  id: string;
  amount: number;
  cur: Currency;
  status: OrderStatus;
  sla: number;
  deadlineAt?: number;
  dropped: boolean;
  patch: boolean;
  item: string;
  cap: string;
  lat?: number;
  _b?: number;
}

export type LensType = 'risk' | 'pivot' | 'incident' | null;

export interface KpiMetric {
  title: string;
  value: string | number;
  subtitle: string;
  highlight?: boolean;
}
