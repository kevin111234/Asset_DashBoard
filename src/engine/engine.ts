import type {
  Scenario,
  CashFlowItem,
  TransferItem,
  MonthlyResult,
  MonthlyEvent,
  SimulationResult,
  BucketKey,
  WarningStatus,
} from '../types';
import { assetBucketKey } from '../types';
import { addMonths, generateMonthRange, ymInRange, ymIndex } from './month';
import { buildLoanSchedule, type LoanSchedule } from './loan';

const ALL_BUCKETS: BucketKey[] = [
  'cash',
  'time_deposit',
  'stock',
  'etf',
  'bond',
  'crypto',
  'government_savings',
  'deposit',
  'other',
];

function isActive(startMonth: string, endMonth: string | undefined, recurrence: string, month: string): boolean {
  if (recurrence === 'once') return startMonth === month;
  return ymInRange(month, startMonth, endMonth);
}

const CATEGORY_LABEL: Record<string, string> = {
  salary: '급여',
  part_time: '아르바이트',
  bonus: '상여금',
  refund: '환급금',
  investment_return: '투자수익',
  loan_proceeds: '대출 실행',
  asset_sale: '자산 매각',
  other_income: '기타 수입',
  living: '생활비',
  rent: '월세',
  maintenance_fee: '관리비',
  communication: '통신비',
  insurance: '보험료',
  transportation: '교통비',
  food: '식비',
  equipment: '장비 구매',
  gift: '선물',
  education: '교육비',
  project: '프로젝트 비용',
  tax: '세금',
  loan_repayment: '대출 상환',
  other_expense: '기타 지출',
};

export function categoryLabel(category: string): string {
  return CATEGORY_LABEL[category] ?? category;
}

export function simulateScenario(scenario: Scenario): SimulationResult {
  const { settings } = scenario;
  const months = generateMonthRange(settings.startMonth, settings.forecastMonths);

  // Initialize bucket balances from registered assets.
  const bucketBalances: Record<BucketKey, number> = Object.fromEntries(
    ALL_BUCKETS.map((b) => [b, 0]),
  ) as Record<BucketKey, number>;
  for (const asset of scenario.assets) {
    const key = assetBucketKey(asset.type);
    bucketBalances[key] += asset.marketValue;
  }

  const loanSchedules: { loan: Scenario['loans'][number]; schedule: LoanSchedule }[] =
    scenario.loans.map((loan) => ({ loan, schedule: buildLoanSchedule(loan) }));

  const minimumRequiredCash =
    settings.monthlyEssentialLiving * settings.livingReserveMonths + settings.emergencyFund;

  const results: MonthlyResult[] = [];

  for (const month of months) {
    const startCash = bucketBalances.cash;
    const events: MonthlyEvent[] = [];

    let totalIncome = 0;
    let totalExpense = 0;
    for (const item of scenario.cashFlows) {
      if (!isActive(item.startMonth, item.endMonth, item.recurrence, month)) continue;
      if (item.type === 'income') {
        totalIncome += item.amount;
      } else {
        totalExpense += item.amount;
      }
      events.push({
        label: item.name,
        amount: item.type === 'income' ? item.amount : -item.amount,
        kind: item.type,
      });
    }

    let savingsMove = 0;
    let investmentMove = 0;
    for (const t of scenario.transfers) {
      if (!isActive(t.startMonth, t.endMonth, t.recurrence, month)) continue;
      bucketBalances[t.from] -= t.amount;
      bucketBalances[t.to] += t.amount;
      if (t.kind === 'saving') savingsMove += t.amount;
      else investmentMove += t.amount;
      events.push({ label: t.name, amount: -t.amount, kind: 'transfer' });
    }

    let loanInterest = 0;
    let loanPrincipalPayment = 0;
    let loanProceeds = 0;
    for (const { loan, schedule } of loanSchedules) {
      const entry = schedule.get(month);
      if (!entry) continue;
      loanInterest += entry.interest;
      loanPrincipalPayment += entry.principalPayment;
      bucketBalances.cash -= entry.payment;
      if (entry.proceeds > 0) {
        loanProceeds += entry.proceeds;
        const target = loan.proceedsTo ?? 'cash';
        bucketBalances[target] += entry.proceeds;
        events.push({ label: `${loan.name} 실행`, amount: entry.proceeds, kind: 'loan' });
      }
      if (entry.payment > 0) {
        events.push({ label: `${loan.name} 상환`, amount: -entry.payment, kind: 'loan' });
      }
    }
    const loanRepaymentTotal = loanInterest + loanPrincipalPayment;

    // apply plain cash income/expense last (transfers & loans already mutated bucketBalances.cash directly where relevant)
    bucketBalances.cash += totalIncome - totalExpense;

    const endCash = bucketBalances.cash;

    const upcomingShortTermExpenses = sumUpcomingExpenses(
      scenario.cashFlows,
      month,
      settings.shortTermExpenseMonths,
    );

    const availableCash = endCash - minimumRequiredCash - upcomingShortTermExpenses;
    const investableAmount = Math.max(0, availableCash) * settings.investmentAllocationRate;

    const loanBalance = loanSchedules.reduce((sum, { schedule }) => {
      const entry = schedule.get(month);
      return sum + (entry ? entry.balanceAfter : 0);
    }, 0);

    const nonCashAssetTotal = ALL_BUCKETS.filter((b) => b !== 'cash').reduce(
      (sum, b) => sum + bucketBalances[b],
      0,
    );
    const netWorth = endCash + nonCashAssetTotal - loanBalance;

    const status = computeStatus(endCash, minimumRequiredCash, startCash + totalIncome, totalExpense + loanRepaymentTotal);

    results.push({
      month,
      startCash,
      totalIncome,
      totalExpense,
      savingsMove,
      investmentMove,
      loanProceeds,
      loanInterest,
      loanPrincipalPayment,
      loanRepaymentTotal,
      endCash,
      minimumRequiredCash,
      availableCash,
      nonCashAssetTotal,
      loanBalance,
      netWorth,
      investableAmount,
      status,
      events,
      assetBalances: { ...bucketBalances },
    });
  }

  return { months: results };
}

function sumUpcomingExpenses(cashFlows: CashFlowItem[], fromMonth: string, windowMonths: number): number {
  if (windowMonths <= 0) return 0;
  const startIdx = ymIndex(fromMonth) + 1;
  const endIdx = ymIndex(fromMonth) + windowMonths;
  let sum = 0;
  for (let idx = startIdx; idx <= endIdx; idx++) {
    const m = addMonths(fromMonth, idx - ymIndex(fromMonth));
    for (const item of cashFlows) {
      if (item.type !== 'expense') continue;
      if (isActive(item.startMonth, item.endMonth, item.recurrence, m)) {
        sum += item.amount;
      }
    }
  }
  return sum;
}

function computeStatus(
  endCash: number,
  minimumRequiredCash: number,
  cashAvailableForExpense: number,
  requiredOutflow: number,
): WarningStatus {
  if (endCash < 0 || cashAvailableForExpense < requiredOutflow) return 'critical';
  if (endCash <= minimumRequiredCash) return 'danger';
  if (endCash <= minimumRequiredCash * 1.2) return 'caution';
  return 'normal';
}

export function findTransferEndpointsUsed(transfers: TransferItem[]): BucketKey[] {
  const set = new Set<BucketKey>();
  for (const t of transfers) {
    set.add(t.from);
    set.add(t.to);
  }
  return Array.from(set);
}

export { ALL_BUCKETS };
