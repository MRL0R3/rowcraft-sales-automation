import Papa from 'papaparse';

export type Status = 'completed' | 'refunded' | 'cancelled';
export type OrderLine = { order_id: string; date: string; product: string; quantity: number; unit_price: string; status: Status; currency: string };
export type Issue = { row: number; field: string; message: string };
export type Report = {
  currency: string; row_count: number; completed_revenue: string; refunded_amount: string; net_revenue: string;
  completed_orders: number; average_order_value: string; refund_rate_by_value: string | null;
  monthly: { month: string; completed_revenue: string; refunded_amount: string; net_revenue: string; completed_orders: number }[];
  products: { product: string; completed_revenue: string; quantity: number; orders: number }[]; duplicate_rows: number[];
};
export const headers = ['order_id', 'date', 'product', 'quantity', 'unit_price', 'status', 'currency'];
export const MAX_BYTES = 5 * 1024 * 1024;
const MAX_QUANTITY = 900_719_925_474;
const moneyPattern = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/;

function csvRecordEndLines(source: string): number[] {
  const ends: number[] = [];
  let line = 1;
  let recordStart = 0;
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') index += 1;
      else quoted = !quoted;
      continue;
    }
    if (character !== '\n' && character !== '\r') continue;
    const isCrLf = character === '\r' && source[index + 1] === '\n';
    if (!quoted) {
      const record = source.slice(recordStart, index);
      if (record.trim() && Papa.parse<string[]>(record, { skipEmptyLines: 'greedy' }).data.length) ends.push(line);
      recordStart = index + (isCrLf ? 2 : 1);
    }
    if (isCrLf) index += 1;
    line += 1;
  }
  const finalRecord = source.slice(recordStart);
  if (finalRecord.trim() && Papa.parse<string[]>(finalRecord, { skipEmptyLines: 'greedy' }).data.length) ends.push(line);
  return ends;
}
function compareText(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

export function cents(value: string): number { const [whole, fraction = ''] = value.split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0')); }
export function lineAmountCents(line: OrderLine): number { return cents(line.unit_price) * line.quantity; }
function addSafe(total: number, value: number): number {
  const next = total + value;
  if (!Number.isSafeInteger(next)) throw new Error('Report totals exceed the supported safe calculation limit.');
  return next;
}
function money(value: number): string {
  const sign = value < 0 ? '-' : '';
  const absolute = Math.abs(value);
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

export function parseCsv(text: string): { lines: OrderLine[]; duplicateRows: number[] } {
  const source = text.replace(/^\uFEFF/, '');
  if (new TextEncoder().encode(source).byteLength > MAX_BYTES) throw new Error('CSV exceeds the 5 MB upload limit.');
  const rawHeader = Papa.parse<string[]>(source, { preview: 1, skipEmptyLines: true }).data[0] ?? [];
  const normalizedHeaders = rawHeader.map((field) => field.trim());
  const repeatedHeaders = normalizedHeaders.filter((field, index) => normalizedHeaders.indexOf(field) !== index);
  if (repeatedHeaders.length) throw new Error(`Duplicate headers: ${[...new Set(repeatedHeaders)].join(', ')}.`);
  const parsed = Papa.parse<Record<string, string>>(source, { header: true, skipEmptyLines: 'greedy', transformHeader: (h) => h.trim() });
  const recordEndLines = csvRecordEndLines(source);
  if (parsed.errors.length) throw new Error(`Malformed CSV: ${parsed.errors[0]?.message ?? 'Invalid CSV'} near row ${(parsed.errors[0]?.row ?? 0) + 2}.`);
  const fields = parsed.meta.fields ?? [];
  const missing = headers.filter((header) => !fields.includes(header));
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(', ')}.`);
  if (parsed.data.length > 10_000) throw new Error('CSV exceeds the 10,000 data row limit.');
  if (!parsed.data.length) throw new Error('CSV contains no order rows.');
  const issues: Issue[] = [];
  const lines: OrderLine[] = [];
  const fingerprints = new Set<string>();
  const duplicateRows: number[] = [];
  for (const [index, raw] of parsed.data.entries()) {
    const row = recordEndLines[index + 1] ?? index + 2;
    const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, (v ?? '').trim()])) as Record<string, string>;
    if (Object.hasOwn(raw, '__parsed_extra')) issues.push({ row, field: 'row', message: 'Unexpected extra fields without matching headers.' });
    const fingerprint = headers.map((key) => values[key] ?? '').join('\u001f');
    if (fingerprints.has(fingerprint)) duplicateRows.push(row);
    fingerprints.add(fingerprint);
    const fail = (message: string) => issues.push({ row, field: 'row', message });
    if (!values.order_id) { fail('Order ID is required.'); continue; }
    if (!values.product) { fail('Product is required.'); continue; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(Date.parse(`${values.date}T00:00:00Z`)) || new Date(`${values.date}T00:00:00Z`).toISOString().slice(0, 10) !== values.date) { fail('Date must be a real ISO YYYY-MM-DD date.'); continue; }
    if (!/^[1-9]\d*$/.test(values.quantity) || !Number.isSafeInteger(Number(values.quantity)) || Number(values.quantity) > MAX_QUANTITY) { fail('Quantity must be a positive whole number within the safe calculation limit.'); continue; }
    if (!moneyPattern.test(values.unit_price) || !Number.isSafeInteger(cents(values.unit_price))) { fail('Unit price must be a non-negative amount with at most two decimals.'); continue; }
    if (!/^[A-Z]{3}$/.test(values.currency)) { fail('Currency must be a three-letter uppercase code.'); continue; }
    try {
      if (new Intl.NumberFormat('en-US', { style: 'currency', currency: values.currency }).resolvedOptions().maximumFractionDigits !== 2) { fail('Browser demo supports only currencies with two minor-unit digits.'); continue; }
    } catch { fail('Currency must be a supported three-letter currency code.'); continue; }
    if (!['completed', 'refunded', 'cancelled'].includes(values.status)) { fail('Status must be completed, refunded, or cancelled.'); continue; }
    const normalizedPrice = values.unit_price.includes('.') ? values.unit_price.padEnd(values.unit_price.indexOf('.') + 3, '0') : `${values.unit_price}.00`;
    const line: OrderLine = { order_id: values.order_id, date: values.date, product: values.product, quantity: Number(values.quantity), unit_price: normalizedPrice, status: values.status as Status, currency: values.currency };
    if (!Number.isSafeInteger(lineAmountCents(line)) || lineAmountCents(line) > Math.floor(Number.MAX_SAFE_INTEGER / 10_000)) { fail('Line amount exceeds the supported safe calculation limit.'); continue; }
    lines.push(line);
  }
  if (issues.length) throw Object.assign(new Error(`CSV has ${issues.length} invalid row(s).`), { issues });
  if (new Set(lines.map((line) => line.currency)).size !== 1) throw new Error('Mixed currencies are not supported. Analyze one currency at a time.');
  if (!lines.length) throw new Error('CSV contains no order rows.');
  return { lines, duplicateRows };
}

export function calculateReport(lines: OrderLine[], duplicateRows: number[] = []): Report {
  const currency = lines[0]?.currency ?? 'USD';
  const completed = lines.filter((line) => line.status === 'completed');
  const refunded = lines.filter((line) => line.status === 'refunded');
  const total = completed.reduce((sum, line) => addSafe(sum, lineAmountCents(line)), 0);
  const refund = refunded.reduce((sum, line) => addSafe(sum, lineAmountCents(line)), 0);
  const orderIds = new Set(completed.map((line) => line.order_id));
  const months = new Map<string, { completed: number; refunded: number; orders: Set<string> }>();
  const products = new Map<string, { revenue: number; quantity: number; orders: Set<string> }>();
  for (const line of lines) {
    const month = line.date.slice(0, 7);
    const monthly = months.get(month) ?? { completed: 0, refunded: 0, orders: new Set<string>() };
    if (line.status === 'completed') { monthly.completed = addSafe(monthly.completed, lineAmountCents(line)); monthly.orders.add(line.order_id); }
    if (line.status === 'refunded') monthly.refunded = addSafe(monthly.refunded, lineAmountCents(line));
    months.set(month, monthly);
    if (line.status === 'completed') {
      const product = products.get(line.product) ?? { revenue: 0, quantity: 0, orders: new Set<string>() };
      product.revenue = addSafe(product.revenue, lineAmountCents(line)); product.quantity += line.quantity; product.orders.add(line.order_id); products.set(line.product, product);
    }
  }
  return {
    currency, row_count: lines.length, completed_revenue: money(total), refunded_amount: money(refund), net_revenue: money(total - refund),
    completed_orders: orderIds.size, average_order_value: money(orderIds.size ? Math.round(total / orderIds.size) : 0),
    refund_rate_by_value: total ? (() => { const ratio = (BigInt(refund) * 1_000_000n + BigInt(total) / 2n) / BigInt(total); return `${ratio / 1_000_000n}.${String(ratio % 1_000_000n).padStart(6, '0')}`; })() : null,
    monthly: [...months.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, m]) => ({ month, completed_revenue: money(m.completed), refunded_amount: money(m.refunded), net_revenue: money(m.completed - m.refunded), completed_orders: m.orders.size })),
    products: [...products.entries()].sort(([a, x], [b, y]) => y.revenue - x.revenue || compareText(a.toLowerCase(), b.toLowerCase()) || compareText(a, b)).map(([product, p]) => ({ product, completed_revenue: money(p.revenue), quantity: p.quantity, orders: p.orders.size })),
    duplicate_rows: duplicateRows,
  };
}

export function filterLines(lines: OrderLine[], start: string, end: string, status: string, product: string): OrderLine[] {
  return lines.filter((line) => (!start || line.date >= start) && (!end || line.date <= end) && (status === 'all' || line.status === status) && (product === 'all' || line.product === product));
}

export function csvSafe(value: string): string { return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value; }
