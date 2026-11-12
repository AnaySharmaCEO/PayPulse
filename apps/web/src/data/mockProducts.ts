import { Product, Currency } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'am90',
    brand: 'Nike',
    name: 'Air Max 90',
    colour: 'Sail / Volt',
    city: 'Tokyo',
    origin: 'Ships from Tokyo, Japan',
    cur: 'USD',
    base: 15900,
    ship: 1899,
    duty: 1200,
    fill: '#d9d4c7',
    shape: 0,
    eta: '6–8 days'
  },
  {
    id: 'samba',
    brand: 'Adidas',
    name: 'Samba OG',
    colour: 'Cream / Gum',
    city: 'Berlin',
    origin: 'Ships from Berlin, Germany',
    cur: 'EUR',
    base: 10000,
    ship: 1100,
    duty: 800,
    fill: '#e3dccb',
    shape: 1,
    eta: '4–6 days'
  },
  {
    id: 'nb990',
    brand: 'New Balance',
    name: '990v6',
    colour: 'Grey / Silver',
    city: 'Osaka',
    origin: 'Ships from Osaka, Japan',
    cur: 'JPY',
    base: 24000,
    ship: 2900,
    duty: 1700,
    fill: '#cfcdc8',
    shape: 0,
    eta: '5–7 days'
  },
  {
    id: 'kay14',
    brand: 'ASICS',
    name: 'Gel-Kayano 14',
    colour: 'Cream / Steel',
    city: 'Tokyo',
    origin: 'Ships from Tokyo, Japan',
    cur: 'USD',
    base: 17900,
    ship: 2100,
    duty: 1400,
    fill: '#c9ccd0',
    shape: 0,
    eta: '6–8 days'
  },
  {
    id: 'speed',
    brand: 'Puma',
    name: 'Speedcat',
    colour: 'Black / White',
    city: 'Berlin',
    origin: 'Ships from Berlin, Germany',
    cur: 'EUR',
    base: 11000,
    ship: 1100,
    duty: 900,
    fill: '#bdb8ad',
    shape: 1,
    eta: '4–6 days'
  },
  {
    id: 'wave',
    brand: 'Mizuno',
    name: 'Wave Rider 10',
    colour: 'Ivory / Navy',
    city: 'Osaka',
    origin: 'Ships from Osaka, Japan',
    cur: 'JPY',
    base: 21000,
    ship: 2800,
    duty: 1500,
    fill: '#d6d2c6',
    shape: 0,
    eta: '5–7 days'
  }
];

export const SIZES = [7, 8, 9, 10, 11];

export const FX_RATE: Record<Currency, number> = {
  USD: 1,
  EUR: 1.08,
  JPY: 0.0067
};

export function calcTotal(p: Product): number {
  return p.base + p.ship + p.duty;
}

export function formatMoney(minor: number, cur: Currency): string {
  const isJpy = cur === 'JPY';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: isJpy ? 0 : 2,
    maximumFractionDigits: isJpy ? 0 : 2
  }).format(isJpy ? minor : minor / 100);
}

export function normalizeToUsd(amountMinor: number, cur: Currency): number {
  const rate = FX_RATE[cur] || 1;
  const major = cur === 'JPY' ? amountMinor : amountMinor / 100;
  return major * rate;
}

export function renderShoeSvg(fill: string, shape: number = 0): string {
  const up = shape === 1
    ? 'M10 66c4-8 22-10 40-16l18-8c10-4 18 0 28 3l50 10c22 5 38 8 38 20v7H10z'
    : 'M10 70c0-10 18-14 34-22l22-12c8-4 20 6 32 9l50 8c20 3 40 10 40 22v7H10z';

  return `
    <svg viewBox="0 0 220 110" fill="none" aria-hidden="true">
      <path d="${up}" fill="${fill}" stroke="#00000022"/>
      <rect x="10" y="80" width="198" height="10" rx="5" fill="#fff" stroke="#00000018"/>
      <rect x="10" y="86" width="198" height="5" rx="2.5" fill="#00000022"/>
      <path d="M76 40l9 12M90 43l9 12M104 47l9 12" stroke="#0000003d" stroke-width="2.2" stroke-linecap="round"/>
      <path d="M50 74c30 4 80 4 130-8" stroke="#00000020" stroke-width="3" stroke-linecap="round"/>
    </svg>
  `;
}
