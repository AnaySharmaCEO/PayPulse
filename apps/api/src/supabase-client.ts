/**
 * PayPulse API - Supabase PostgREST Client Adapter
 * Lightweight, zero-dependency REST wrapper for Supabase database operations.
 */

export interface DbOrder {
  id?: string;
  paypal_order_id: string;
  intent: 'CAPTURE' | 'AUTHORIZE';
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  currency: string;
  total_amount_minor: string | number | bigint;
  customer_email?: string;
  version?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbEvent {
  id?: string;
  event_id: string;
  event_type: string;
  resource_type: string;
  resource_id?: string;
  signature_verified: boolean;
  payload: Record<string, unknown>;
  status: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'IGNORED_SUPERSEDED' | 'CHAOS_DROPPED';
  source: 'PAYPAL_WEBHOOK' | 'RECONCILER' | 'CHAOS_LAB' | 'MANUAL_REPLAY';
  processed_at?: string;
  created_at?: string;
}

export interface DbExpectation {
  id?: string;
  order_id: string;
  paypal_order_id: string;
  expected_event_type: string;
  expected_before: string;
  status: 'PENDING' | 'FULFILLED' | 'BREACHED' | 'CANCELLED';
  created_at?: string;
  resolved_at?: string;
}

export interface DbIncident {
  id?: string;
  order_id?: string;
  paypal_order_id?: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DETECTED' | 'DIAGNOSING' | 'HEALED' | 'MANUAL_INTERVENTION_REQUIRED';
  root_cause?: string;
  remediation_action?: string;
  code_patch?: string;
  automated?: boolean;
  confidence_score?: number;
  detected_at?: string;
  resolved_at?: string;
}

export class SupabaseClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(url?: string, key?: string) {
    this.baseUrl = (url || process.env.SUPABASE_URL || '').replace(/\/$/, '');
    this.apiKey = key || process.env.SUPABASE_ANON_KEY || '';

    if (!this.baseUrl || !this.apiKey) {
      console.warn('SupabaseClient initialized without complete credentials.');
    }
  }

  private get headers(): Record<string, string> {
    return {
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async insertOrder(order: DbOrder): Promise<DbOrder[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert order: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbOrder[]>;
  }

  async getOrders(limit = 50): Promise<DbOrder[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/orders?order=created_at.desc&limit=${limit}`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get orders: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbOrder[]>;
  }

  async insertEvent(event: DbEvent): Promise<DbEvent[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/events`, {
      method: 'POST',
      headers: {
        ...this.headers,
        'Prefer': 'resolution=ignore-duplicates,return=representation'
      },
      body: JSON.stringify(event)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert event: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbEvent[]>;
  }

  async getEvents(limit = 100): Promise<DbEvent[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/events?order=created_at.desc&limit=${limit}`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get events: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbEvent[]>;
  }

  async insertExpectation(expectation: DbExpectation): Promise<DbExpectation[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/expectations`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expectation)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert expectation: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbExpectation[]>;
  }

  async getExpectations(): Promise<DbExpectation[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/expectations?order=created_at.desc&limit=50`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get expectations: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbExpectation[]>;
  }

  async getIncidents(): Promise<DbIncident[]> {
    const res = await fetch(`${this.baseUrl}/rest/v1/incidents?order=detected_at.desc&limit=50`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get incidents: ${res.status} ${err}`);
    }
    return res.json() as Promise<DbIncident[]>;
  }
}
