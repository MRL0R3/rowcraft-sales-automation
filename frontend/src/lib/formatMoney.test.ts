import { describe, expect, it } from 'vitest';
import { formatCents, formatMoney } from './formatMoney';

describe('money display', () => {
  it('keeps the correct sign and cents when refunds exceed sales', () => {
    expect(formatMoney('-12.50', 'USD')).toBe('-$12.50');
    expect(formatCents(-50, 'USD')).toBe('-$0.50');
    expect(formatCents(20150, 'USD')).toBe('$201.50');
  });
});
