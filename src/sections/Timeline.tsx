import { useMemo, useState } from 'react';
import type { FinEvent, MonthlyResult, Scenario, YearMonth } from '../types';
import { useDashboardStore } from '../store/store';
import { useSimulation } from '../lib/useSimulation';
import { resolveOccurrence } from '../engine/engine';
import { generateMonthRange, formatYmKorean } from '../engine/month';
import { formatWon, formatWonSigned } from '../lib/format';
import EventCard from '../components/EventCard';
import EventForm from '../components/EventForm';
import QuickAddBar from '../components/QuickAddBar';
import { TextInput } from '../components/inputs';

type FilterKey = 'all' | 'income' | 'expense' | 'saving' | 'investment' | 'loan' | 'inactive';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'income', label: '수입' },
  { key: 'expense', label: '지출' },
  { key: 'saving', label: '저축' },
  { key: 'investment', label: '투자' },
  { key: 'loan', label: '대출' },
  { key: 'inactive', label: '비활성' },
];

interface MonthEntry {
  event: FinEvent;
  amount: number;
  skipped: boolean;
}

function eventsForMonth(events: FinEvent[], month: YearMonth, monthResult: MonthlyResult | undefined): MonthEntry[] {
  // Prefer the exact amount the engine actually moved this month (from the ledger) over a
  // recomputed guess — this matters for %-based sells, whose real amount depends on the
  // bucket's live balance and isn't just the event's static `amount` field.
  function ledgerAmount(eventId: string): number | undefined {
    const line = monthResult?.events.find((e) => e.eventId === eventId);
    return line ? Math.abs(line.amount) : undefined;
  }

  const out: MonthEntry[] = [];
  for (const event of events) {
    if (!event.recurrence) {
      if (event.month === month) {
        out.push({ event, amount: ledgerAmount(event.id) ?? event.amount, skipped: false });
      }
      continue;
    }
    const occ = resolveOccurrence(event, month);
    if (occ.active) {
      out.push({ event, amount: ledgerAmount(event.id) ?? occ.amount, skipped: false });
    } else if (!event.active && event.recurrence.startMonth === month) {
      out.push({ event, amount: event.amount, skipped: false });
    } else if (event.active && event.recurrence.exceptions?.[month]?.active === false) {
      out.push({ event, amount: event.amount, skipped: true });
    }
  }
  return out;
}

function matchesFilter(entry: MonthEntry, filter: FilterKey): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'income':
      return entry.event.type === 'income';
    case 'expense':
      return entry.event.type === 'expense';
    case 'saving':
      return entry.event.type === 'transfer' && entry.event.transfer?.kind === 'saving';
    case 'investment':
      return entry.event.type === 'transfer' && entry.event.transfer?.kind === 'investment';
    case 'loan':
      return entry.event.type === 'loan';
    case 'inactive':
      return !entry.event.active || entry.skipped;
  }
}

export default function Timeline({ scenario }: { scenario: Scenario }) {
  const duplicateEvent = useDashboardStore((s) => s.duplicateEvent);
  const toggleEventActive = useDashboardStore((s) => s.toggleEventActive);

  const simulation = useSimulation(scenario);
  const resultByMonth = useMemo(() => new Map(simulation.months.map((m) => [m.month, m])), [simulation]);
  const months = useMemo(
    () => generateMonthRange(scenario.settings.startMonth, scenario.settings.forecastMonths),
    [scenario.settings.startMonth, scenario.settings.forecastMonths],
  );

  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [formTarget, setFormTarget] = useState<
    { mode: 'create'; contextMonth: YearMonth } | { mode: 'edit'; contextMonth: YearMonth; event: FinEvent } | null
  >(null);

  const isFiltering = filter !== 'all' || search.trim() !== '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <QuickAddBar scenarioId={scenario.id} />
        <div className="flex items-center gap-2">
          <div className="w-48">
            <TextInput value={search} onChange={setSearch} placeholder="이벤트 이름 검색" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                filter === f.key ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => setCollapsed(Object.fromEntries(months.map((m) => [m, false])))} className="text-indigo-600 hover:underline dark:text-indigo-400">
            모두 펼치기
          </button>
          <button onClick={() => setCollapsed(Object.fromEntries(months.map((m) => [m, true])))} className="text-indigo-600 hover:underline dark:text-indigo-400">
            모두 접기
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {months.map((month, monthIdx) => {
          const result = resultByMonth.get(month);
          const allEntries = eventsForMonth(scenario.events, month, result);
          const query = search.trim().toLowerCase();
          const entries = allEntries.filter(
            (e) => matchesFilter(e, filter) && (query === '' || e.event.name.toLowerCase().includes(query)),
          );

          if (isFiltering && entries.length === 0) return null;
          // near-term months expand by default; further-out months start collapsed to keep a 36-month timeline manageable.
          // an active filter/search always auto-expands months with matches, since a collapsed match would be invisible.
          const isCollapsed = isFiltering ? false : (collapsed[month] ?? (allEntries.length === 0 || monthIdx >= 6));

          return (
            <div key={month} className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center justify-between px-4 py-2.5">
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [month]: !isCollapsed }))}
                  className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200"
                >
                  <span className={`transition-transform ${isCollapsed ? '' : 'rotate-90'}`}>▶</span>
                  {formatYmKorean(month)}
                  {allEntries.length > 0 && (
                    <span className="text-xs font-normal text-gray-400">{allEntries.length}건</span>
                  )}
                  {result && (
                    <span className="text-xs font-normal text-gray-400">· 월말 {formatWon(result.endCash)}</span>
                  )}
                </button>
                <button
                  onClick={() => setFormTarget({ mode: 'create', contextMonth: month })}
                  className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  + 이벤트
                </button>
              </div>

              {!isCollapsed && (
                <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
                  {entries.length > 0 ? (
                    <div className="space-y-1.5">
                      {entries.map((entry) => (
                        <EventCard
                          key={entry.event.id}
                          event={entry.event}
                          amount={entry.amount}
                          skipped={entry.skipped}
                          onEdit={() => setFormTarget({ mode: 'edit', contextMonth: month, event: entry.event })}
                          onDuplicate={() => duplicateEvent(scenario.id, entry.event.id)}
                          onToggleActive={() => toggleEventActive(scenario.id, entry.event.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">이 달에 등록된 이벤트가 없습니다.</p>
                  )}

                  {result && (
                    <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg bg-gray-50 p-3 text-xs dark:bg-gray-800/40 sm:grid-cols-4">
                      <SummaryItem label="월초 현금" value={formatWon(result.startCash)} />
                      <SummaryItem label="총수입" value={formatWonSigned(result.totalIncome)} tone="good" />
                      <SummaryItem label="총지출" value={formatWonSigned(-result.totalExpense)} tone="bad" />
                      <SummaryItem label="자산이동" value={formatWonSigned(result.assetTransferNet)} />
                      <SummaryItem label="대출 순변동" value={formatWonSigned(result.loanNetChange)} />
                      <SummaryItem
                        label="평가손익"
                        value={formatWonSigned(result.investmentGrowth)}
                        tone={result.investmentGrowth > 0 ? 'good' : result.investmentGrowth < 0 ? 'bad' : undefined}
                      />
                      <SummaryItem label="월말 현금" value={formatWon(result.endCash)} strong />
                      <SummaryItem label="가용현금" value={formatWon(result.availableCash)} strong tone={result.availableCash < 0 ? 'bad' : undefined} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {formTarget && formTarget.mode === 'create' && (
        <EventForm scenarioId={scenario.id} mode="create" contextMonth={formTarget.contextMonth} onClose={() => setFormTarget(null)} />
      )}
      {formTarget && formTarget.mode === 'edit' && (
        <EventForm
          scenarioId={scenario.id}
          mode="edit"
          event={formTarget.event}
          contextMonth={formTarget.contextMonth}
          onClose={() => setFormTarget(null)}
        />
      )}
    </div>
  );
}

function SummaryItem({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'good' | 'bad';
}) {
  const toneClass = tone === 'good' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'bad' ? 'text-red-600 dark:text-red-400' : '';
  return (
    <div>
      <div className="text-gray-400">{label}</div>
      <div className={`tabular-nums ${strong ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-300'} ${toneClass}`}>
        {value}
      </div>
    </div>
  );
}
