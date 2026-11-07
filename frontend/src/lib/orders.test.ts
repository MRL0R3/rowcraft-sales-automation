import { describe, expect, it } from 'vitest';
import sample from '../../../fixtures/orders.csv?raw';
import cancelledOnly from '../../../fixtures/cancelled-only.csv?raw';
import invalidOrders from '../../../fixtures/invalid-orders.csv?raw';
import golden from '../../../fixtures/golden-report.json';
import { calculateReport, csvSafe, filterLines, parseCsv } from './orders';

describe('shared sales contract', () => {
  it('matches the shared golden report exactly', () => {
    const { lines, duplicateRows } = parseCsv(sample);
    expect({ ...calculateReport(lines, duplicateRows), duplicate_rows: undefined }).toEqual({ ...golden, duplicate_rows: undefined });
  });
  it('parses quoted commas, BOM and line endings, and flags duplicates', () => {
    const result = parseCsv('\uFEFForder_id,date,product,quantity,unit_price,status,currency\r\n"a,1",2026-01-01,"Nice, thing",1,0.10,completed,USD\r\n"a,1",2026-01-01,"Nice, thing",1,0.10,completed,USD\r\n');
    expect(result.lines[0].product).toBe('Nice, thing');
    expect(result.duplicateRows).toEqual([3]);
    expect(calculateReport(result.lines).completed_revenue).toBe('0.20');
  });
  it('rejects row errors, mixed currencies and zero-denominator cases clearly', () => {
    expect(() => parseCsv('order_id,date,product,quantity,unit_price,status,currency\no,2026-02-30,x,1,1,completed,USD')).toThrow('invalid row');
    expect(() => parseCsv('order_id,date,product,quantity,unit_price,status,currency\na,2026-01-01,x,1,1,completed,USD\nb,2026-01-01,x,1,1,completed,EUR')).toThrow('Mixed currencies');
    const { lines } = parseCsv('order_id,date,product,quantity,unit_price,status,currency\na,2026-01-01,x,1,1,cancelled,USD');
    expect(calculateReport(lines).refund_rate_by_value).toBeNull();
    expect(calculateReport(lines).average_order_value).toBe('0.00');
  });
  it('rejects duplicate headers and unsafe quantities with useful details', () => {
    expect(() => parseCsv('order_id,date,product,quantity,unit_price,status,currency,currency\nx,2026-01-01,x,1,1,completed,USD,USD')).toThrow('Duplicate headers');
    try { parseCsv('order_id,date,product,quantity,unit_price,status,currency\nx,2026-01-01,x,900719925475,0,completed,USD'); throw new Error('Expected validation to fail.'); }
    catch (error) { expect((error as Error & { issues: { message: string }[] }).issues[0].message).toContain('safe calculation limit'); }
  });
  it('recalculates filters and protects spreadsheet exports', () => {
    const { lines } = parseCsv(sample);
    expect(calculateReport(filterLines(lines, '2026-11-01', '2026-11-30', 'all', 'all')).completed_revenue).toBe('90.00');
    expect(csvSafe('=1+1')).toBe("'=1+1");
    expect(csvSafe('  =1+1')).toBe("'  =1+1");
  });
  it('rejects currencies with zero or three minor-unit digits', () => {
    const row = (currency: string) => `order_id,date,product,quantity,unit_price,status,currency\nx,2026-01-01,x,1,1,completed,${currency}`;
    for (const currency of ['JPY', 'KWD']) {
      try { parseCsv(row(currency)); throw new Error('Expected currency validation to fail.'); }
      catch (error) { expect((error as Error & { issues: { message: string }[] }).issues[0].message).toContain('two minor-unit digits'); }
    }
  });
  it('reports no completed sales for the shared cancelled-only fixture', () => {
    const { lines } = parseCsv(cancelledOnly);
    const report = calculateReport(lines);
    expect(report.completed_orders).toBe(0);
    expect(report.average_order_value).toBe('0.00');
    expect(report.refund_rate_by_value).toBeNull();
  });
  it('returns all actionable row failures from the shared invalid fixture', () => {
    try { parseCsv(invalidOrders); throw new Error('Expected validation to fail.'); }
    catch (error) { expect((error as Error & { issues: { row: number }[] }).issues.map((issue) => issue.row)).toEqual([2, 3, 4]); }
  });
  it('reports the physical end line for a record with a quoted newline', () => {
    const csv = 'order_id,date,product,quantity,unit_price,status,currency\n' +
      'X,2026-01-01,"two\nlines",0,1,completed,USD\n' +
      'Y,2026-01-01,okay,1,1,completed,USD';
    try { parseCsv(csv); throw new Error('Expected validation to fail.'); }
    catch (error) { expect((error as Error & { issues: { row: number }[] }).issues[0].row).toBe(3); }
  });
});
