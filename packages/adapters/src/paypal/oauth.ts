/**
 * PayPulse Adapters - PayPal OAuth2 Client with In-Memory Token Caching
 * Caches Bearer tokens (9-hour TTL) with a 5-minute safety margin to minimize round-trips.
 */

export interface PayPalOAuthConfig {
  clientId?: string;
  clientSecret?: string;
  baseUrl?: string; // defaults to sandbox: https://api-m.sandbox.paypal.com
  fetchFn?: typeof fetch;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // in seconds
  app_id: string;
}

export class PayPalOAuthClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;

  private cachedToken: string | null = null;
  private expiresAt: number = 0; // timestamp in milliseconds

  constructor(config: PayPalOAuthConfig = {}) {
    this.clientId = config.clientId || process.env.PAYPAL_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.PAYPAL_CLIENT_SECRET || '';
    this.baseUrl = (config.baseUrl || process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com').replace(/\/$/, '');
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  /**
   * Returns a valid Bearer token, reusing cached token if unexpired.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    const safetyBufferMs = 5 * 60 * 1000; // 5 minutes

    if (this.cachedToken && now < this.expiresAt - safetyBufferMs) {
      return this.cachedToken;
    }

    return this.refreshAccessToken();
  }

  /**
   * Requests a fresh OAuth2 token from PayPal client credentials endpoint with retry backoff.
   */
  async refreshAccessToken(retries = 3): Promise<string> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('PayPal credentials missing: PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET not configured.');
    }

    const authHeader = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const endpoint = `${this.baseUrl}/v1/oauth2/token`;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await this.fetchFn(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authHeader}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: 'grant_type=client_credentials'
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`PayPal OAuth HTTP ${res.status}: ${errText}`);
        }

        const data = (await res.json()) as OAuthTokenResponse;
        if (!data.access_token) {
          throw new Error('PayPal OAuth response did not contain access_token.');
        }

        this.cachedToken = data.access_token;
        this.expiresAt = Date.now() + (data.expires_in * 1000);

        return this.cachedToken;
      } catch (err: any) {
        lastError = err;
        if (attempt < retries) {
          const delay = Math.pow(2, attempt) * 500; // 1000ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`PayPal OAuth token request failed after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Invalidate the current cache (e.g. after HTTP 401 Unauthorized from PayPal REST API).
   */
  clearCache(): void {
    this.cachedToken = null;
    this.expiresAt = 0;
  }

  /**
   * For testing: inspect current expiration timestamp.
   */
  getExpiresAt(): number {
    return this.expiresAt;
  }
}
