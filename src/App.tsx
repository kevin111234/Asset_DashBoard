import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useDashboardStore, useActiveScenario } from './store/store';
import Dashboard from './sections/Dashboard';
import AssetsSection from './sections/AssetsSection';
import CashFlowsSection from './sections/CashFlowsSection';
import TransfersSection from './sections/TransfersSection';
import LoansSection from './sections/LoansSection';
import MonthlyDetailSection from './sections/MonthlyDetailSection';
import ScenariosSection from './sections/ScenariosSection';
import { Button } from './components/inputs';

const TABS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'monthly', label: '월별 상세' },
  { key: 'assets', label: '자산 관리' },
  { key: 'cashflows', label: '현금흐름' },
  { key: 'transfers', label: '저축·투자' },
  { key: 'loans', label: '대출 관리' },
  { key: 'scenarios', label: '시나리오' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const scenarios = useDashboardStore((s) => s.scenarios);
  const activeScenarioId = useDashboardStore((s) => s.activeScenarioId);
  const setActiveScenario = useDashboardStore((s) => s.setActiveScenario);
  const exportData = useDashboardStore((s) => s.exportData);
  const importData = useDashboardStore((s) => s.importData);
  const scenario = useActiveScenario();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const sortedScenarios = useMemo(
    () => [...scenarios].sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1)),
    [scenarios],
  );

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-planning-dashboard-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setImportError(null);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(String(reader.result));
      if (!result.ok) setImportError(result.error);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Asset Planning Dashboard</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                원금과 현금흐름을 조정하며 미래의 가용현금을 시뮬레이션하는 자산관리 도구
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                value={activeScenarioId}
                onChange={(e) => setActiveScenario(e.target.value)}
              >
                {sortedScenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.isDefault ? ' (기본)' : ''}
                  </option>
                ))}
              </select>
              <Button variant="secondary" onClick={handleImportClick}>
                불러오기
              </Button>
              <Button variant="secondary" onClick={handleExport}>
                내보내기
              </Button>
              <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
            </div>
          </div>
          {importError && <p className="mt-2 text-xs text-red-600">불러오기 실패: {importError}</p>}
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:px-6 lg:px-8">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {tab === 'dashboard' && <Dashboard scenario={scenario} onNavigate={setTab} />}
        {tab === 'monthly' && <MonthlyDetailSection scenario={scenario} />}
        {tab === 'assets' && <AssetsSection scenario={scenario} />}
        {tab === 'cashflows' && <CashFlowsSection scenario={scenario} />}
        {tab === 'transfers' && <TransfersSection scenario={scenario} />}
        {tab === 'loans' && <LoansSection scenario={scenario} />}
        {tab === 'scenarios' && <ScenariosSection />}
      </main>
    </div>
  );
}
