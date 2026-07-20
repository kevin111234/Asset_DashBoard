import type { AssetType, BucketKey, EventType, Liquidity, LoanRepaymentType, TransferKind } from '../types';

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'cash', label: '현금' },
  { value: 'checking', label: '입출금 통장' },
  { value: 'parking', label: '파킹통장' },
  { value: 'time_deposit', label: '정기예금' },
  { value: 'stock', label: '주식' },
  { value: 'etf', label: 'ETF' },
  { value: 'bond', label: '채권' },
  { value: 'crypto', label: '암호화폐' },
  { value: 'government_savings', label: '정부지원 저축' },
  { value: 'deposit', label: '보증금' },
  { value: 'other', label: '기타 자산' },
];

export const LIQUIDITY_OPTIONS: { value: Liquidity; label: string }[] = [
  { value: 'immediate', label: '즉시 사용 가능' },
  { value: 'partial', label: '일부 제한' },
  { value: 'after_maturity', label: '만기 후 사용 가능' },
  { value: 'locked', label: '장기 자산' },
];

export function assetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function liquidityLabel(liquidity: Liquidity): string {
  return LIQUIDITY_OPTIONS.find((o) => o.value === liquidity)?.label ?? liquidity;
}

export const BUCKET_OPTIONS: { value: BucketKey; label: string }[] = [
  { value: 'cash', label: '현금' },
  { value: 'time_deposit', label: '정기예금' },
  { value: 'stock', label: '주식' },
  { value: 'etf', label: 'ETF' },
  { value: 'bond', label: '채권' },
  { value: 'crypto', label: '암호화폐' },
  { value: 'government_savings', label: '정부지원 저축' },
  { value: 'deposit', label: '보증금' },
  { value: 'other', label: '기타 자산' },
];

export function bucketLabel(key: BucketKey): string {
  return BUCKET_OPTIONS.find((o) => o.value === key)?.label ?? key;
}

export const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: 'income', label: '수입' },
  { value: 'expense', label: '지출' },
  { value: 'transfer', label: '자산이동' },
  { value: 'loan', label: '대출' },
];

export function eventTypeLabel(type: EventType): string {
  return EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export const TRANSFER_KIND_OPTIONS: { value: TransferKind; label: string }[] = [
  { value: 'saving', label: '저축' },
  { value: 'investment', label: '투자' },
  { value: 'other', label: '기타 이동' },
];

export const LOAN_REPAYMENT_OPTIONS: { value: LoanRepaymentType; label: string }[] = [
  { value: 'bullet', label: '만기일시상환' },
  { value: 'manual', label: '직접 월 상환액 입력' },
];

const CATEGORY_LABEL: Record<string, string> = {
  // income
  salary: '급여',
  part_time: '아르바이트',
  bonus: '상여금',
  refund: '환급금',
  investment_return: '투자수익',
  asset_sale: '자산 매각',
  other_income: '기타 수입',
  // expense
  housing: '주거',
  living: '생활비',
  maintenance_fee: '관리비',
  communication: '통신비',
  insurance: '보험료',
  transportation: '교통비',
  food: '식비',
  device: '장비',
  gift: '선물',
  education: '교육비',
  project: '프로젝트 비용',
  tax: '세금',
  other_expense: '기타 지출',
  // transfer
  government_savings: '정부지원 저축',
  time_deposit: '정기예금',
  etf: 'ETF',
  stock: '주식',
  bond: '채권',
  crypto: '암호화폐',
  emergency_fund: '비상금 적립',
  other_transfer: '기타 이동',
  // loan
  loan: '대출',
};

export function categoryLabel(category?: string): string {
  if (!category) return '';
  return CATEGORY_LABEL[category] ?? category;
}

export const CATEGORY_OPTIONS_BY_TYPE: Record<EventType, { value: string; label: string }[]> = {
  income: [
    { value: 'salary', label: '급여' },
    { value: 'part_time', label: '아르바이트' },
    { value: 'bonus', label: '상여금' },
    { value: 'refund', label: '환급금' },
    { value: 'investment_return', label: '투자수익' },
    { value: 'asset_sale', label: '자산 매각' },
    { value: 'other_income', label: '기타 수입' },
  ],
  expense: [
    { value: 'housing', label: '주거' },
    { value: 'living', label: '생활비' },
    { value: 'maintenance_fee', label: '관리비' },
    { value: 'communication', label: '통신비' },
    { value: 'insurance', label: '보험료' },
    { value: 'transportation', label: '교통비' },
    { value: 'food', label: '식비' },
    { value: 'device', label: '장비' },
    { value: 'gift', label: '선물' },
    { value: 'education', label: '교육비' },
    { value: 'project', label: '프로젝트 비용' },
    { value: 'tax', label: '세금' },
    { value: 'other_expense', label: '기타 지출' },
  ],
  transfer: [
    { value: 'government_savings', label: '정부지원 저축' },
    { value: 'time_deposit', label: '정기예금' },
    { value: 'etf', label: 'ETF' },
    { value: 'stock', label: '주식' },
    { value: 'bond', label: '채권' },
    { value: 'crypto', label: '암호화폐' },
    { value: 'emergency_fund', label: '비상금 적립' },
    { value: 'other_transfer', label: '기타 이동' },
  ],
  loan: [{ value: 'loan', label: '대출' }],
};
