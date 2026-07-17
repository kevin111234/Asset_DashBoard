import type { Scenario } from '../types';
import { useDashboardStore } from '../store/store';
import { formatWon, formatPercent } from '../lib/format';

interface SliderRow {
  key: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  display: (v: number) => string;
}

export default function QuickAdjustPanel({ scenario }: { scenario: Scenario }) {
  const updateCashFlow = useDashboardStore((s) => s.updateCashFlow);
  const updateTransfer = useDashboardStore((s) => s.updateTransfer);
  const updateLoan = useDashboardStore((s) => s.updateLoan);
  const updateSettings = useDashboardStore((s) => s.updateSettings);

  const partTime = scenario.cashFlows.find((c) => c.id === 'income-part-time');
  const rent = scenario.cashFlows.find((c) => c.id === 'expense-rent');
  const living = scenario.cashFlows.find((c) => c.id === 'expense-living');
  const govSavings = scenario.transfers.find((t) => t.id === 'transfer-gov-savings');
  const depositEquity = scenario.transfers.find((t) => t.id === 'transfer-deposit-equity');
  const loan = scenario.loans.find((l) => l.id === 'loan-deposit');
  const iphone = scenario.cashFlows.find((c) => c.id === 'expense-iphone');
  const macmini = scenario.cashFlows.find((c) => c.id === 'expense-macmini');

  const rows: SliderRow[] = [];
  if (partTime) {
    rows.push({
      key: partTime.id,
      label: '아르바이트 월수입',
      value: partTime.amount,
      min: 0,
      max: 4_000_000,
      step: 50_000,
      onChange: (v) => updateCashFlow(scenario.id, partTime.id, { amount: v }),
      display: formatWon,
    });
  }
  if (rent) {
    rows.push({
      key: rent.id,
      label: '월세',
      value: rent.amount,
      min: 0,
      max: 1_500_000,
      step: 10_000,
      onChange: (v) => updateCashFlow(scenario.id, rent.id, { amount: v }),
      display: formatWon,
    });
  }
  if (living) {
    rows.push({
      key: living.id,
      label: '생활비',
      value: living.amount,
      min: 0,
      max: 2_000_000,
      step: 10_000,
      onChange: (v) => updateCashFlow(scenario.id, living.id, { amount: v }),
      display: formatWon,
    });
  }
  if (govSavings) {
    rows.push({
      key: govSavings.id,
      label: '정부지원 저축 납입',
      value: govSavings.amount,
      min: 0,
      max: 1_000_000,
      step: 10_000,
      onChange: (v) => updateTransfer(scenario.id, govSavings.id, { amount: v }),
      display: formatWon,
    });
  }
  rows.push({
    key: 'investment-rate',
    label: '투자배분율',
    value: scenario.settings.investmentAllocationRate,
    min: 0,
    max: 1,
    step: 0.05,
    onChange: (v) => updateSettings(scenario.id, { investmentAllocationRate: v }),
    display: (v) => formatPercent(v, 0),
  });
  if (depositEquity) {
    rows.push({
      key: depositEquity.id,
      label: '보증금 자기자본',
      value: depositEquity.amount,
      min: 0,
      max: 10_000_000,
      step: 100_000,
      onChange: (v) => updateTransfer(scenario.id, depositEquity.id, { amount: v }),
      display: formatWon,
    });
  }
  if (loan) {
    rows.push({
      key: `${loan.id}-principal`,
      label: '대출금',
      value: loan.principal,
      min: 0,
      max: 20_000_000,
      step: 100_000,
      onChange: (v) => updateLoan(scenario.id, loan.id, { principal: v }),
      display: formatWon,
    });
    rows.push({
      key: `${loan.id}-rate`,
      label: '대출금리(연)',
      value: loan.annualRate,
      min: 0,
      max: 0.1,
      step: 0.001,
      onChange: (v) => updateLoan(scenario.id, loan.id, { annualRate: v }),
      display: (v) => formatPercent(v, 2),
    });
  }
  if (iphone) {
    rows.push({
      key: iphone.id,
      label: '아이폰 구매금액',
      value: iphone.amount,
      min: 0,
      max: 2_500_000,
      step: 10_000,
      onChange: (v) => updateCashFlow(scenario.id, iphone.id, { amount: v }),
      display: formatWon,
    });
  }
  if (macmini) {
    rows.push({
      key: macmini.id,
      label: '맥미니 구매금액',
      value: macmini.amount,
      min: 0,
      max: 3_000_000,
      step: 10_000,
      onChange: (v) => updateCashFlow(scenario.id, macmini.id, { amount: v }),
      display: formatWon,
    });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">빠른 조정 패널</h3>
      <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-0.5 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">{row.label}</span>
              <span className="font-medium tabular-nums text-gray-800 dark:text-gray-200">{row.display(row.value)}</span>
            </div>
            <input
              type="range"
              min={row.min}
              max={row.max}
              step={row.step}
              value={row.value}
              onChange={(e) => row.onChange(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-400">조정 가능한 기본 항목이 없습니다.</p>}
      </div>
    </div>
  );
}
