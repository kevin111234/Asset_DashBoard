import { describe, it, expect } from 'vitest';
import { parseAmountInput } from './amountParse';

describe('parseAmountInput', () => {
  it('parses plain digits', () => {
    expect(parseAmountInput('800000')).toBe(800000);
  });
  it('parses comma-separated digits', () => {
    expect(parseAmountInput('800,000')).toBe(800000);
  });
  it('parses 만 shorthand', () => {
    expect(parseAmountInput('80만')).toBe(800000);
  });
  it('parses 만원 shorthand', () => {
    expect(parseAmountInput('80만원')).toBe(800000);
  });
  it('parses combined 억+만', () => {
    expect(parseAmountInput('1억500만')).toBe(105_000_000);
  });
  it('returns null for empty/invalid input', () => {
    expect(parseAmountInput('')).toBeNull();
    expect(parseAmountInput('abc')).toBeNull();
  });
});
