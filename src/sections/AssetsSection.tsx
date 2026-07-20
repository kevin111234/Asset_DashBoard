import { useMemo, useState } from 'react';
import type { Asset, AssetType, BucketKey, Liquidity, Scenario } from '../types';
import { assetBucketKey } from '../types';
import { useDashboardStore } from '../store/store';
import { useSimulation } from '../lib/useSimulation';
import { ALL_BUCKETS } from '../engine/engine';
import { generateMonthRange, formatYmKorean } from '../engine/month';
import { ASSET_TYPE_OPTIONS, LIQUIDITY_OPTIONS, assetTypeLabel, bucketLabel, liquidityLabel } from '../lib/options';
import { formatWon, formatWonSigned, formatPercent } from '../lib/format';
import { Button, CheckboxInput, Field, NumberInput, SelectInput, TextInput } from '../components/inputs';
import EventForm from '../components/EventForm';

type FormState = Omit<Asset, 'id'>;

const SELL_CATEGORY_BY_BUCKET: Partial<Record<BucketKey, string>> = {
  time_deposit: 'time_deposit',
  stock: 'stock',
  etf: 'etf',
  bond: 'bond',
  crypto: 'crypto',
  government_savings: 'government_savings',
};

const EMPTY_FORM: FormState = {
  name: '',
  type: 'cash',
  principal: 0,
  marketValue: 0,
  liquidity: 'immediate',
  includeInAvailableCash: true,
  expectedReturnRate: undefined,
  note: '',
};

export default function AssetsSection({ scenario }: { scenario: Scenario }) {
  const addAsset = useDashboardStore((s) => s.addAsset);
  const updateAsset = useDashboardStore((s) => s.updateAsset);
  const removeAsset = useDashboardStore((s) => s.removeAsset);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const simulation = useSimulation(scenario);
  const months = useMemo(
    () => generateMonthRange(scenario.settings.startMonth, scenario.settings.forecastMonths),
    [scenario.settings.startMonth, scenario.settings.forecastMonths],
  );
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const selectedIndex = simulation.months.findIndex((m) => m.month === selectedMonth);
  const selectedResult = simulation.months[selectedIndex] ?? simulation.months[0];

  // A sell event dated in `selectedMonth` executes before that month's own mark-to-market
  // growth is applied, so it can only draw on the balance the bucket *entered* the month
  // with — the previous month's closing balance (or the raw seed value for the first month).
  function openingBalance(bucket: BucketKey): number {
    if (selectedIndex > 0) return Math.round(simulation.months[selectedIndex - 1].assetBalances[bucket]);
    return scenario.assets.filter((a) => assetBucketKey(a) === bucket).reduce((sum, a) => sum + a.marketValue, 0);
  }

  const [sellTarget, setSellTarget] = useState<BucketKey | null>(null);

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

  const CASH_LIKE_TYPES: AssetType[] = ['cash', 'checking', 'parking'];
  function handleTypeChange(type: AssetType) {
    const cashLike = CASH_LIKE_TYPES.includes(type);
    setForm((f) => ({ ...f, type, includeInAvailableCash: cashLike, liquidity: cashLike ? 'immediate' : f.liquidity }));
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
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">자산 현황</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          타임라인의 모든 이벤트가 반영된 카테고리별 잔액입니다. 아래 초기 자산을 수정하거나 타임라인에서 이벤트를 바꾸면 여기도 즉시 갱신됩니다.
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">카테고리별 잔액</h3>
          <select
            className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatYmKorean(m)}
              </option>
            ))}
          </select>
        </div>

        {selectedResult && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                  <th className="py-1.5 pr-3">카테고리</th>
                  <th className="py-1.5 pr-3">잔액</th>
                  <th className="py-1.5 pr-3">이 달 평가손익</th>
                  <th className="py-1.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {ALL_BUCKETS.map((bucket) => {
                  const balance = selectedResult.assetBalances[bucket];
                  const growth = selectedResult.bucketGrowth[bucket];
                  return (
                    <tr key={bucket}>
                      <td className="py-1.5 pr-3 font-medium text-gray-800 dark:text-gray-200">{bucketLabel(bucket)}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{formatWon(balance)}</td>
                      <td
                        className={`py-1.5 pr-3 tabular-nums ${
                          growth ? (growth > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400') : 'text-gray-400'
                        }`}
                      >
                        {growth ? formatWonSigned(growth) : '-'}
                      </td>
                      <td className="py-1.5 text-right">
                        {bucket !== 'cash' && balance > 0 && (
                          <button
                            onClick={() => setSellTarget(bucket)}
                            className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            매도(현금화)
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-gray-400">
              이 달 평가손익(전체): {formatWonSigned(selectedResult.investmentGrowth)} · 순자산: {formatWon(selectedResult.netWorth)}
            </p>
          </div>
        )}
      </div>

      {sellTarget && (
        <EventForm
          scenarioId={scenario.id}
          mode="create"
          contextMonth={selectedMonth}
          initialType="transfer"
          initialTransferKind="investment"
          initialName={`${bucketLabel(sellTarget)} 매도`}
          initialAmount={openingBalance(sellTarget)}
          initialCategory={SELL_CATEGORY_BY_BUCKET[sellTarget] ?? 'other_transfer'}
          initialFromBucket={sellTarget}
          initialToBucket="cash"
          onClose={() => setSellTarget(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">초기 자산 등록</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            시뮬레이션 시작월 기준 보유 자산의 시작 상태입니다. 총 평가금액: {formatWon(totalMarketValue)}
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
            <SelectInput value={form.type} onChange={handleTypeChange} options={ASSET_TYPE_OPTIONS} />
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
          <Field label="연 기대수익률(%)">
            <NumberInput
              value={(form.expectedReturnRate ?? 0) * 100}
              onChange={(v) => setForm({ ...form, expectedReturnRate: v === 0 ? undefined : v / 100 })}
              step={0.5}
            />
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
              <th className="px-3 py-2">기대수익률</th>
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
                <td className="px-3 py-2 tabular-nums">{a.expectedReturnRate ? formatPercent(a.expectedReturnRate) : '-'}</td>
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
                <td colSpan={9} className="px-3 py-6 text-center text-gray-400">
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
