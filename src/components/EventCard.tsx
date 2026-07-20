import type { FinEvent } from '../types';
import { formatWon } from '../lib/format';
import { categoryLabel, eventTypeLabel } from '../lib/options';

const TYPE_DOT: Record<FinEvent['type'], string> = {
  income: 'bg-emerald-500',
  expense: 'bg-red-500',
  transfer: 'bg-indigo-500',
  loan: 'bg-amber-500',
};

const TYPE_AMOUNT_CLASS: Record<FinEvent['type'], string> = {
  income: 'text-emerald-600 dark:text-emerald-400',
  expense: 'text-red-600 dark:text-red-400',
  transfer: 'text-indigo-600 dark:text-indigo-400',
  loan: 'text-amber-600 dark:text-amber-400',
};

export default function EventCard({
  event,
  amount,
  skipped,
  onEdit,
  onDuplicate,
  onToggleActive,
}: {
  event: FinEvent;
  /** absolute occurrence amount for this month (already resolves exception overrides) */
  amount: number;
  /** true when this card represents an exception-skipped occurrence (해당 월만 예외 제외) */
  skipped?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onToggleActive: () => void;
}) {
  const inactive = !event.active || skipped;
  return (
    <div
      onClick={onEdit}
      className={`group flex cursor-pointer items-start justify-between rounded-lg border p-2.5 text-sm transition-colors ${
        inactive
          ? 'border-dashed border-gray-300 bg-gray-50 opacity-60 dark:border-gray-700 dark:bg-gray-800/30'
          : 'border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT[event.type]}`} />
          <span className="truncate font-medium text-gray-800 dark:text-gray-200">{event.name}</span>
          {event.recurrence && (
            <span className="shrink-0 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              {event.recurrence.frequency === 'monthly' ? '매월' : '매년'}
            </span>
          )}
          {!event.active && <span className="shrink-0 rounded bg-gray-200 px-1 py-0.5 text-[10px] text-gray-600 dark:bg-gray-700 dark:text-gray-300">비활성</span>}
          {skipped && event.active && (
            <span className="shrink-0 rounded bg-amber-100 px-1 py-0.5 text-[10px] text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              이 달 제외
            </span>
          )}
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {eventTypeLabel(event.type)}
          {event.category ? ` · ${categoryLabel(event.category)}` : ''}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-2">
        <span className={`tabular-nums ${TYPE_AMOUNT_CLASS[event.type]}`}>
          {event.type === 'expense' ? '-' : ''}
          {formatWon(amount)}
        </span>
        <div className="hidden gap-1 group-hover:flex">
          <button
            title="복제"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            복제
          </button>
          <button
            title={event.active ? '비활성화' : '활성화'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleActive();
            }}
            className="rounded px-1 text-xs text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
          >
            {event.active ? '끄기' : '켜기'}
          </button>
        </div>
      </div>
    </div>
  );
}
