import { useState } from 'react';
import type { BucketKey, Recurrence, Scenario, TransferItem, TransferKind } from '../types';
import { useDashboardStore } from '../store/store';
import { BUCKET_OPTIONS, TRANSFER_KIND_OPTIONS, bucketLabel } from '../lib/options';
import { formatWon } from '../lib/format';
import { formatYmKorean } from '../engine/month';
import { Button, Field, MonthInput, NumberInput, SelectInput, TextInput } from '../components/inputs';

type FormState = Omit<TransferItem, 'id'>;

const EMPTY_FORM: FormState = {
  name: '',
  kind: 'saving',
  from: 'cash',
  to: 'government_savings',
  amount: 0,
  startMonth: new Date().toISOString().slice(0, 7),
  endMonth: undefined,
  recurrence: 'monthly',
  memo: '',
};

export default function TransfersSection({ scenario }: { scenario: Scenario }) {
  const addTransfer = useDashboardStore((s) => s.addTransfer);
  const updateTransfer = useDashboardStore((s) => s.updateTransfer);
  const removeTransfer = useDashboardStore((s) => s.removeTransfer);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(item: TransferItem) {
    const { id, ...rest } = item;
    void id;
    setForm(rest);
    setEditingId(item.id);
    setShowForm(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) updateTransfer(scenario.id, editingId, form);
    else addTransfer(scenario.id, form);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">저축 및 투자 계획</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            현금을 저축·투자 자산으로 이동하는 항목입니다. 지출로 계산되지 않고 순자산은 변화 없이 유지됩니다.
          </p>
        </div>
        <Button onClick={startAdd}>이동 항목 추가</Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
          <Field label="항목명">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label="구분">
            <SelectInput value={form.kind} onChange={(v: TransferKind) => setForm({ ...form, kind: v })} options={TRANSFER_KIND_OPTIONS} />
          </Field>
          <Field label="출발 (from)">
            <SelectInput value={form.from} onChange={(v: BucketKey) => setForm({ ...form, from: v })} options={BUCKET_OPTIONS} />
          </Field>
          <Field label="도착 (to)">
            <SelectInput value={form.to} onChange={(v: BucketKey) => setForm({ ...form, to: v })} options={BUCKET_OPTIONS} />
          </Field>
          <Field label="금액">
            <NumberInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} step={10000} />
          </Field>
          <Field label="시작월">
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
              <th className="px-3 py-2">이동 경로</th>
              <th className="px-3 py-2">금액</th>
              <th className="px-3 py-2">시작월</th>
              <th className="px-3 py-2">반복</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {scenario.transfers.map((t) => (
              <tr key={t.id}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{t.name}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.kind === 'saving' ? '저축' : '투자'}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                  {bucketLabel(t.from)} → {bucketLabel(t.to)}
                </td>
                <td className="px-3 py-2 tabular-nums">{formatWon(t.amount)}</td>
                <td className="px-3 py-2">
                  {formatYmKorean(t.startMonth)}
                  {t.endMonth ? ` ~ ${formatYmKorean(t.endMonth)}` : ''}
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{t.recurrence === 'monthly' ? '매월' : '1회'}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(t)} className="mr-2 text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    수정
                  </button>
                  <button onClick={() => removeTransfer(scenario.id, t.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {scenario.transfers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-gray-400">
                  등록된 저축/투자 이동 항목이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
