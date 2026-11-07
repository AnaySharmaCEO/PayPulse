/**
 * PayPulse Adapters - PayPal Orders v2 REST Client
 * Interrogates PayPal's authoritative ledger state for orders and authorizations.
 */

import { PayPalOAuthClient } from './oauth.js';

export interface PayPalOrderDetails {
  id: string;
  status: 'CREATED' | 'SAVED' | 'APPROVED' | 'VOIDED' | 'COMPLETED' | 'PAYER_ACTION_REQUIRED';
  intent: 'CAPTURE' | 'AUTHORIZE';
  purchase_units?: Array<{
    reference_id?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
      authorizations?: Array<{
        id: string;
        status: string;
        amount: { currency_code: string; value: string };
      }>;
    };
  }>;
}

export interface OrdersClientConfig {
  baseUrl?: string;
  oauthClient?: PayPalOAuthClient;
  fetchFn?: typeof fetch;
}

export class PayPalOrdersClient {
  private baseUrl: string;
  private oauthClient: PayPalOAuthClient;
  private fetchFn: typeof fetch;

  constructor(config: OrdersClientConfig = {}) {
    this.baseUrl = (config.baseUrl || process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com').replace(/\/$/, '');
    this.oauthClient = config.oauthClient || new PayPalOAuthClient({ baseUrl: this.baseUrl, fetchFn: config.fetchFn });
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  /**
   * Retrieves current ground truth order status from PayPal Orders v2 API.
   */
  async getOrder(paypalOrderId: string): Promise<PayPalOrderDetails> {
    const token = await this.oauthClient.getAccessToken();

    const res = await this.fetchFn(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch PayPal order ${paypalOrderId}: HTTP ${res.status} ${err}`);
    }

    return (await res.json()) as PayPalOrderDetails;
  }

  /**
   * Captures an authorized PayPal order.
   */
  async captureOrder(paypalOrderId: string): Promise<PayPalOrderDetails> {
    const token = await this.oauthClient.getAccessToken();

    const res = await this.fetchFn(`${this.baseUrl}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to capture PayPal order ${paypalOrderId}: HTTP ${res.status} ${err}`);
    }

    return (await res.json()) as PayPalOrderDetails;
  }
}
