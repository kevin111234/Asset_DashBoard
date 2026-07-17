import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { Scenario } from '../types';
import { useSimulation } from '../lib/useSimulation';
import { formatWon, formatManwon } from '../lib/format';
import { formatYmKorean } from '../engine/month';
import { buildWarnings, findLowestCashMonth } from '../engine/warnings';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import QuickAdjustPanel from '../components/QuickAdjustPanel';
import { bucketLabel } from '../lib/options';

const PERIOD_OPTIONS = [6, 12, 24, 36] as const;

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

export default function Dashboard({
  scenario,
  onNavigate,
}: {
  scenario: Scenario;
  onNavigate: (tab: 'monthly') => void;
}) {
  const [period, setPeriod] = useState<number>(Math.min(12, scenario.settings.forecastMonths));
  const simulation = useSimulation(scenario);
  const months = useMemo(() => simulation.months.slice(0, period), [simulation, period]);
  const first = months[0];
  const twelfth = months[Math.min(11, months.length - 1)];
  const warnings = useMemo(() => buildWarnings(months).slice(0, 5), [months]);
  const lowest = useMemo(() => findLowestCashMonth(months), [months]);

  if (!first) {
    return <p className="text-sm text-gray-500">시뮬레이션할 기간이 없습니다.</p>;
  }

  const investmentTotal =
    first.assetBalances.stock + first.assetBalances.etf + first.assetBalances.bond + first.assetBalances.crypto;

  const chartData = months.map((m) => ({
    month: formatYmKorean(m.month).replace('년 ', '.').replace('월', ''),
    보유현금: m.endCash,
    가용현금: m.availableCash,
    순자산: m.netWorth,
    수입: m.totalIncome,
    지출: m.totalExpense + m.loanRepaymentTotal,
  }));

  const pieData = (Object.keys(first.assetBalances) as (keyof typeof first.assetBalances)[])
    .filter((k) => first.assetBalances[k] > 0)
    .map((k) => ({ name: bucketLabel(k), value: first.assetBalances[k] }));

  const timeline = months.filter((m) => m.events.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(Math.min(p, scenario.settings.forecastMonths))}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                period === p ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              {p}개월
            </button>
          ))}
        </div>
        <button onClick={() => onNavigate('monthly')} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
          월별 상세 보기 →
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="현재 보유 현금" value={formatWon(first.startCash)} />
        <StatCard label="현재 가용현금" value={formatWon(first.availableCash)} tone={first.availableCash < 0 ? 'bad' : 'default'} />
        <StatCard label="투자자산" value={formatWon(investmentTotal)} />
        <StatCard label="정부지원 저축" value={formatWon(first.assetBalances.government_savings)} />
        <StatCard label="총부채" value={formatWon(first.loanBalance)} tone={first.loanBalance > 0 ? 'warn' : 'default'} />
        <StatCard label="순자산" value={formatWon(first.netWorth)} tone="good" />
        <StatCard label="이번 달 예상 잔액" value={formatWon(first.endCash)} />
        <StatCard label="12개월 후 예상 현금" value={formatWon(twelfth.endCash)} sub={formatYmKorean(twelfth.month)} />
      </div>

      {lowest && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm dark:border-gray-800 dark:bg-gray-900">
          선택 기간 중 최저 예상 현금: <strong className="tabular-nums">{formatWon(lowest.endCash)}</strong> (
          {formatYmKorean(lowest.month)}) · 최소 필요 현금 기준: {formatWon(lowest.minimumRequiredCash)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">월별 가용현금 / 보유현금 / 순자산</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => formatManwon(v)} width={56} />
              <Tooltip formatter={(v) => formatWon(Number(v))} />
              <Legend />
              <ReferenceLine y={first.minimumRequiredCash} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '최소현금기준', fontSize: 10, position: 'insideTopLeft' }} />
              <Line type="monotone" dataKey="가용현금" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="보유현금" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="순자산" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">자산 구성비 (이번 달)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label={(d) => d.name}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatWon(Number(v))} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">월별 수입 / 지출</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} tickFormatter={(v) => formatManwon(v)} width={56} />
              <Tooltip formatter={(v) => formatWon(Number(v))} />
              <Legend />
              <Bar dataKey="수입" fill="#22c55e" />
              <Bar dataKey="지출" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <QuickAdjustPanel scenario={scenario} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">경고</h3>
        {warnings.length === 0 ? (
          <p className="text-sm text-gray-400">선택 기간 내 경고가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <StatusBadge status={w.status} />
                <span className="text-gray-700 dark:text-gray-300">{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">주요 이벤트 타임라인</h3>
        {timeline.length === 0 ? (
          <p className="text-sm text-gray-400">선택 기간 내 이벤트가 없습니다.</p>
        ) : (
          <ol className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            {timeline.map((m) => (
              <li key={m.month} className="flex gap-2">
                <span className="w-24 shrink-0 font-medium text-gray-500 dark:text-gray-400">{formatYmKorean(m.month)}</span>
                <span>{m.events.map((e) => e.label).join(', ')}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
