import type { AssetType, ExpenseCategory, IncomeCategory, Liquidity, RepaymentType, TransferKind, BucketKey } from '../types';

export const ASSET_TYPE_OPTIONS: { value: AssetType; label: string }[] = [
  { value: 'cash', label: '현금' },
  { value: 'checking', label: '입출금 계좌' },
  { value: 'time_deposit', label: '정기예금' },
  { value: 'parking', label: '파킹통장' },
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
  { value: 'short_term', label: '일정 기간 후 사용 가능' },
  { value: 'locked', label: '장기적으로 묶여 있음' },
];

export const INCOME_CATEGORY_OPTIONS: { value: IncomeCategory; label: string }[] = [
  { value: 'salary', label: '급여' },
  { value: 'part_time', label: '아르바이트' },
  { value: 'bonus', label: '상여금' },
  { value: 'refund', label: '환급금' },
  { value: 'investment_return', label: '투자수익' },
  { value: 'loan_proceeds', label: '대출 실행' },
  { value: 'asset_sale', label: '자산 매각' },
  { value: 'other_income', label: '기타 수입' },
];

export const EXPENSE_CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'living', label: '생활비' },
  { value: 'rent', label: '월세' },
  { value: 'maintenance_fee', label: '관리비' },
  { value: 'communication', label: '통신비' },
  { value: 'insurance', label: '보험료' },
  { value: 'transportation', label: '교통비' },
  { value: 'food', label: '식비' },
  { value: 'equipment', label: '장비 구매' },
  { value: 'gift', label: '선물' },
  { value: 'education', label: '교육비' },
  { value: 'project', label: '프로젝트 비용' },
  { value: 'tax', label: '세금' },
  { value: 'loan_repayment', label: '대출 상환' },
  { value: 'other_expense', label: '기타 지출' },
];

export const TRANSFER_KIND_OPTIONS: { value: TransferKind; label: string }[] = [
  { value: 'saving', label: '저축' },
  { value: 'investment', label: '투자' },
];

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

export const REPAYMENT_TYPE_OPTIONS: { value: RepaymentType; label: string }[] = [
  { value: 'bullet', label: '만기일시상환' },
  { value: 'equal_payment', label: '원리금균등상환' },
  { value: 'equal_principal', label: '원금균등상환' },
  { value: 'manual', label: '직접 월 상환액 입력' },
];

export function bucketLabel(key: BucketKey): string {
  return BUCKET_OPTIONS.find((o) => o.value === key)?.label ?? key;
}

export function assetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}
