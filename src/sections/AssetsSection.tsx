import { useState } from 'react';
import type { Asset, AssetType, Liquidity, Scenario } from '../types';
import { useDashboardStore } from '../store/store';
import { ASSET_TYPE_OPTIONS, LIQUIDITY_OPTIONS, assetTypeLabel, liquidityLabel } from '../lib/options';
import { formatWon } from '../lib/format';
import { Button, CheckboxInput, Field, NumberInput, SelectInput, TextInput } from '../components/inputs';

type FormState = Omit<Asset, 'id'>;

const EMPTY_FORM: FormState = {
  name: '',
  type: 'cash',
  principal: 0,
  marketValue: 0,
  liquidity: 'immediate',
  includeInAvailableCash: true,
  note: '',
};

export default function AssetsSection({ scenario }: { scenario: Scenario }) {
  const addAsset = useDashboardStore((s) => s.addAsset);
  const updateAsset = useDashboardStore((s) => s.updateAsset);
  const removeAsset = useDashboardStore((s) => s.removeAsset);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function startEdit(asset: Asset) {
    const { id, ...rest } = asset;
    void id;
    setForm(rest);
    setEditingId(asset.id);
    setShowForm(true);
  }

  function save() {
    if (!form.name.trim()) return;
    if (editingId) {
      updateAsset(scenario.id, editingId, form);
    } else {
      addAsset(scenario.id, form);
    }
    setShowForm(false);
  }

  const totalMarketValue = scenario.assets.reduce((sum, a) => sum + a.marketValue, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">자산</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            현재 보유 자산의 시작 상태입니다. 총 평가금액: {formatWon(totalMarketValue)}
          </p>
        </div>
        <Button onClick={startAdd}>자산 추가</Button>
      </div>

      {showForm && (
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:grid-cols-4">
          <Field label="자산명">
            <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          </Field>
          <Field label="유형">
            <SelectInput value={form.type} onChange={(v: AssetType) => setForm({ ...form, type: v })} options={ASSET_TYPE_OPTIONS} />
          </Field>
          <Field label="원금">
            <NumberInput value={form.principal} onChange={(v) => setForm({ ...form, principal: v })} step={10000} />
          </Field>
          <Field label="현재 평가금액">
            <NumberInput value={form.marketValue} onChange={(v) => setForm({ ...form, marketValue: v })} step={10000} />
          </Field>
          <Field label="유동성">
            <SelectInput value={form.liquidity} onChange={(v: Liquidity) => setForm({ ...form, liquidity: v })} options={LIQUIDITY_OPTIONS} />
          </Field>
          <div className="flex items-end pb-1.5">
            <CheckboxInput
              checked={form.includeInAvailableCash}
              onChange={(v) => setForm({ ...form, includeInAvailableCash: v })}
              label="가용현금 계산에 포함"
            />
          </div>
          <Field label="메모">
            <TextInput value={form.note ?? ''} onChange={(v) => setForm({ ...form, note: v })} />
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
              <th className="px-3 py-2">자산명</th>
              <th className="px-3 py-2">유형</th>
              <th className="px-3 py-2">원금</th>
              <th className="px-3 py-2">평가금액</th>
              <th className="px-3 py-2">유동성</th>
              <th className="px-3 py-2">가용현금</th>
              <th className="px-3 py-2">메모</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {scenario.assets.map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{a.name}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{assetTypeLabel(a.type)}</td>
                <td className="px-3 py-2 tabular-nums">{formatWon(a.principal)}</td>
                <td className="px-3 py-2 tabular-nums">{formatWon(a.marketValue)}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{liquidityLabel(a.liquidity)}</td>
                <td className="px-3 py-2">{a.includeInAvailableCash ? '포함' : '제외'}</td>
                <td className="px-3 py-2 text-gray-500 dark:text-gray-500">{a.note}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => startEdit(a)} className="mr-2 text-xs text-indigo-600 hover:underline dark:text-indigo-400">
                    수정
                  </button>
                  <button onClick={() => removeAsset(scenario.id, a.id)} className="text-xs text-red-600 hover:underline dark:text-red-400">
                    삭제
                  </button>
                </td>
              </tr>
            ))}
            {scenario.assets.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-gray-400">
                  등록된 자산이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
