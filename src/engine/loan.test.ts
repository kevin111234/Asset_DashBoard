import { describe, it, expect } from 'vitest';
import { buildLoanSchedule, totalInterest } from './loan';
import type { LoanScheduleInput } from './loan';

describe('buildLoanSchedule', () => {
  it('bullet: interest-only until maturity, principal repaid in final month', () => {
    const loan: LoanScheduleInput = {
      principal: 3_500_000,
      annualRate: 0.013,
      startMonth: '2026-10',
      repaymentType: 'bullet',
      termMonths: 24,
    };
    const schedule = buildLoanSchedule(loan);
    expect(schedule.size).toBe(24);
    const first = schedule.get('2026-10')!;
    expect(first.proceeds).toBe(3_500_000);
    expect(first.principalPayment).toBe(0);
    expect(first.interest).toBeCloseTo((3_500_000 * 0.013) / 12, 1);
    const last = schedule.get('2028-09')!;
    expect(last.balanceAfter).toBe(0);
    expect(last.principalPayment).toBe(3_500_000);
  });

  it('manual: stops once balance clears with fixed payment', () => {
    const loan: LoanScheduleInput = {
      principal: 1_000_000,
      annualRate: 0.1,
      startMonth: '2026-01',
      repaymentType: 'manual',
      termMonths: 24,
      manualMonthlyPayment: 100_000,
    };
    const schedule = buildLoanSchedule(loan);
    expect(schedule.size).toBeLessThan(24);
    const entries = Array.from(schedule.values());
    expect(entries[entries.length - 1].balanceAfter).toBe(0);
  });

  it('totalInterest sums interest across schedule', () => {
    const loan: LoanScheduleInput = {
      principal: 1_000_000,
      annualRate: 0.12,
      startMonth: '2026-01',
      repaymentType: 'bullet',
      termMonths: 12,
    };
    const schedule = buildLoanSchedule(loan);
    expect(totalInterest(schedule)).toBeGreaterThan(0);
  });
});
