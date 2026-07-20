import type { YearMonth } from '../types';

export function parseYm(ym: YearMonth): { year: number; month: number } {
  const [y, m] = ym.split('-').map(Number);
  return { year: y, month: m };
}

/** absolute month index, useful for comparisons/arithmetic */
export function ymIndex(ym: YearMonth): number {
  const { year, month } = parseYm(ym);
  return year * 12 + (month - 1);
}

export function indexToYm(index: number): YearMonth {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  return indexToYm(ymIndex(ym) + delta);
}

export function ymCompare(a: YearMonth, b: YearMonth): number {
  return ymIndex(a) - ymIndex(b);
}

export function ymInRange(ym: YearMonth, start: YearMonth, end?: YearMonth): boolean {
  if (ymCompare(ym, start) < 0) return false;
  if (end && ymCompare(ym, end) > 0) return false;
  return true;
}

export function formatYmKorean(ym: YearMonth): string {
  const { year, month } = parseYm(ym);
  return `${year}년 ${month}월`;
}

export function generateMonthRange(start: YearMonth, count: number): YearMonth[] {
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

export function monthOfYear(ym: YearMonth): number {
  return parseYm(ym).month;
}

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
