import type { EventTemplate } from '../types';

export const EVENT_TEMPLATES: EventTemplate[] = [
  // 수입
  { id: 'tpl-salary', label: '급여', type: 'income', name: '급여', category: 'salary', recurrence: 'monthly' },
  { id: 'tpl-part-time', label: '아르바이트', type: 'income', name: '아르바이트', category: 'part_time', recurrence: 'monthly' },
  { id: 'tpl-bonus', label: '상여금', type: 'income', name: '상여금', category: 'bonus' },
  { id: 'tpl-refund', label: '환급금', type: 'income', name: '환급금', category: 'refund' },
  { id: 'tpl-asset-sale', label: '자산 매각', type: 'income', name: '자산 매각', category: 'asset_sale' },

  // 지출
  { id: 'tpl-rent', label: '월세', type: 'expense', name: '월세', category: 'housing', recurrence: 'monthly' },
  { id: 'tpl-living', label: '생활비', type: 'expense', name: '생활비', category: 'living', recurrence: 'monthly' },
  { id: 'tpl-communication', label: '통신비', type: 'expense', name: '통신비', category: 'communication', recurrence: 'monthly' },
  { id: 'tpl-device', label: '장비 구매', type: 'expense', name: '장비 구매', category: 'device' },
  { id: 'tpl-gift', label: '선물', type: 'expense', name: '선물', category: 'gift' },
  { id: 'tpl-education', label: '교육비', type: 'expense', name: '교육비', category: 'education' },

  // 자산이동 (저축/투자)
  {
    id: 'tpl-gov-savings',
    label: '정부지원 저축',
    type: 'transfer',
    name: '정부지원 저축',
    category: 'government_savings',
    recurrence: 'monthly',
    transferKind: 'saving',
  },
  {
    id: 'tpl-time-deposit',
    label: '정기예금',
    type: 'transfer',
    name: '정기예금',
    category: 'time_deposit',
    transferKind: 'saving',
  },
  { id: 'tpl-etf', label: 'ETF 투자', type: 'transfer', name: 'ETF 투자', category: 'etf', transferKind: 'investment' },
  { id: 'tpl-stock', label: '주식 투자', type: 'transfer', name: '주식 투자', category: 'stock', transferKind: 'investment' },
  {
    id: 'tpl-emergency-fund',
    label: '비상금 적립',
    type: 'transfer',
    name: '비상금 적립',
    category: 'emergency_fund',
    recurrence: 'monthly',
    transferKind: 'saving',
  },

  // 대출
  { id: 'tpl-loan-execute', label: '대출 실행', type: 'loan', name: '대출 실행', category: 'loan' },
];

export function templatesByType(type: EventTemplate['type']): EventTemplate[] {
  return EVENT_TEMPLATES.filter((t) => t.type === type);
}
