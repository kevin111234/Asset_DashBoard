import { describe, it, expect } from 'vitest';
import { simulateScenario } from './engine';
import type { Scenario } from '../types';

function baseScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: 's1',
    name: 'test',
    isDefault: true,
    createdAt: new Date().toISOString(),
    settings: {
      baseCurrency: 'KRW',
      startMonth: '2026-07',
      forecastMonths: 6,
      monthlyEssentialLiving: 1_000_000,
      livingReserveMonths: 3,
      emergencyFund: 1_000_000,
      shortTermExpenseMonths: 3,
      investmentAllocationRate: 0.5,
    },
    assets: [],
    cashFlows: [],
    transfers: [],
    loans: [],
    ...overrides,
  };
}

describe('simulateScenario', () => {
  it('accumulates simple income/expense into cash balance', () => {
    const scenario = baseScenario({
      assets: [
        { id: 'a1', name: '통장', type: 'cash', principal: 1_000_000, marketValue: 1_000_000, liquidity: 'immediate' },
      ],
      cashFlows: [
        { id: 'f1', name: '급여', type: 'income', category: 'salary', amount: 2_000_000, startMonth: '2026-07', recurrence: 'monthly' },
        { id: 'f2', name: '생활비', type: 'expense', category: 'living', amount: 1_000_000, startMonth: '2026-07', recurrence: 'monthly' },
      ],
    });
    const result = simulateScenario(scenario);
    expect(result.months).toHaveLength(6);
    expect(result.months[0].endCash).toBe(1_000_000 + 2_000_000 - 1_000_000);
    expect(result.months[1].startCash).toBe(result.months[0].endCash);
    expect(result.months[5].endCash).toBe(1_000_000 + (2_000_000 - 1_000_000) * 6);
  });

  it('treats savings/investment transfers as reallocation, not expense (scenario D)', () => {
    const scenario = baseScenario({
      assets: [
        { id: 'a1', name: '통장', type: 'cash', principal: 10_000_000, marketValue: 10_000_000, liquidity: 'immediate' },
      ],
      transfers: [
        { id: 't1', name: '주식투자', kind: 'investment', from: 'cash', to: 'stock', amount: 7_000_000, startMonth: '2026-07', recurrence: 'once' },
      ],
    });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    expect(m0.totalExpense).toBe(0);
    expect(m0.investmentMove).toBe(7_000_000);
    expect(m0.endCash).toBe(3_000_000);
    expect(m0.assetBalances.stock).toBe(7_000_000);
    // net worth unaffected by the reallocation itself
    expect(m0.netWorth).toBe(10_000_000);
  });

  it('computes available cash per spec section 6.2 example', () => {
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-07',
        forecastMonths: 1,
        monthlyEssentialLiving: 1_000_000,
        livingReserveMonths: 3,
        emergencyFund: 1_000_000,
        shortTermExpenseMonths: 3,
        investmentAllocationRate: 1,
      },
      assets: [
        { id: 'a1', name: '통장', type: 'cash', principal: 15_000_000, marketValue: 15_000_000, liquidity: 'immediate' },
      ],
      cashFlows: [
        { id: 'e1', name: '예정 장비 구매', type: 'expense', category: 'equipment', amount: 2_000_000, startMonth: '2026-09', recurrence: 'once' },
      ],
    });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    // minimumRequiredCash = 100만*3 + 100만 = 400만
    expect(m0.minimumRequiredCash).toBe(4_000_000);
    // availableCash = 1500만 - 400만 - 200만(향후 3개월 내 예정지출) = 900만
    expect(m0.availableCash).toBe(9_000_000);
  });

  it('reflects loan proceeds and bullet repayment in cash flow', () => {
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-10',
        forecastMonths: 2,
        monthlyEssentialLiving: 0,
        livingReserveMonths: 0,
        emergencyFund: 0,
        shortTermExpenseMonths: 0,
        investmentAllocationRate: 0.5,
      },
      loans: [
        { id: 'loan1', name: '보증금 대출', principal: 3_500_000, annualRate: 0.013, startMonth: '2026-10', repaymentType: 'bullet', termMonths: 24 },
      ],
    });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    expect(m0.loanProceeds).toBe(3_500_000);
    expect(m0.endCash).toBeCloseTo(3_500_000 - (3_500_000 * 0.013) / 12, 1);
    expect(m0.loanBalance).toBe(3_500_000);
  });

  it('flags danger/critical status when cash falls below minimum or negative', () => {
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-07',
        forecastMonths: 2,
        monthlyEssentialLiving: 1_000_000,
        livingReserveMonths: 3,
        emergencyFund: 0,
        shortTermExpenseMonths: 0,
        investmentAllocationRate: 0.5,
      },
      assets: [
        { id: 'a1', name: '통장', type: 'cash', principal: 1_000_000, marketValue: 1_000_000, liquidity: 'immediate' },
      ],
      cashFlows: [
        { id: 'e1', name: '큰 지출', type: 'expense', category: 'other_expense', amount: 5_000_000, startMonth: '2026-07', recurrence: 'once' },
      ],
    });
    const result = simulateScenario(scenario);
    expect(result.months[0].endCash).toBeLessThan(0);
    expect(result.months[0].status).toBe('critical');
  });
});
