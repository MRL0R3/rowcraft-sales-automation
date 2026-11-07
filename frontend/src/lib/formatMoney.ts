/** Format integer minor units without converting the fractional amount to a float. */
export function formatCents(value: number, currency: string): string {
  if (!Number.isSafeInteger(value)) throw new Error('Money amount exceeds the safe display limit.');
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute / 100);
  const symbolAndWhole = new Intl.NumberFormat('en-US', {
    style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(whole);
  return `${value < 0 ? '-' : ''}${symbolAndWhole}.${String(absolute % 100).padStart(2, '0')}`;
}

export function formatMoney(value: string, currency: string): string {
  if (!/^-?\d+\.\d{2}$/.test(value)) throw new Error('Expected a two-decimal money amount.');
  const negative = value.startsWith('-');
  const [whole, fraction] = (negative ? value.slice(1) : value).split('.');
  const cents = Number(whole) * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents)) throw new Error('Money amount exceeds the safe display limit.');
  return formatCents(negative ? -cents : cents, currency);
}
