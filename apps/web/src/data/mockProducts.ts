import { Product, Currency } from '../types';

export const PRODUCTS: Product[] = [
  {
    id: 'am90',
    brand: 'Nike',
    name: 'Air Max 90',
    origin: 'Ships from Tokyo, Japan',
    cur: 'USD',
    base: 15900,
    ship: 1899,
    duty: 1200,
    fill: '#cdc8bc'
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
    fill: '#d6d1c4'
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
    fill: '#c6c3ba'
  }
];

export const SIZES = [8, 9, 10, 11, 12];

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
