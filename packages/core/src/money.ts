import type { CurrencyCode, Money } from './types.js';

/**
 * Currency exponent table (number of decimal digits).
 * Most fiat currencies use 2 decimal places. JPY uses 0.
 */
const CURRENCY_EXPONENTS: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0
};

export interface SerializedMoney {
  readonly amountMinor: string;
  readonly currency: CurrencyCode;
  readonly formatted: string;
}

/**
 * Creates an immutable Money value object from integer minor units.
 */
export function createMoney(amountMinor: bigint, currency: CurrencyCode): Money {
  return Object.freeze({
    amountMinor,
    currency,
    toJSON(): SerializedMoney {
      return {
        amountMinor: amountMinor.toString(),
        currency,
        formatted: formatMoneyString({ amountMinor, currency })
      };
    }
  });
}

/**
 * Safely converts any Money object or serialized representation to a JSON-safe object.
 */
export function serializeMoney(money: Money): SerializedMoney {
  return {
    amountMinor: money.amountMinor.toString(),
    currency: money.currency,
    formatted: formatMoneyString(money)
  };
}

/**
 * Deserializes a stored or received payload into a domain Money object.
 */
export function deserializeMoney(data: { amountMinor: string | number | bigint; currency: CurrencyCode }): Money {
  const minor = BigInt(data.amountMinor);
  return createMoney(minor, data.currency);
}

/**
 * Parses a decimal string (such as "49.99" or "100") into a Money object.
 * Avoids any floating point conversions.
 */
export function parseMoneyString(value: string, currency: CurrencyCode): Money {
  const trimmed = value.trim();
  const exponent = CURRENCY_EXPONENTS[currency];

  if (exponent === 0) {
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error(`Invalid zero-decimal currency amount: "${value}" for ${currency}`);
    }
    return createMoney(BigInt(trimmed), currency);
  }

  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new Error(`Invalid currency amount format: "${value}" for ${currency}`);
  }

  const isNegative = Boolean(match[1]);
  const integerPart = match[2] ?? '0';
  let fractionalPart = match[3] ?? '';

  if (fractionalPart.length > exponent) {
    throw new Error(
      `Amount "${value}" exceeds maximum decimal precision (${exponent}) for ${currency}`
    );
  }

  // Pad right to exponent
  fractionalPart = fractionalPart.padEnd(exponent, '0');

  const combinedString = `${integerPart}${fractionalPart}`;
  const minor = BigInt(combinedString);

  return createMoney(isNegative ? -minor : minor, currency);
}

/**
 * Formats a Money object into an exact string representation for APIs.
 */
export function formatMoneyString(money: Money): string {
  const exponent = CURRENCY_EXPONENTS[money.currency];
  const isNegative = money.amountMinor < 0n;
  const absMinor = isNegative ? -money.amountMinor : money.amountMinor;

  if (exponent === 0) {
    return `${isNegative ? '-' : ''}${absMinor.toString()}`;
  }

  const minorString = absMinor.toString().padStart(exponent + 1, '0');
  const splitIndex = minorString.length - exponent;
  const integerPart = minorString.slice(0, splitIndex);
  const fractionalPart = minorString.slice(splitIndex);

  return `${isNegative ? '-' : ''}${integerPart}.${fractionalPart}`;
}

/**
 * Adds two Money values of the same currency.
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch in addition: ${a.currency} vs ${b.currency}`);
  }
  return createMoney(a.amountMinor + b.amountMinor, a.currency);
}

/**
 * Subtracts Money b from Money a.
 */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch in subtraction: ${a.currency} vs ${b.currency}`);
  }
  return createMoney(a.amountMinor - b.amountMinor, a.currency);
}

/**
 * Multiplies Money by an integer quantity.
 */
export function multiplyMoney(money: Money, multiplier: bigint): Money {
  return createMoney(money.amountMinor * multiplier, money.currency);
}
