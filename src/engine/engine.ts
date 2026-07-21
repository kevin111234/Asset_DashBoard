import type {
  Asset,
  Scenario,
  FinEvent,
  MonthlyResult,
  MonthlyLedgerLine,
  SimulationResult,
  BucketKey,
  WarningStatus,
  YearMonth,
} from '../types';
import { assetBucketKey } from '../types';
import { addMonths, generateMonthRange, ymInRange, ymIndex, monthOfYear } from './month';
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

interface Occurrence {
  active: boolean;
  amount: number;
}

/**
 * Per-bucket annual return rate, as the marketValue-weighted average of the
 * expectedReturnRate of the assets that seed that bucket. Buckets with no
 * rate-bearing assets (or no assets at all) default to 0 — money moved into
 * them later via transfers doesn't retroactively pick up a rate, this is a
 * simplification appropriate for a personal planning tool.
 */
function computeBucketReturnRates(assets: Asset[]): Partial<Record<BucketKey, number>> {
  const weightedSum: Partial<Record<BucketKey, number>> = {};
  const weightTotal: Partial<Record<BucketKey, number>> = {};
  for (const asset of assets) {
    if (!asset.expectedReturnRate) continue;
    const bucket = assetBucketKey(asset);
    if (bucket === 'cash') continue;
    const weight = Math.max(0, asset.marketValue);
    weightedSum[bucket] = (weightedSum[bucket] ?? 0) + asset.expectedReturnRate * weight;
    weightTotal[bucket] = (weightTotal[bucket] ?? 0) + weight;
  }
  const rates: Partial<Record<BucketKey, number>> = {};
  for (const bucket of Object.keys(weightTotal) as BucketKey[]) {
    const total = weightTotal[bucket]!;
    if (total > 0) rates[bucket] = weightedSum[bucket]! / total;
  }
  return rates;
}

/** Resolves whether an event fires in `month`, and at what amount, honoring
 * the active flag, recurrence window/frequency, and per-month exceptions. */
export function resolveOccurrence(event: FinEvent, month: YearMonth): Occurrence {
  if (!event.active) return { active: false, amount: 0 };

  if (!event.recurrence) {
    return event.month === month ? { active: true, amount: event.amount } : { active: false, amount: 0 };
  }

  const rec = event.recurrence;
  const exception = rec.exceptions?.[month];
  if (exception?.active === false) return { active: false, amount: 0 };
  if (!ymInRange(month, rec.startMonth, rec.endMonth)) return { active: false, amount: 0 };
  if (rec.frequency === 'yearly' && monthOfYear(month) !== monthOfYear(rec.startMonth)) {
    return { active: false, amount: 0 };
  }
  return { active: true, amount: exception?.amount ?? event.amount };
}

export function simulateScenario(scenario: Scenario): SimulationResult {
  const { settings } = scenario;
  const months = generateMonthRange(settings.startMonth, settings.forecastMonths);

  const bucketBalances: Record<BucketKey, number> = Object.fromEntries(
    ALL_BUCKETS.map((b) => [b, 0]),
  ) as Record<BucketKey, number>;
  for (const asset of scenario.assets) {
    bucketBalances[assetBucketKey(asset)] += asset.marketValue;
  }
  const bucketReturnRates = computeBucketReturnRates(scenario.assets);
  const bucketMonthlyRates: Partial<Record<BucketKey, number>> = {};
  for (const bucket of Object.keys(bucketReturnRates) as BucketKey[]) {
    bucketMonthlyRates[bucket] = Math.pow(1 + bucketReturnRates[bucket]!, 1 / 12) - 1;
  }

  const loanSchedules: { event: FinEvent; schedule: LoanSchedule }[] = scenario.events
    .filter((e) => e.type === 'loan' && e.loan)
    .map((event) => {
      const loan = event.loan!;
      const termMonths = Math.max(1, ymIndex(loan.maturityMonth) - ymIndex(event.month) + 1);
      return {
        event,
        schedule: buildLoanSchedule({
          principal: event.amount,
          annualRate: loan.annualRate,
          startMonth: event.month,
          repaymentType: loan.repaymentType,
          termMonths,
          manualMonthlyPayment: loan.manualMonthlyPayment,
        }),
      };
    });

  const minimumRequiredCash = settings.minimumCashAmount;
  const results: MonthlyResult[] = [];

  for (const month of months) {
    const startCash = bucketBalances.cash;
    const ledger: MonthlyLedgerLine[] = [];

    let totalIncome = 0;
    let totalExpense = 0;
    let savingsMove = 0;
    let investmentMove = 0;
    let assetTransferNet = 0;

    for (const event of scenario.events) {
      if (event.type === 'loan') continue;
      const occ = resolveOccurrence(event, month);
      if (!occ.active) continue;

      if (event.type === 'income') {
        totalIncome += occ.amount;
        ledger.push({ label: event.name, amount: occ.amount, kind: 'income', eventId: event.id });
      } else if (event.type === 'expense') {
        totalExpense += occ.amount;
        ledger.push({ label: event.name, amount: -occ.amount, kind: 'expense', eventId: event.id });
      } else if (event.type === 'transfer' && event.transfer) {
        // a %-based sell always draws on the bucket's *actual* balance at
        // execution time, ignoring the event's static amount — so "전체 매도"
        // stays correct no matter how much the position has grown or shrunk.
        const pct = event.transfer.sellPercentage;
        const transferAmount =
          pct !== undefined
            ? Math.round(bucketBalances[event.transfer.from] * (Math.max(0, Math.min(100, pct)) / 100))
            : occ.amount;
        bucketBalances[event.transfer.from] -= transferAmount;
        bucketBalances[event.transfer.to] += transferAmount;
        if (event.transfer.to === 'cash') assetTransferNet += transferAmount;
        if (event.transfer.from === 'cash') assetTransferNet -= transferAmount;
        if (event.transfer.kind === 'saving') savingsMove += transferAmount;
        else if (event.transfer.kind === 'investment') investmentMove += transferAmount;
        ledger.push({ label: event.name, amount: -transferAmount, kind: 'transfer', eventId: event.id });
      }
    }

    let loanInterest = 0;
    let loanPrincipalPayment = 0;
    let loanProceeds = 0;
    let loanCashDelta = 0;
    for (const { event, schedule } of loanSchedules) {
      if (!event.active) continue;
      const entry = schedule.get(month);
      if (!entry) continue;
      loanInterest += entry.interest;
      loanPrincipalPayment += entry.principalPayment;
      bucketBalances.cash -= entry.payment;
      loanCashDelta -= entry.payment;
      if (entry.proceeds > 0) {
        loanProceeds += entry.proceeds;
        const target = event.loan!.proceedsTo ?? 'cash';
        bucketBalances[target] += entry.proceeds;
        if (target === 'cash') loanCashDelta += entry.proceeds;
        ledger.push({ label: `${event.name} 실행`, amount: entry.proceeds, kind: 'loan', eventId: event.id });
      }
      if (entry.payment > 0) {
        ledger.push({ label: `${event.name} 상환`, amount: -entry.payment, kind: 'loan', eventId: event.id });
      }
    }
    const loanRepaymentTotal = loanInterest + loanPrincipalPayment;

    bucketBalances.cash += totalIncome - totalExpense;
    const endCash = bucketBalances.cash;

    const upcomingShortTermExpenses = sumUpcomingExpenses(scenario.events, month, settings.shortTermExpenseMonths);
    const availableCash = endCash - minimumRequiredCash - upcomingShortTermExpenses;

    const loanBalance = loanSchedules.reduce((sum, { event, schedule }) => {
      if (!event.active) return sum;
      const entry = schedule.get(month);
      return sum + (entry ? entry.balanceAfter : 0);
    }, 0);

    // month-end mark-to-market: non-cash buckets grow/shrink by their blended
    // expected return rate. This changes net worth but never touches cash —
    // gains only become spendable once a transfer event sells them back to cash.
    let investmentGrowth = 0;
    const bucketGrowth: Partial<Record<BucketKey, number>> = {};
    for (const bucket of ALL_BUCKETS) {
      if (bucket === 'cash') continue;
      const monthlyRate = bucketMonthlyRates[bucket];
      if (!monthlyRate) continue;
      const growth = Math.round(bucketBalances[bucket] * monthlyRate);
      bucketBalances[bucket] += growth;
      investmentGrowth += growth;
      bucketGrowth[bucket] = growth;
    }

    const nonCashAssetTotal = ALL_BUCKETS.filter((b) => b !== 'cash').reduce((sum, b) => sum + bucketBalances[b], 0);
    const netWorth = endCash + nonCashAssetTotal - loanBalance;

    const status = computeStatus(endCash, minimumRequiredCash);

    results.push({
      month,
      startCash,
      totalIncome,
      totalExpense,
      savingsMove,
      investmentMove,
      assetTransferNet,
      loanProceeds,
      loanInterest,
      loanPrincipalPayment,
      loanRepaymentTotal,
      loanNetChange: loanCashDelta,
      endCash,
      minimumRequiredCash,
      availableCash,
      nonCashAssetTotal,
      loanBalance,
      netWorth,
      investmentGrowth,
      bucketGrowth,
      status,
      events: ledger,
      assetBalances: { ...bucketBalances },
    });
  }

  return { months: results };
}

function sumUpcomingExpenses(events: FinEvent[], fromMonth: YearMonth, windowMonths: number): number {
  if (windowMonths <= 0) return 0;
  let sum = 0;
  for (let i = 1; i <= windowMonths; i++) {
    const m = addMonths(fromMonth, i);
    for (const event of events) {
      if (event.type !== 'expense') continue;
      const occ = resolveOccurrence(event, m);
      if (occ.active) sum += occ.amount;
    }
  }
  return sum;
}

function computeStatus(endCash: number, minimumRequiredCash: number): WarningStatus {
  if (endCash < 0) return 'critical';
  if (endCash <= minimumRequiredCash) return 'danger';
  if (endCash <= minimumRequiredCash * 1.2) return 'caution';
  return 'normal';
}

export { ALL_BUCKETS };
