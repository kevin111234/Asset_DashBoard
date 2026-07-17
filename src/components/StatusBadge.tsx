import type { WarningStatus } from '../types';

const STYLES: Record<WarningStatus, { label: string; className: string }> = {
  normal: { label: '정상', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' },
  caution: { label: '주의', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  danger: { label: '위험', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  critical: { label: '심각', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
};

export default function StatusBadge({ status }: { status: WarningStatus }) {
  const s = STYLES[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${s.className}`}>
      {s.label}
    </span>
  );
}
