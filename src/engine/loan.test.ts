import { describe, it, expect } from 'vitest';
import { buildLoanSchedule, totalInterest } from './loan';
import type { Loan } from '../types';

describe('buildLoanSchedule', () => {
  it('bullet: interest-only until maturity, principal repaid in final month', () => {
    const loan: Loan = {
      id: 'l1',
      name: '보증금 대출',
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

  it('equal_payment: fixed payment amount, balance hits zero at term end', () => {
    const loan: Loan = {
      id: 'l2',
      name: '원리금균등',
      principal: 12_000_000,
      annualRate: 0.05,
      startMonth: '2026-01',
      repaymentType: 'equal_payment',
      termMonths: 12,
    };
    const schedule = buildLoanSchedule(loan);
    const payments = Array.from(schedule.values()).map((e) => e.payment);
    const maxPay = Math.max(...payments);
    const minPay = Math.min(...payments);
    expect(maxPay - minPay).toBeLessThan(50); // rounding only
    const last = schedule.get('2026-12')!;
    expect(last.balanceAfter).toBe(0);
  });

  it('equal_principal: principal portion constant, payment decreases over time', () => {
    const loan: Loan = {
      id: 'l3',
      name: '원금균등',
      principal: 12_000_000,
      annualRate: 0.05,
      startMonth: '2026-01',
      repaymentType: 'equal_principal',
      termMonths: 12,
    };
    const schedule = buildLoanSchedule(loan);
    const entries = Array.from(schedule.values());
    expect(entries[0].payment).toBeGreaterThan(entries[entries.length - 1].payment);
    expect(entries[entries.length - 1].balanceAfter).toBe(0);
    for (const e of entries) {
      expect(e.principalPayment).toBeCloseTo(1_000_000, 0);
    }
  });

  it('manual: stops once balance clears with fixed payment', () => {
    const loan: Loan = {
      id: 'l4',
      name: '직접입력',
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
    const loan: Loan = {
      id: 'l5',
      name: 'x',
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
