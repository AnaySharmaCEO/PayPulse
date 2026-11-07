/**
 * PayPulse Adapters - Supabase PostgREST Database Client
 * Handles orders, expectations, event journal, incidents, and chaos rules.
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

export interface SupabaseClientConfig {
  baseUrl?: string;
  apiKey?: string;
  fetchFn?: typeof fetch;
}

export class SupabaseClient {
  private baseUrl: string;
  private apiKey: string;
  private fetchFn: typeof fetch;

  constructor(config: SupabaseClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.SUPABASE_URL || '').replace(/\/$/, '');
    this.apiKey = config.apiKey || process.env.SUPABASE_ANON_KEY || '';
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  private get headers(): Record<string, string> {
    return {
      'apikey': this.apiKey,
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  // --- Orders ---

  async insertOrder(order: DbOrder): Promise<DbOrder[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/orders`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(order)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert order: ${res.status} ${err}`);
    }
    return (await res.json()) as DbOrder[];
  }

  async findOrderByPayPalId(paypalOrderId: string): Promise<DbOrder | null> {
    const res = await this.fetchFn(
      `${this.baseUrl}/rest/v1/orders?paypal_order_id=eq.${encodeURIComponent(paypalOrderId)}&limit=1`,
      { headers: this.headers }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to query order: ${res.status} ${err}`);
    }
    const orders = (await res.json()) as DbOrder[];
    return orders.length > 0 ? orders[0] : null;
  }

  async updateOrderStatus(
    orderId: string,
    status: DbOrder['status'],
    currentVersion?: number
  ): Promise<DbOrder | null> {
    let url = `${this.baseUrl}/rest/v1/orders?id=eq.${encodeURIComponent(orderId)}`;
    if (typeof currentVersion === 'number') {
      url += `&version=eq.${currentVersion}`;
    }

    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString()
    };
    if (typeof currentVersion === 'number') {
      payload.version = currentVersion + 1;
    }

    const res = await this.fetchFn(url, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update order status: ${res.status} ${err}`);
    }

    const updated = (await res.json()) as DbOrder[];
    return updated.length > 0 ? updated[0] : null;
  }

  async getOrders(limit = 50): Promise<DbOrder[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/orders?order=created_at.desc&limit=${limit}`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get orders: ${res.status} ${err}`);
    }
    return (await res.json()) as DbOrder[];
  }

  // --- Events (Idempotent Journal) ---

  async findEventByEventId(eventId: string): Promise<DbEvent | null> {
    const res = await this.fetchFn(
      `${this.baseUrl}/rest/v1/events?event_id=eq.${encodeURIComponent(eventId)}&limit=1`,
      { headers: this.headers }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to query event: ${res.status} ${err}`);
    }
    const events = (await res.json()) as DbEvent[];
    return events.length > 0 ? events[0] : null;
  }

  async insertEvent(event: DbEvent): Promise<{ inserted: boolean; event: DbEvent }> {
    // Check if event already exists (idempotency check)
    const existing = await this.findEventByEventId(event.event_id);
    if (existing) {
      return { inserted: false, event: existing };
    }

    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/events`, {
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

    const created = (await res.json()) as DbEvent[];
    return {
      inserted: created.length > 0,
      event: created.length > 0 ? created[0] : event
    };
  }

  async getEvents(limit = 100): Promise<DbEvent[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/events?order=created_at.desc&limit=${limit}`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get events: ${res.status} ${err}`);
    }
    return (await res.json()) as DbEvent[];
  }

  // --- Expectations (SLA Engine) ---

  async insertExpectation(expectation: DbExpectation): Promise<DbExpectation[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/expectations`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(expectation)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert expectation: ${res.status} ${err}`);
    }
    return (await res.json()) as DbExpectation[];
  }

  async findExpectationsByOrderId(orderId: string): Promise<DbExpectation[]> {
    const res = await this.fetchFn(
      `${this.baseUrl}/rest/v1/expectations?order_id=eq.${encodeURIComponent(orderId)}&status=eq.PENDING`,
      { headers: this.headers }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to query expectations: ${res.status} ${err}`);
    }
    return (await res.json()) as DbExpectation[];
  }

  async updateExpectation(id: string, status: DbExpectation['status']): Promise<DbExpectation | null> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/expectations?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify({
        status,
        resolved_at: new Date().toISOString()
      })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to update expectation: ${res.status} ${err}`);
    }
    const updated = (await res.json()) as DbExpectation[];
    return updated.length > 0 ? updated[0] : null;
  }

  async getExpectations(): Promise<DbExpectation[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/expectations?order=created_at.desc&limit=50`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get expectations: ${res.status} ${err}`);
    }
    return (await res.json()) as DbExpectation[];
  }

  // --- Incidents ---

  async insertIncident(incident: DbIncident): Promise<DbIncident[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/incidents`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(incident)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to insert incident: ${res.status} ${err}`);
    }
    return (await res.json()) as DbIncident[];
  }

  async getIncidents(): Promise<DbIncident[]> {
    const res = await this.fetchFn(`${this.baseUrl}/rest/v1/incidents?order=detected_at.desc&limit=50`, {
      headers: this.headers
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to get incidents: ${res.status} ${err}`);
    }
    return (await res.json()) as DbIncident[];
  }
}
