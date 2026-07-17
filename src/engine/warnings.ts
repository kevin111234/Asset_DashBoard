import type { MonthlyResult, Warning } from '../types';
import { formatYmKorean } from './month';

function formatWon(n: number): string {
  return `${Math.round(Math.abs(n)).toLocaleString('ko-KR')}원`;
}

export function buildWarnings(months: MonthlyResult[]): Warning[] {
  const warnings: Warning[] = [];
  for (const m of months) {
    if (m.status === 'normal') continue;
    let message: string;
    if (m.status === 'critical') {
      message =
        m.endCash < 0
          ? `${formatYmKorean(m.month)} 월말 현금이 ${formatWon(m.endCash)} 부족(음수)합니다. 필수 지출을 충당할 수 없습니다.`
          : `${formatYmKorean(m.month)} 예상 현금으로 필수 지출을 충당할 수 없습니다.`;
    } else if (m.status === 'danger') {
      message = `${formatYmKorean(m.month)} 예상 가용현금이 설정한 최소 기준보다 ${formatWon(
        m.minimumRequiredCash - m.endCash,
      )} 부족합니다.`;
    } else {
      message = `${formatYmKorean(m.month)} 예상 현금이 최소 기준의 120% 이하로 낮아집니다. 지출 계획을 점검하세요.`;
    }
    warnings.push({ month: m.month, status: m.status, message });
  }
  return warnings;
}

export function findLowestCashMonth(months: MonthlyResult[]): MonthlyResult | undefined {
  if (months.length === 0) return undefined;
  return months.reduce((min, m) => (m.endCash < min.endCash ? m : min), months[0]);
}

export function findCashDepletionMonth(months: MonthlyResult[]): MonthlyResult | undefined {
  return months.find((m) => m.endCash < 0);
}
