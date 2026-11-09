/**
 * PayPulse Adapters - Channel3 E-Commerce API Client
 * Sources multi-merchant product catalogs with landed duties, international shipping,
 * and fractional currency calculations.
 */

export interface Channel3Product {
  id: string;
  brand: string;
  name: string;
  origin: string;
  cur: 'USD' | 'EUR' | 'JPY';
  base: number;
  ship: number;
  duty: number;
  fill: string;
  source: 'channel3-live' | 'seeded-catalog';
}

export const SEEDED_CHANNEL3_PRODUCTS: Channel3Product[] = [
  {
    id: 'am90',
    brand: 'Nike',
    name: 'Air Max 90',
    origin: 'Ships from Tokyo, Japan',
    cur: 'USD',
    base: 15900,
    ship: 1899,
    duty: 1200,
    fill: '#cdc8bc',
    source: 'seeded-catalog'
  },
  {
    id: 'samba',
    brand: 'Adidas',
    name: 'Samba OG',
    origin: 'Berlin Boutique, Germany',
    cur: 'EUR',
    base: 10000,
    ship: 1100,
    duty: 800,
    fill: '#d6d1c4',
    source: 'seeded-catalog'
  },
  {
    id: 'nb990',
    brand: 'New Balance',
    name: '990v6',
    origin: 'Ships from Osaka, Japan',
    cur: 'JPY',
    base: 24000,
    ship: 2900,
    duty: 1700,
    fill: '#c6c3ba',
    source: 'seeded-catalog'
  }
];

export interface Channel3ClientConfig {
  apiKey?: string;
  baseUrl?: string;
  fetchFn?: typeof fetch;
}

export class Channel3Client {
  private apiKey: string;
  private baseUrl: string;
  private fetchFn: typeof fetch;

  constructor(config: Channel3ClientConfig = {}) {
    this.apiKey = config.apiKey || process.env.CHANNEL3_API_KEY || '';
    this.baseUrl = (config.baseUrl || process.env.CHANNEL3_BASE_URL || 'https://api.trychannel3.com/v1').replace(/\/$/, '');
    this.fetchFn = config.fetchFn || globalThis.fetch;
  }

  /**
   * Fetches products from Channel3 multi-merchant API.
   * Gracefully falls back to seeded catalog when API key is omitted or endpoint is unreachable.
   */
  async getProducts(): Promise<Channel3Product[]> {
    if (!this.apiKey) {
      return SEEDED_CHANNEL3_PRODUCTS;
    }

    try {
      const res = await this.fetchFn(`${this.baseUrl}/products`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        return SEEDED_CHANNEL3_PRODUCTS;
      }

      const data = await res.json() as any;
      const items = Array.isArray(data) ? data : data?.products || data?.data;

      if (!items || !items.length) {
        return SEEDED_CHANNEL3_PRODUCTS;
      }

      return items.slice(0, 3).map((item: any, idx: number) => {
        const fallback = SEEDED_CHANNEL3_PRODUCTS[idx % SEEDED_CHANNEL3_PRODUCTS.length];
        return {
          id: item.id || fallback.id,
          brand: item.brand || fallback.brand,
          name: item.title || item.name || fallback.name,
          origin: item.origin || fallback.origin,
          cur: item.currency || fallback.cur,
          base: Number(item.price_minor || item.base_price) || fallback.base,
          ship: Number(item.shipping_minor) || fallback.ship,
          duty: Number(item.duty_minor) || fallback.duty,
          fill: fallback.fill,
          source: 'channel3-live'
        };
      });
    } catch {
      return SEEDED_CHANNEL3_PRODUCTS;
    }
  }
}
