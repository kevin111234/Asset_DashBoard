import { useMemo, useState } from 'react';
import type { Scenario } from '../types';
import { useSimulation } from '../lib/useSimulation';
import { formatWon, formatWonSigned } from '../lib/format';
import { formatYmKorean } from '../engine/month';
import StatusBadge from '../components/StatusBadge';

export default function MonthlyDetailSection({ scenario }: { scenario: Scenario }) {
  const simulation = useSimulation(scenario);
  const [selectedMonth, setSelectedMonth] = useState<string>(simulation.months[0]?.month ?? '');
  const selected = useMemo(
    () => simulation.months.find((m) => m.month === selectedMonth) ?? simulation.months[0],
    [simulation, selectedMonth],
  );

  if (!selected) return <p className="text-sm text-gray-500">표시할 데이터가 없습니다.</p>;

  const rows: { label: string; value: number; bold?: boolean }[] = [
    { label: '월초 현금', value: selected.startCash, bold: true },
    { label: '총수입', value: selected.totalIncome },
    { label: '총지출', value: -selected.totalExpense },
    { label: '저축이동', value: -selected.savingsMove },
    { label: '투자이동', value: -selected.investmentMove },
    { label: '대출 실행', value: selected.loanProceeds },
    { label: '대출상환(이자+원금)', value: -selected.loanRepaymentTotal },
    { label: '월말 현금', value: selected.endCash, bold: true },
    { label: '가용현금', value: selected.availableCash, bold: true },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
            <thead className="sticky top-0 bg-gray-50 dark:bg-gray-800/70">
              <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                <th className="px-3 py-2">월</th>
                <th className="px-3 py-2">월말 현금</th>
                <th className="px-3 py-2">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {simulation.months.map((m) => (
                <tr
                  key={m.month}
                  onClick={() => setSelectedMonth(m.month)}
                  className={`cursor-pointer ${
                    m.month === selected.month ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <td className="px-3 py-2 whitespace-nowrap">{formatYmKorean(m.month)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatWon(m.endCash)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={m.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{formatYmKorean(selected.month)} 상세</h3>
            <StatusBadge status={selected.status} />
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className={`py-1.5 ${r.bold ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                    {r.label}
                  </td>
                  <td
                    className={`py-1.5 text-right tabular-nums ${r.bold ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'} ${
                      r.value < 0 ? 'text-red-600 dark:text-red-400' : ''
                    }`}
                  >
                    {formatWonSigned(r.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">이 달의 계산 근거 (항목별 내역)</h4>
          {selected.events.length === 0 ? (
            <p className="text-sm text-gray-400">이 달에 발생한 개별 항목이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm dark:divide-gray-800">
              {selected.events.map((e, i) => (
                <li key={i} className="flex items-center justify-between py-1.5">
                  <span className="text-gray-700 dark:text-gray-300">{e.label}</span>
                  <span className={`tabular-nums ${e.amount < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {formatWonSigned(e.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
