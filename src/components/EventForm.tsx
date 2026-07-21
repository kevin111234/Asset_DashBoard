import { useMemo, useState } from 'react';
import type {
  BucketKey,
  EventType,
  FinEvent,
  LoanRepaymentType,
  RecurrenceFrequency,
  Scenario,
  TransferKind,
  YearMonth,
} from '../types';
import { useDashboardStore } from '../store/store';
import { useSimulation } from '../lib/useSimulation';
import { computeOpeningBalance } from '../lib/openingBalance';
import { parseAmountInput } from '../lib/amountParse';
import { templatesByType } from '../lib/eventTemplates';
import {
  BUCKET_OPTIONS,
  CATEGORY_OPTIONS_BY_TYPE,
  EVENT_TYPE_OPTIONS,
  LOAN_REPAYMENT_OPTIONS,
  TRANSFER_KIND_OPTIONS,
  bucketLabel,
} from '../lib/options';
import { formatWon } from '../lib/format';
import { addMonths } from '../engine/month';
import { Button, CheckboxInput, Field, MonthInput, SelectInput, TextInput } from './inputs';

const SELL_QUICK_PERCENTAGES = [25, 50, 75, 100];

const EMPTY_SCENARIO: Scenario = {
  id: '',
  name: '',
  isDefault: false,
  createdAt: '',
  settings: { baseCurrency: 'KRW', startMonth: '2020-01', forecastMonths: 1, minimumCashAmount: 0, shortTermExpenseMonths: 0 },
  assets: [],
  events: [],
};

const QUICK_AMOUNTS = [10_000, 100_000, 500_000, 1_000_000];

interface Props {
  scenarioId: string;
  mode: 'create' | 'edit';
  /** create: prefills 발생월. edit: if set, offers "이번 달만" vs "전체" scope for recurring events. */
  contextMonth?: YearMonth;
  event?: FinEvent;
  onClose: () => void;
  /** create-only presets, e.g. from the quick-add bar (+저축/+투자/+대출...) */
  initialType?: EventType;
  initialTransferKind?: TransferKind;
  /** create-only presets for a prefilled sell/transfer, e.g. from the Assets screen's "매도" action */
  initialName?: string;
  initialAmount?: number;
  initialFromBucket?: BucketKey;
  initialToBucket?: BucketKey;
  initialCategory?: string;
  /** create-only preset: opens the form in 보유 비율 매도 mode at this % (100 = 전체 매도) */
  initialSellPercentage?: number;
}

export default function EventForm({
  scenarioId,
  mode,
  contextMonth,
  event,
  onClose,
  initialType,
  initialTransferKind,
  initialName,
  initialAmount,
  initialFromBucket,
  initialToBucket,
  initialCategory,
  initialSellPercentage,
}: Props) {
  const addEvent = useDashboardStore((s) => s.addEvent);
  const updateEvent = useDashboardStore((s) => s.updateEvent);
  const removeEvent = useDashboardStore((s) => s.removeEvent);
  const setEventException = useDashboardStore((s) => s.setEventException);
  const recentEvents = useDashboardStore((s) => s.recentEvents);
  const scenario = useDashboardStore((s) => s.scenarios.find((sc) => sc.id === scenarioId));
  const simulation = useSimulation(scenario ?? EMPTY_SCENARIO);

  const [type, setType] = useState<EventType>(event?.type ?? initialType ?? 'expense');
  const [name, setName] = useState(event?.name ?? initialName ?? '');
  const [amount, setAmount] = useState<number>(event?.amount ?? initialAmount ?? 0);
  const [amountText, setAmountText] = useState<string>(
    event?.amount ? String(event.amount) : initialAmount ? String(initialAmount) : '',
  );
  const [month, setMonth] = useState<YearMonth>(event?.month ?? contextMonth ?? new Date().toISOString().slice(0, 7));

  const [showDetails, setShowDetails] = useState(mode === 'edit' || !!initialFromBucket);
  const [category, setCategory] = useState<string>(event?.category ?? initialCategory ?? '');
  const [required, setRequired] = useState(!!event?.required);
  const [memo, setMemo] = useState(event?.memo ?? '');

  const [recurring, setRecurring] = useState(!!event?.recurrence);
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(event?.recurrence?.frequency ?? 'monthly');
  const [recStart, setRecStart] = useState<YearMonth>(event?.recurrence?.startMonth ?? month);
  const [recEnd, setRecEnd] = useState<YearMonth>(event?.recurrence?.endMonth ?? '');

  const [transferKind, setTransferKind] = useState<TransferKind>(event?.transfer?.kind ?? initialTransferKind ?? 'saving');
  const [fromBucket, setFromBucket] = useState<BucketKey>(event?.transfer?.from ?? initialFromBucket ?? 'cash');
  const [toBucket, setToBucket] = useState<BucketKey>(event?.transfer?.to ?? initialToBucket ?? 'government_savings');
  const initialSellPct = event?.transfer?.sellPercentage ?? initialSellPercentage;
  const [sellMode, setSellMode] = useState<'fixed' | 'percentage'>(initialSellPct !== undefined ? 'percentage' : 'fixed');
  const [sellPercentage, setSellPercentage] = useState<number>(initialSellPct ?? 100);

  const [annualRatePct, setAnnualRatePct] = useState<number>((event?.loan?.annualRate ?? 0.03) * 100);
  const [repaymentType, setRepaymentType] = useState<LoanRepaymentType>(event?.loan?.repaymentType ?? 'bullet');
  const [maturityMonth, setMaturityMonth] = useState<YearMonth>(event?.loan?.maturityMonth ?? addMonths(month, 23));
  const [manualPayment, setManualPayment] = useState<number>(event?.loan?.manualMonthlyPayment ?? 0);
  const [proceedsTo, setProceedsTo] = useState<BucketKey>(event?.loan?.proceedsTo ?? 'cash');

  const [editScope, setEditScope] = useState<'series' | 'thisMonth'>('series');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isRecurringInstance = mode === 'edit' && !!event?.recurrence && !!contextMonth;

  // 자산 매각 미리보기: 해당 월에 진입할 때의 잔액(engine과 동일한 시점 기준) × 매도 비율
  const previewMonth = recurring ? recStart : month;
  const isSellable = type === 'transfer' && fromBucket !== 'cash';
  const sellFromBalance = useMemo(() => {
    if (!scenario || !isSellable) return 0;
    return computeOpeningBalance(scenario, simulation.months, previewMonth, fromBucket);
  }, [scenario, simulation, isSellable, fromBucket, previewMonth]);
  const previewSellAmount = Math.round(sellFromBalance * (Math.max(0, Math.min(100, sellPercentage)) / 100));
  const isPercentSell = isSellable && sellMode === 'percentage';

  function applyAmountText(text: string) {
    setAmountText(text);
    const parsed = parseAmountInput(text);
    if (parsed !== null) setAmount(parsed);
  }

  function bumpAmount(delta: number) {
    const next = Math.max(0, amount + delta);
    setAmount(next);
    setAmountText(String(next));
  }

  function applyTemplate(tplId: string) {
    const tpl = templatesByType(type).find((t) => t.id === tplId);
    if (!tpl) return;
    setName(tpl.name);
    if (tpl.category) setCategory(tpl.category);
    if (tpl.recurrence === 'monthly') {
      setRecurring(true);
      setFrequency('monthly');
      setRecStart(month);
    }
    if (tpl.transferKind) setTransferKind(tpl.transferKind);
    if (tpl.sellPercentage !== undefined) {
      setSellMode('percentage');
      setSellPercentage(tpl.sellPercentage);
      setToBucket('cash');
      if (fromBucket === 'cash') setFromBucket('stock');
    }
  }

  function applyRecent(idx: number) {
    const r = recentEvents[idx];
    if (!r) return;
    setType(r.type);
    setName(r.name);
    setAmount(r.amount);
    setAmountText(String(r.amount));
    if (r.category) setCategory(r.category);
    if (r.transferKind) setTransferKind(r.transferKind);
    if (r.recurrenceFrequency) {
      setRecurring(true);
      setFrequency(r.recurrenceFrequency);
    }
  }

  function buildEventPatch(): Omit<FinEvent, 'id'> {
    const base: Omit<FinEvent, 'id'> = {
      type,
      name: name.trim() || '이름 없음',
      amount: isPercentSell ? previewSellAmount : amount,
      month: recurring ? recStart : month,
      category: category || undefined,
      active: event?.active ?? true,
      required: type === 'expense' ? required : undefined,
      memo: memo || undefined,
    };
    if (recurring) {
      base.recurrence = {
        frequency,
        startMonth: recStart,
        endMonth: recEnd || undefined,
        exceptions: event?.recurrence?.exceptions,
      };
    }
    if (type === 'transfer') {
      base.transfer = {
        kind: transferKind,
        from: fromBucket,
        to: toBucket,
        sellPercentage: isPercentSell ? sellPercentage : undefined,
      };
    }
    if (type === 'loan') {
      base.loan = {
        annualRate: annualRatePct / 100,
        repaymentType,
        maturityMonth,
        manualMonthlyPayment: repaymentType === 'manual' ? manualPayment : undefined,
        proceedsTo,
      };
    }
    return base;
  }

  function handleSave() {
    const effectiveAmount = isPercentSell ? previewSellAmount : amount;
    if (!name.trim() || effectiveAmount <= 0) return;

    if (mode === 'create') {
      addEvent(scenarioId, buildEventPatch());
      onClose();
      return;
    }

    if (!event) return;

    if (isRecurringInstance && editScope === 'thisMonth' && contextMonth) {
      setEventException(scenarioId, event.id, contextMonth, { amount: effectiveAmount, active: true });
      onClose();
      return;
    }

    updateEvent(scenarioId, event.id, buildEventPatch());
    onClose();
  }

  function handleDeleteWholeSeries() {
    if (!event) return;
    removeEvent(scenarioId, event.id);
    onClose();
  }

  function handleDeleteThisMonthOnly() {
    if (!event || !contextMonth) return;
    setEventException(scenarioId, event.id, contextMonth, { active: false });
    onClose();
  }

  const categoryOptions = CATEGORY_OPTIONS_BY_TYPE[type];
  const templates = templatesByType(type);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-16" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
          {mode === 'create' ? '이벤트 추가' : '이벤트 수정'}
        </h3>

        {mode === 'create' && (
          <div className="mb-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">템플릿</p>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => applyTemplate(t.id)}
                  className="rounded-full border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {t.label}
                </button>
              ))}
            </div>
            {recentEvents.length > 0 && (
              <>
                <p className="pt-1 text-xs font-medium text-gray-500 dark:text-gray-400">최근 사용</p>
                <div className="flex flex-wrap gap-1.5">
                  {recentEvents.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => applyRecent(i)}
                      className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300"
                    >
                      {r.name} {formatWon(r.amount)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="유형">
            <SelectInput value={type} onChange={setType} options={EVENT_TYPE_OPTIONS} />
          </Field>
          <Field label="이름">
            <TextInput value={name} onChange={setName} placeholder="예: 아이폰" />
          </Field>
          <Field label="금액">
            {isPercentSell ? (
              <div>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm tabular-nums text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300">
                  {formatWon(previewSellAmount)}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {bucketLabel(fromBucket)} 잔액 {formatWon(sellFromBalance)} 중 {sellPercentage}%
                </p>
              </div>
            ) : (
              <div>
                <TextInput value={amountText} onChange={applyAmountText} placeholder="80만 / 800000" />
                <p className="mt-1 text-xs text-gray-400">{amount > 0 ? formatWon(amount) : '80만, 800000 등 자유롭게 입력'}</p>
              </div>
            )}
          </Field>
          <Field label="발생월">
            <MonthInput value={recurring ? recStart : month} onChange={(v) => (recurring ? setRecStart(v) : setMonth(v))} />
          </Field>
        </div>

        {!isPercentSell && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => bumpAmount(q)}
                className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                +{formatWon(q)}
              </button>
            ))}
            <button onClick={() => bumpAmount(-amount)} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400">
              초기화
            </button>
          </div>
        )}

        <button
          onClick={() => setShowDetails((v) => !v)}
          className="mt-4 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          {showDetails ? '상세 설정 접기 ▲' : '상세 설정 펼치기 ▼'}
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/40">
            <div className="grid grid-cols-2 gap-3">
              <Field label="카테고리">
                <SelectInput
                  value={category || (categoryOptions[0]?.value ?? '')}
                  onChange={setCategory}
                  options={categoryOptions.length ? categoryOptions : [{ value: '', label: '-' }]}
                />
              </Field>
              {type === 'expense' && (
                <div className="flex items-end pb-1.5">
                  <CheckboxInput checked={required} onChange={setRequired} label="필수 지출" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <CheckboxInput checked={recurring} onChange={setRecurring} label="반복" />
            </div>
            {recurring && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="반복 주기">
                  <SelectInput
                    value={frequency}
                    onChange={setFrequency}
                    options={[
                      { value: 'monthly', label: '매월' },
                      { value: 'yearly', label: '매년' },
                    ]}
                  />
                </Field>
                <Field label="시작월">
                  <MonthInput value={recStart} onChange={setRecStart} />
                </Field>
                <Field label="종료월 (미정 가능)">
                  <MonthInput value={recEnd} onChange={setRecEnd} />
                </Field>
              </div>
            )}

            {type === 'transfer' && (
              <div className="grid grid-cols-3 gap-3">
                <Field label="구분">
                  <SelectInput value={transferKind} onChange={setTransferKind} options={TRANSFER_KIND_OPTIONS} />
                </Field>
                <Field label="출발 자산">
                  <SelectInput value={fromBucket} onChange={setFromBucket} options={BUCKET_OPTIONS} />
                </Field>
                <Field label="도착 자산">
                  <SelectInput value={toBucket} onChange={setToBucket} options={BUCKET_OPTIONS} />
                </Field>
              </div>
            )}

            {isSellable && (
              <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-900/20">
                <p className="mb-1.5 text-xs font-medium text-indigo-800 dark:text-indigo-300">
                  매각 방식 — {bucketLabel(fromBucket)}을(를) 얼마나 매도할까요?
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={sellMode === 'fixed'} onChange={() => setSellMode('fixed')} />
                    고정 금액
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={sellMode === 'percentage'} onChange={() => setSellMode('percentage')} />
                    보유 비율(%)
                  </label>
                  {sellMode === 'percentage' && (
                    <>
                      {SELL_QUICK_PERCENTAGES.map((p) => (
                        <button
                          key={p}
                          onClick={() => setSellPercentage(p)}
                          className={`rounded-md px-2 py-1 ${
                            sellPercentage === p
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {p === 100 ? '전체' : `${p}%`}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={sellPercentage}
                        onChange={(e) => setSellPercentage(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-900"
                      />
                      <span className="text-gray-500">%</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {type === 'loan' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="연이율(%)">
                  <TextInput value={String(annualRatePct)} onChange={(v) => setAnnualRatePct(Number(v) || 0)} />
                </Field>
                <Field label="상환방식">
                  <SelectInput value={repaymentType} onChange={setRepaymentType} options={LOAN_REPAYMENT_OPTIONS} />
                </Field>
                <Field label="만기월">
                  <MonthInput value={maturityMonth} onChange={setMaturityMonth} />
                </Field>
                {repaymentType === 'manual' && (
                  <Field label="월 상환액">
                    <TextInput value={String(manualPayment)} onChange={(v) => setManualPayment(Number(v) || 0)} />
                  </Field>
                )}
                <Field label="실행금 입금처">
                  <SelectInput value={proceedsTo} onChange={setProceedsTo} options={BUCKET_OPTIONS} />
                </Field>
              </div>
            )}

            <Field label="메모">
              <TextInput value={memo} onChange={setMemo} />
            </Field>
          </div>
        )}

        {isRecurringInstance && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/20">
            <p className="mb-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">반복 이벤트 수정 범위</p>
            <div className="flex gap-4 text-xs">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={editScope === 'thisMonth'} onChange={() => setEditScope('thisMonth')} />
                이번 달만 수정
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={editScope === 'series'} onChange={() => setEditScope('series')} />
                전체 반복 일정 수정
              </label>
            </div>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <div>
            {mode === 'edit' &&
              (confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-gray-500">정말 삭제할까요?</span>
                  {isRecurringInstance && (
                    <button onClick={handleDeleteThisMonthOnly} className="text-amber-600 hover:underline">
                      이 달만 제외
                    </button>
                  )}
                  <button onClick={handleDeleteWholeSeries} className="text-red-600 hover:underline">
                    {event?.recurrence ? '전체 반복 삭제' : '삭제'}
                  </button>
                  <button onClick={() => setConfirmingDelete(false)} className="text-gray-400 hover:underline">
                    취소
                  </button>
                </div>
              ) : (
                <button onClick={() => setConfirmingDelete(true)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                  삭제
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={handleSave}>저장</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
