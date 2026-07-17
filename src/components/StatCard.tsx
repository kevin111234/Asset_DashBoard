import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: string;
  sub?: string;
  tone?: 'default' | 'good' | 'bad' | 'warn';
  icon?: ReactNode;
}

const TONE_CLASS: Record<NonNullable<Props['tone']>, string> = {
  default: 'text-gray-900 dark:text-gray-100',
  good: 'text-emerald-600 dark:text-emerald-400',
  bad: 'text-red-600 dark:text-red-400',
  warn: 'text-amber-600 dark:text-amber-400',
};

export default function StatCard({ label, value, sub, tone = 'default' }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</div>
      <div className={`mt-1 text-xl font-semibold tabular-nums ${TONE_CLASS[tone]}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
    </div>
  );
}
