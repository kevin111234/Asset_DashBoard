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

export type Liquidity = 'immediate' | 'short_term' | 'locked';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  /** 투자원금 */
  principal: number;
  /** 현재 평가금액 */
  marketValue: number;
  liquidity: Liquidity;
  /** 현금화 소요기간 (months), used when liquidity === 'short_term' */
  liquidityMonths?: number;
  /** 연 수익률 (optional, informational in MVP) */
  expectedReturnRate?: number;
  note?: string;
}

export type Recurrence = 'once' | 'monthly';

export type FlowType = 'income' | 'expense';

export type IncomeCategory =
  | 'salary'
  | 'part_time'
  | 'bonus'
  | 'refund'
  | 'investment_return'
  | 'loan_proceeds'
  | 'asset_sale'
  | 'other_income';

export type ExpenseCategory =
  | 'living'
  | 'rent'
  | 'maintenance_fee'
  | 'communication'
  | 'insurance'
  | 'transportation'
  | 'food'
  | 'equipment'
  | 'gift'
  | 'education'
  | 'project'
  | 'tax'
  | 'loan_repayment'
  | 'other_expense';

export interface CashFlowItem {
  id: string;
  name: string;
  type: FlowType;
  category: IncomeCategory | ExpenseCategory;
  amount: number;
  startMonth: YearMonth;
  endMonth?: YearMonth;
  recurrence: Recurrence;
  /** 필수 지출 여부 */
  required?: boolean;
  /** 조정 가능 여부 */
  adjustable?: boolean;
  memo?: string;
}

export type TransferKind = 'saving' | 'investment';

/**
 * Simulation buckets. 'cash'/'checking'/'parking' assets all pool into the
 * single 'cash' bucket (보유 현금); every other asset type is tracked as its
 * own bucket total. Transfers move money between these buckets.
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

export type TransferEndpoint = BucketKey;

export function assetBucketKey(type: AssetType): BucketKey {
  if (type === 'cash' || type === 'checking' || type === 'parking') return 'cash';
  return type;
}

export interface TransferItem {
  id: string;
  name: string;
  kind: TransferKind;
  from: TransferEndpoint;
  to: TransferEndpoint;
  amount: number;
  startMonth: YearMonth;
  endMonth?: YearMonth;
  recurrence: Recurrence;
  memo?: string;
}

export type RepaymentType = 'bullet' | 'equal_payment' | 'equal_principal' | 'manual';

export interface Loan {
  id: string;
  name: string;
  principal: number;
  annualRate: number; // e.g. 0.013 for 1.3%
  startMonth: YearMonth;
  repaymentType: RepaymentType;
  termMonths: number;
  /** required when repaymentType === 'manual' */
  manualMonthlyPayment?: number;
  prepaymentPenaltyRate?: number;
  purpose?: string;
  /** if set, loan proceeds land in this bucket instead of 'cash' */
  proceedsTo?: BucketKey;
}

export interface ScenarioSettings {
  baseCurrency: 'KRW';
  startMonth: YearMonth;
  forecastMonths: number;
  /** 월 필수생활비 */
  monthlyEssentialLiving: number;
  /** 생활비 확보 개월 수 */
  livingReserveMonths: number;
  /** 별도 비상금(절대 최소 현금에 더해지는 고정액) */
  emergencyFund: number;
  /** 가용현금 계산 시 반영할 향후 단기 확정지출 개월 수 */
  shortTermExpenseMonths: number;
  /** 투자배분율: 가용현금 중 투자 가능 금액 비율 */
  investmentAllocationRate: number;
}

export interface Scenario {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
  baseScenarioId?: string;
  settings: ScenarioSettings;
  assets: Asset[];
  cashFlows: CashFlowItem[];
  transfers: TransferItem[];
  loans: Loan[];
}

export type WarningStatus = 'normal' | 'caution' | 'danger' | 'critical';

export interface MonthlyEvent {
  label: string;
  amount: number;
  kind: 'income' | 'expense' | 'transfer' | 'loan';
}

export interface MonthlyResult {
  month: YearMonth;
  startCash: number;
  totalIncome: number;
  totalExpense: number;
  savingsMove: number;
  investmentMove: number;
  loanProceeds: number;
  loanInterest: number;
  loanPrincipalPayment: number;
  loanRepaymentTotal: number;
  endCash: number;
  minimumRequiredCash: number;
  availableCash: number;
  nonCashAssetTotal: number;
  loanBalance: number;
  netWorth: number;
  investableAmount: number;
  status: WarningStatus;
  events: MonthlyEvent[];
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
