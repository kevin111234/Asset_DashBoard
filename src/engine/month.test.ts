import { describe, it, expect } from 'vitest';
import { addMonths, generateMonthRange, ymCompare, ymIndex, formatYmKorean } from './month';

describe('month utils', () => {
  it('addMonths rolls over year boundary', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('generateMonthRange produces consecutive months', () => {
    expect(generateMonthRange('2026-07', 4)).toEqual(['2026-07', '2026-08', '2026-09', '2026-10']);
  });

  it('ymCompare / ymIndex are consistent with ordering', () => {
    expect(ymCompare('2026-07', '2026-08')).toBeLessThan(0);
    expect(ymIndex('2027-01') - ymIndex('2026-12')).toBe(1);
  });

  it('formats Korean year-month', () => {
    expect(formatYmKorean('2027-03')).toBe('2027년 3월');
  });
});
