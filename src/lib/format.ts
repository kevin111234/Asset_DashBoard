export function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

export function formatWonSigned(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toLocaleString('ko-KR')}원`;
}

/** Compact 만원 unit display for chart axes / tight spaces. */
export function formatManwon(n: number): string {
  const man = Math.round(n / 10_000);
  return `${man.toLocaleString('ko-KR')}만`;
}

export function formatPercent(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits)}%`;
}
