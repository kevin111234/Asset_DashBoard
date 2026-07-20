import { describe, it, expect } from 'vitest';
import { simulateScenario } from './engine';
import type { Scenario, FinEvent, Asset } from '../types';

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
      minimumCashAmount: 4_000_000,
      shortTermExpenseMonths: 3,
    },
    assets: [],
    events: [],
    ...overrides,
  };
}

function cashAsset(marketValue: number): Asset {
  return {
    id: 'a1',
    name: '통장',
    type: 'cash',
    principal: marketValue,
    marketValue,
    liquidity: 'immediate',
    includeInAvailableCash: true,
  };
}

describe('simulateScenario', () => {
  it('accumulates simple income/expense into cash balance', () => {
    const events: FinEvent[] = [
      {
        id: 'f1',
        type: 'income',
        name: '급여',
        amount: 2_000_000,
        month: '2026-07',
        active: true,
        recurrence: { frequency: 'monthly', startMonth: '2026-07' },
      },
      {
        id: 'f2',
        type: 'expense',
        name: '생활비',
        amount: 1_000_000,
        month: '2026-07',
        active: true,
        recurrence: { frequency: 'monthly', startMonth: '2026-07' },
      },
    ];
    const scenario = baseScenario({ assets: [cashAsset(1_000_000)], events });
    const result = simulateScenario(scenario);
    expect(result.months).toHaveLength(6);
    expect(result.months[0].endCash).toBe(1_000_000 + 2_000_000 - 1_000_000);
    expect(result.months[1].startCash).toBe(result.months[0].endCash);
    expect(result.months[5].endCash).toBe(1_000_000 + (2_000_000 - 1_000_000) * 6);
  });

  it('treats transfer events as reallocation, not expense (scenario D)', () => {
    const events: FinEvent[] = [
      {
        id: 't1',
        type: 'transfer',
        name: '주식투자',
        amount: 7_000_000,
        month: '2026-07',
        active: true,
        transfer: { kind: 'investment', from: 'cash', to: 'stock' },
      },
    ];
    const scenario = baseScenario({ assets: [cashAsset(10_000_000)], events });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    expect(m0.totalExpense).toBe(0);
    expect(m0.investmentMove).toBe(7_000_000);
    expect(m0.endCash).toBe(3_000_000);
    expect(m0.assetBalances.stock).toBe(7_000_000);
    expect(m0.netWorth).toBe(10_000_000);
    expect(m0.assetTransferNet).toBe(-7_000_000);
  });

  it('computes available cash from fixed minimum-cash amount and upcoming expenses', () => {
    const events: FinEvent[] = [
      {
        id: 'e1',
        type: 'expense',
        name: '예정 장비 구매',
        amount: 2_000_000,
        month: '2026-09',
        active: true,
      },
    ];
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-07',
        forecastMonths: 1,
        minimumCashAmount: 4_000_000,
        shortTermExpenseMonths: 3,
      },
      assets: [cashAsset(15_000_000)],
      events,
    });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    expect(m0.minimumRequiredCash).toBe(4_000_000);
    // availableCash = 1500만 - 400만(최소기준) - 200만(향후 3개월 내 예정지출) = 900만
    expect(m0.availableCash).toBe(9_000_000);
  });

  it('reflects loan proceeds and bullet repayment in cash flow', () => {
    const events: FinEvent[] = [
      {
        id: 'loan1',
        type: 'loan',
        name: '보증금 대출',
        amount: 3_500_000,
        month: '2026-10',
        active: true,
        loan: { annualRate: 0.013, repaymentType: 'bullet', maturityMonth: '2028-09' },
      },
    ];
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-10',
        forecastMonths: 2,
        minimumCashAmount: 0,
        shortTermExpenseMonths: 0,
      },
      events,
    });
    const result = simulateScenario(scenario);
    const m0 = result.months[0];
    expect(m0.loanProceeds).toBe(3_500_000);
    expect(m0.endCash).toBeCloseTo(3_500_000 - (3_500_000 * 0.013) / 12, 1);
    expect(m0.loanBalance).toBe(3_500_000);
    expect(m0.loanNetChange).toBeCloseTo(3_500_000 - (3_500_000 * 0.013) / 12, 1);
  });

  it('flags critical status when cash goes negative', () => {
    const events: FinEvent[] = [
      { id: 'e1', type: 'expense', name: '큰 지출', amount: 5_000_000, month: '2026-07', active: true },
    ];
    const scenario = baseScenario({ assets: [cashAsset(1_000_000)], events });
    const result = simulateScenario(scenario);
    expect(result.months[0].endCash).toBeLessThan(0);
    expect(result.months[0].status).toBe('critical');
  });

  it('yearly recurrence fires only in the matching month each year', () => {
    const events: FinEvent[] = [
      {
        id: 'bonus',
        type: 'income',
        name: '연말 상여금',
        amount: 1_000_000,
        month: '2026-12',
        active: true,
        recurrence: { frequency: 'yearly', startMonth: '2026-12' },
      },
    ];
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-11',
        forecastMonths: 14,
        minimumCashAmount: 0,
        shortTermExpenseMonths: 0,
      },
      events,
    });
    const result = simulateScenario(scenario);
    const decMonths = result.months.filter((m) => m.month.endsWith('-12'));
    expect(decMonths).toHaveLength(2);
    for (const m of decMonths) expect(m.totalIncome).toBe(1_000_000);
    const nonDecWithIncome = result.months.filter((m) => !m.month.endsWith('-12') && m.totalIncome > 0);
    expect(nonDecWithIncome).toHaveLength(0);
  });

  it('per-month exceptions can skip or override a single occurrence', () => {
    const events: FinEvent[] = [
      {
        id: 'rent',
        type: 'expense',
        name: '월세',
        amount: 500_000,
        month: '2026-07',
        active: true,
        recurrence: {
          frequency: 'monthly',
          startMonth: '2026-07',
          exceptions: {
            '2026-08': { active: false }, // skip August entirely
            '2026-09': { amount: 700_000 }, // one-off higher amount in September
          },
        },
      },
    ];
    const scenario = baseScenario({
      settings: {
        baseCurrency: 'KRW',
        startMonth: '2026-07',
        forecastMonths: 3,
        minimumCashAmount: 0,
        shortTermExpenseMonths: 0,
      },
      events,
    });
    const result = simulateScenario(scenario);
    expect(result.months[0].totalExpense).toBe(500_000);
    expect(result.months[1].totalExpense).toBe(0);
    expect(result.months[2].totalExpense).toBe(700_000);
  });

  it('inactive events (and inactive loans) are fully excluded from the simulation', () => {
    const events: FinEvent[] = [
      { id: 'nas', type: 'expense', name: 'NAS', amount: 1_000_000, month: '2026-07', active: false },
      {
        id: 'loan1',
        type: 'loan',
        name: '보증금 대출',
        amount: 3_500_000,
        month: '2026-07',
        active: false,
        loan: { annualRate: 0.013, repaymentType: 'bullet', maturityMonth: '2028-06' },
      },
    ];
    const scenario = baseScenario({ assets: [cashAsset(1_000_000)], events });
    const result = simulateScenario(scenario);
    expect(result.months[0].endCash).toBe(1_000_000);
    expect(result.months[0].loanBalance).toBe(0);
  });
});
