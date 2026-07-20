// Core domain model for Asset Planning Dashboard
// Months are represented as "YYYY-MM" strings throughout.

export type YearMonth = string; // "YYYY-MM"

export type AssetType =
  | 'cash'
  | 'checking'
  | 'time_deposit'
  | 'parking'
  | 'stock'
  | 'etf'
  | 'bond'
  | 'crypto'
  | 'government_savings'
  | 'deposit'
  | 'other';

/** 즉시 사용 가능 / 일부 제한 / 만기 후 사용 가능 / 장기 자산 */
export type Liquidity = 'immediate' | 'partial' | 'after_maturity' | 'locked';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  /** 원금 */
  principal: number;
  /** 현재 평가금액 */
  marketValue: number;
  liquidity: Liquidity;
  /** 가용현금 계산에 포함할지 여부. 기본은 즉시 사용 가능 자산만 true. */
  includeInAvailableCash: boolean;
  /** 연 기대수익률(가격변동률). 이 자산이 속한 버킷 전체의 월별 평가손익 계산에 반영된다. */
  expectedReturnRate?: number;
  note?: string;
}

/**
 * Simulation buckets. 'cash'/'checking'/'parking' assets (and any asset
 * explicitly marked includeInAvailableCash) pool into the single 'cash'
 * bucket (보유 현금); every other asset type is tracked as its own bucket
 * total. Events move money between these buckets.
 */
export type BucketKey =
  | 'cash'
  | 'time_deposit'
  | 'stock'
  | 'etf'
  | 'bond'
  | 'crypto'
  | 'government_savings'
  | 'deposit'
  | 'other';

function nativeAssetTypeBucket(type: AssetType): BucketKey {
  if (type === 'cash' || type === 'checking' || type === 'parking') return 'cash';
  return type;
}

export function assetBucketKey(asset: Asset): BucketKey {
  const native = nativeAssetTypeBucket(asset.type);
  if (asset.includeInAvailableCash && native !== 'cash') return 'cash';
  return native;
}

// ---------------------------------------------------------------------------
// Events — the single unified input unit (기획서 4.1).
// ---------------------------------------------------------------------------

export type EventType = 'income' | 'expense' | 'transfer' | 'loan';

export type RecurrenceFrequency = 'monthly' | 'yearly';

export interface EventException {
  /** false => skip this month's occurrence entirely (해당 월 예외 삭제) */
  active?: boolean;
  /** override amount for just this month (이번 달만 수정) */
  amount?: number;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  startMonth: YearMonth;
  /** omit/undefined = 무기한 */
  endMonth?: YearMonth;
  /** per-occurrence overrides keyed by YearMonth */
  exceptions?: Record<YearMonth, EventException>;
}

export type TransferKind = 'saving' | 'investment' | 'other';

export interface TransferDetails {
  kind: TransferKind;
  from: BucketKey;
  to: BucketKey;
}

/** MVP supports only 만기일시상환(bullet) and 직접 월 상환액 입력(manual). */
export type LoanRepaymentType = 'bullet' | 'manual';

export interface LoanDetails {
  annualRate: number; // e.g. 0.013 for 1.3%
  repaymentType: LoanRepaymentType;
  maturityMonth: YearMonth;
  /** required when repaymentType === 'manual' */
  manualMonthlyPayment?: number;
  /** bucket the loan proceeds land in; defaults to 'cash' */
  proceedsTo?: BucketKey;
  purpose?: string;
}

export interface FinEvent {
  id: string;
  type: EventType;
  name: string;
  amount: number;
  /** anchor month: the one-time month, or the recurrence's reference month */
  month: YearMonth;
  category?: string;
  active: boolean;
  /** 필수 지출 여부 (expense) */
  required?: boolean;
  recurrence?: RecurrenceRule;
  transfer?: TransferDetails; // present when type === 'transfer'
  loan?: LoanDetails; // present when type === 'loan'
  memo?: string;
}

export interface EventTemplate {
  id: string;
  label: string;
  type: EventType;
  name: string;
  category?: string;
  recurrence?: 'monthly';
  transferKind?: TransferKind;
}

export interface ScenarioSettings {
  baseCurrency: 'KRW';
  startMonth: YearMonth;
  forecastMonths: number;
  /** 최소 현금 기준 (고정 금액) */
  minimumCashAmount: number;
  /** 가용현금 계산 시 반영할 향후 단기 확정지출 개월 수 (1/3/6, 기본 3) */
  shortTermExpenseMonths: number;
}

export interface Scenario {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  baseScenarioId?: string;
  settings: ScenarioSettings;
  assets: Asset[];
  events: FinEvent[];
}

export type WarningStatus = 'normal' | 'caution' | 'danger' | 'critical';

export interface MonthlyLedgerLine {
  label: string;
  amount: number;
  kind: 'income' | 'expense' | 'transfer' | 'loan';
  eventId: string;
}

export interface MonthlyResult {
  month: YearMonth;
  startCash: number;
  totalIncome: number;
  totalExpense: number;
  savingsMove: number;
  investmentMove: number;
  /** net cash effect of all transfer events this month (+in / -out of the cash bucket) */
  assetTransferNet: number;
  loanProceeds: number;
  loanInterest: number;
  loanPrincipalPayment: number;
  loanRepaymentTotal: number;
  /** net cash effect of loan proceeds/repayments this month (대출 순변동) */
  loanNetChange: number;
  endCash: number;
  minimumRequiredCash: number;
  availableCash: number;
  nonCashAssetTotal: number;
  loanBalance: number;
  netWorth: number;
  /** 이 달의 평가손익(가격변동에 따른 자산 증감, 순자산에는 반영되지만 현금에는 영향 없음) */
  investmentGrowth: number;
  /** 카테고리별 이 달의 평가손익 */
  bucketGrowth: Partial<Record<BucketKey, number>>;
  status: WarningStatus;
  events: MonthlyLedgerLine[];
  assetBalances: Record<BucketKey, number>;
}

export interface SimulationResult {
  months: MonthlyResult[];
}

export interface Warning {
  month: YearMonth;
  status: WarningStatus;
  message: string;
}

export interface AppData {
  scenarios: Scenario[];
  activeScenarioId: string;
}

/** A lightweight record of a recently-created event, offered as a one-click shortcut. */
export interface RecentEventEntry {
  type: EventType;
  name: string;
  amount: number;
  category?: string;
  transferKind?: TransferKind;
  recurrenceFrequency?: RecurrenceFrequency;
}
