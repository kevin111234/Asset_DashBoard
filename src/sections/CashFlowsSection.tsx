import { useMemo, useState } from 'react';
import type { CashFlowItem, ExpenseCategory, FlowType, IncomeCategory, Recurrence, Scenario } from '../types';
import { useDashboardStore } from '../store/store';
import { EXPENSE_CATEGORY_OPTIONS, INCOME_CATEGORY_OPTIONS } from '../lib/options';
import { categoryLabel } from '../engine/engine';
import { formatWon } from '../lib/format';
import { formatYmKorean } from '../engine/month';
import { Button, CheckboxInput, Field, MonthInput, NumberInput, SelectInput, TextInput } from '../components/inputs';

type FormState = Omit<CashFlowItem, 'id'>;

const EMPTY_FORM: FormState = {
  name: '',
  type: 'expense',
  category: 'other_expense',
  amount: 0,
  startMonth: new Date().toISOString().slice(0, 7),
  endMonth: undefined,
  recurrence: 'once',
  required: false,
  adjustable: true,
  memo: '',
};

export default function CashFlowsSection({ scenario }: { scenario: Scenario }) {
  const addCashFlow = useDashboardStore((s) => s.addCashFlow);
  const updateCashFlow = useDashboardStore((s) => s.updateCashFlow);
  const removeCashFlow = useDashboardStore((s) => s.removeCashFlow);

  const [filter, setFilter] = useState<'all' | FlowType>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const items = useMemo(
    () => scenario.cashFlows.filter((c) => filter === 'all' || c.type === filter),
    [scenario.cashFlows, filter],
  );

  function startAdd(type: FlowType) {
    setForm({ ...EMPTY_FORM, type, category: type === 'income' ? 'other_income' : 'other_expense' });
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(item: CashFlowItem) {
    const { id, ...rest } = item;
    void id;
    setForm(rest);
    setEditingId(item.id);
    setShowForm(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) updateCashFlow(scenario.id, editingId, form);
    else addCashFlow(scenario.id, form);
    setShowForm(false);
  }

  const categoryOptions = form.type === 'income' ? INCOME_CATEGORY_OPTIONS : EXPENSE_CATEGORY_OPTIONS;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['all', 'income', 'expense'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1 text-sm font-medium ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-gray-900 dark:text-gray-300'
              }`}
            >
              {f === 'all' ? '전체' : f === 'income' ? '수입' : '지출'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => startAdd('income')}>수입 추가</Button>
          <Button onClick={() => startAdd('expense')}>지출 추가</Button>
        </div>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
          <Field label="항목명">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label="구분">
            <SelectInput
              value={form.type}
              onChange={(v: FlowType) => setForm({ ...form, type: v, category: v === 'income' ? 'other_income' : 'other_expense' })}
              options={[
                { value: 'income', label: '수입' },
                { value: 'expense', label: '지출' },
              ]}
            />
          </Field>
          <Field label="카테고리">
            <SelectInput
              value={form.category}
              onChange={(v: IncomeCategory | ExpenseCategory) => setForm({ ...form, category: v })}
              options={categoryOptions}
            />
          </Field>
          <Field label="금액">
            <NumberInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} step={10000} />
          </Field>
          <Field label="발생월">
            <MonthInput value={form.startMonth} onChange={(v) => setForm({ ...form, startMonth: v })} />
          </Field>
          <Field label="반복 여부">
            <SelectInput
              value={form.recurrence}
              onChange={(v: Recurrence) => setForm({ ...form, recurrence: v })}
              options={[
                { value: 'once', label: '1회성' },
                { value: 'monthly', label: '매월 반복' },
              ]}
            />
          </Field>
          {form.recurrence === 'monthly' && (
            <Field label="종료월 (선택)">
              <MonthInput value={form.endMonth ?? ''} onChange={(v) => setForm({ ...form, endMonth: v || undefined })} />
            </Field>
          )}
          <Field label="메모">
            <TextInput value={form.memo ?? ''} onChange={(v) => setForm({ ...form, memo: v })} />
          </Field>
          <div className="flex items-end gap-3">
            <CheckboxInput checked={!!form.required} onChange={(v) => setForm({ ...form, required: v })} label="필수 지출" />
            <CheckboxInput checked={!!form.adjustable} onChange={(v) => setForm({ ...form, adjustable: v })} label="조정 가능" />
          </div>
          <div className="col-span-full flex gap-2">
            <Button onClick={save}>저장</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2">항목명</th>
              <th className="px-3 py-2">구분</th>
              <th className="px-3 py-2">카테고리</th>
              <th className="px-3 py-2">금액</th>
              <th className="px-3 py-2">발생월</th>
              <th className="px-3 py-2">반복</th>
              <th className="px-3 py-2">속성</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((c) => (
              <tr key={c.id}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{c.name}</td>
                <td className="px-3 py-2">
                  <span className={c.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                    {c.type === 'income' ? '수입' : '지출'}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{categoryLabel(c.category)}</td>
                <td className="px-3 py-2 tabular-nums">{formatWon(c.amount)}</td>
                <td className="px-3 py-2">
                  {formatYmKorean(c.startMonth)}
                  {c.endMonth ? ` ~ ${formatYmKorean(c.endMonth)}` : ''}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.recurrence === 'monthly' ? '매월' : '1회'}</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {c.required && <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">필수</span>}
                  {c.adjustable && <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-800">조정가능</span>}
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(c)} className="mr-2 text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    수정
                  </button>
                  <button onClick={() => removeCashFlow(scenario.id, c.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  등록된 항목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
