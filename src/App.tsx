import { useMemo, useState } from 'react';
import { useDashboardStore, useActiveScenario } from './store/store';
import Dashboard from './sections/Dashboard';
import Timeline from './sections/Timeline';
import AssetsSection from './sections/AssetsSection';
import ScenariosSection from './sections/ScenariosSection';
import SettingsSection from './sections/SettingsSection';

const TABS = [
  { key: 'dashboard', label: '대시보드' },
  { key: 'timeline', label: '타임라인' },
  { key: 'assets', label: '자산' },
  { key: 'scenarios', label: '시나리오' },
  { key: 'settings', label: '설정' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const scenarios = useDashboardStore((s) => s.scenarios);
  const activeScenarioId = useDashboardStore((s) => s.activeScenarioId);
  const setActiveScenario = useDashboardStore((s) => s.setActiveScenario);
  const scenario = useActiveScenario();

  const sortedScenarios = useMemo(
    () => [...scenarios].sort((a, b) => (a.isDefault === b.isDefault ? 0 : a.isDefault ? -1 : 1)),
    [scenarios],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Asset Planning Dashboard</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                월을 선택하고, 이벤트를 추가하고, 금액을 바꾸면 미래 현금이 즉시 다시 계산됩니다.
              </p>
            </div>
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
          </div>
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
        {tab === 'timeline' && <Timeline scenario={scenario} />}
        {tab === 'assets' && <AssetsSection scenario={scenario} />}
        {tab === 'scenarios' && <ScenariosSection />}
        {tab === 'settings' && <SettingsSection scenario={scenario} />}
      </main>
    </div>
  );
}
