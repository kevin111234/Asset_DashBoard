import { useMemo, useState } from 'react';
import type { BucketKey, Loan, RepaymentType, Scenario } from '../types';
import { useDashboardStore } from '../store/store';
import { BUCKET_OPTIONS, REPAYMENT_TYPE_OPTIONS } from '../lib/options';
import { formatWon, formatPercent } from '../lib/format';
import { formatYmKorean, addMonths } from '../engine/month';
import { buildLoanSchedule, totalInterest } from '../engine/loan';
import { useSimulation } from '../lib/useSimulation';
import { Button, Field, MonthInput, NumberInput, SelectInput, TextInput } from '../components/inputs';

type FormState = Omit<Loan, 'id'>;

const EMPTY_FORM: FormState = {
  name: '',
  principal: 0,
  annualRate: 0.03,
  startMonth: new Date().toISOString().slice(0, 7),
  repaymentType: 'bullet',
  termMonths: 12,
  manualMonthlyPayment: undefined,
  prepaymentPenaltyRate: undefined,
  purpose: '',
  proceedsTo: 'cash',
};

export default function LoansSection({ scenario }: { scenario: Scenario }) {
  const addLoan = useDashboardStore((s) => s.addLoan);
  const updateLoan = useDashboardStore((s) => s.updateLoan);
  const removeLoan = useDashboardStore((s) => s.removeLoan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const simulation = useSimulation(scenario);
  const currentMonth = simulation.months[0]?.month ?? scenario.settings.startMonth;
  const totalAssets = simulation.months[0]
    ? simulation.months[0].endCash + simulation.months[0].nonCashAssetTotal
    : 0;
  const totalLoanBalance = simulation.months[0]?.loanBalance ?? 0;
  const debtRatio = totalAssets > 0 ? totalLoanBalance / totalAssets : 0;

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(loan: Loan) {
    const { id, ...rest } = loan;
    void id;
    setForm(rest);
    setEditingId(loan.id);
    setShowForm(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) updateLoan(scenario.id, editingId, form);
    else addLoan(scenario.id, form);
    setShowForm(false);
  }

  const loanDetails = useMemo(
    () =>
      scenario.loans.map((loan) => {
        const schedule = buildLoanSchedule(loan);
        const entries = Array.from(schedule.values());
        const currentEntry = schedule.get(currentMonth);
        const maturityMonth = addMonths(loan.startMonth, loan.termMonths - 1);
        const lastEntry = entries[entries.length - 1];
        return {
          loan,
          currentBalance: currentEntry?.balanceAfter ?? 0,
          monthlyInterest: currentEntry?.interest ?? 0,
          monthlyPayment: currentEntry?.payment ?? 0,
          totalInterest: totalInterest(schedule),
          maturityMonth,
          balloonPayment: loan.repaymentType === 'bullet' ? lastEntry?.principalPayment ?? 0 : 0,
        };
      }),
    [scenario.loans, currentMonth],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">대출 관리</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            현재 대출잔액 {formatWon(totalLoanBalance)} · 부채비율(대출잔액/총자산) {formatPercent(debtRatio)}
          </p>
        </div>
        <Button onClick={startAdd}>대출 추가</Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
          <Field label="대출명">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label="실행금액">
            <NumberInput value={form.principal} onChange={(v) => setForm({ ...form, principal: v })} step={10000} />
          </Field>
          <Field label="이율(연, %)">
            <NumberInput value={form.annualRate * 100} onChange={(v) => setForm({ ...form, annualRate: v / 100 })} step={0.1} />
          </Field>
          <Field label="실행일(월)">
            <MonthInput value={form.startMonth} onChange={(v) => setForm({ ...form, startMonth: v })} />
          </Field>
          <Field label="상환방식">
            <SelectInput
              value={form.repaymentType}
              onChange={(v: RepaymentType) => setForm({ ...form, repaymentType: v })}
              options={REPAYMENT_TYPE_OPTIONS}
            />
          </Field>
          <Field label="대출기간(개월)">
            <NumberInput value={form.termMonths} onChange={(v) => setForm({ ...form, termMonths: v })} />
          </Field>
          {form.repaymentType === 'manual' && (
            <Field label="월 상환액(직접입력)">
              <NumberInput value={form.manualMonthlyPayment ?? 0} onChange={(v) => setForm({ ...form, manualMonthlyPayment: v })} step={1000} />
            </Field>
          )}
          <Field label="중도상환수수료(%)">
            <NumberInput
              value={(form.prepaymentPenaltyRate ?? 0) * 100}
              onChange={(v) => setForm({ ...form, prepaymentPenaltyRate: v / 100 })}
              step={0.1}
            />
          </Field>
          <Field label="대출 목적">
            <TextInput value={form.purpose ?? ''} onChange={(v) => setForm({ ...form, purpose: v })} />
          </Field>
          <Field label="실행금 입금처">
            <SelectInput value={form.proceedsTo ?? 'cash'} onChange={(v: BucketKey) => setForm({ ...form, proceedsTo: v })} options={BUCKET_OPTIONS} />
          </Field>
          <div className="col-span-full flex gap-2">
            <Button onClick={save}>저장</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {loanDetails.map(({ loan, currentBalance, monthlyInterest, monthlyPayment, totalInterest: totalInt, maturityMonth, balloonPayment }) => (
          <div key={loan.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-2 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">{loan.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {loan.purpose} · {REPAYMENT_TYPE_OPTIONS.find((o) => o.value === loan.repaymentType)?.label} · 연{' '}
                  {formatPercent(loan.annualRate)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(loan)} className="text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                  수정
                </button>
                <button onClick={() => removeLoan(scenario.id, loan.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                  삭제
                </button>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-gray-500 dark:text-gray-400">현재 대출잔액</dt>
              <dd className="text-right tabular-nums">{formatWon(currentBalance)}</dd>
              <dt className="text-gray-500 dark:text-gray-400">월 이자</dt>
              <dd className="text-right tabular-nums">{formatWon(monthlyInterest)}</dd>
              <dt className="text-gray-500 dark:text-gray-400">월 상환금</dt>
              <dd className="text-right tabular-nums">{formatWon(monthlyPayment)}</dd>
              <dt className="text-gray-500 dark:text-gray-400">총 예상 이자</dt>
              <dd className="text-right tabular-nums">{formatWon(totalInt)}</dd>
              <dt className="text-gray-500 dark:text-gray-400">만기일</dt>
              <dd className="text-right">{formatYmKorean(maturityMonth)}</dd>
              {loan.repaymentType === 'bullet' && (
                <>
                  <dt className="text-gray-500 dark:text-gray-400">만기 시 필요 현금</dt>
                  <dd className="text-right tabular-nums">{formatWon(balloonPayment)}</dd>
                </>
              )}
            </dl>
          </div>
        ))}
        {scenario.loans.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-gray-400">등록된 대출이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
