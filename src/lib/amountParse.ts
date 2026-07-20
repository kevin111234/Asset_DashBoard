/**
 * Parses flexible Korean amount shorthand into a plain number of won.
 * Accepts: "80만", "80만원", "800000", "800,000", "1억500만" 등.
 * Returns null when nothing parseable was found.
 */
export function parseAmountInput(raw: string): number | null {
  if (!raw) return null;
  let s = raw.trim().replace(/,/g, '').replace(/원/g, '');
  if (s === '') return null;

  let total = 0;
  let matched = false;

  const eokMatch = s.match(/^([\d.]+)억(.*)$/);
  if (eokMatch) {
    total += parseFloat(eokMatch[1]) * 100_000_000;
    s = eokMatch[2];
    matched = true;
  }

  const manMatch = s.match(/^([\d.]+)만(.*)$/);
  if (manMatch) {
    total += parseFloat(manMatch[1]) * 10_000;
    s = manMatch[2];
    matched = true;
  }

  const rest = s.trim();
  if (rest !== '') {
    const n = parseFloat(rest);
    if (!Number.isNaN(n)) {
      total += n;
      matched = true;
    }
  }

  if (!matched || Number.isNaN(total)) return null;
  return Math.round(total);
}
