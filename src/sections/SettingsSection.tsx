import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Scenario } from '../types';
import { useDashboardStore } from '../store/store';
import ScenarioSettingsForm from '../components/ScenarioSettingsForm';
import { Button } from '../components/inputs';

export default function SettingsSection({ scenario }: { scenario: Scenario }) {
  const updateSettings = useDashboardStore((s) => s.updateSettings);
  const exportData = useDashboardStore((s) => s.exportData);
  const importData = useDashboardStore((s) => s.importData);
  const resetToSeed = useDashboardStore((s) => s.resetToSeed);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importOk, setImportOk] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportOk(false);
    const reader = new FileReader();
    reader.onload = () => {
      const result = importData(String(reader.result));
      if (!result.ok) setImportError(result.error);
      else setImportOk(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">설정</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">현재 시나리오({scenario.name})의 계산 기준과 데이터를 관리합니다.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">계산 기준</h3>
        <ScenarioSettingsForm value={scenario.settings} onChange={(patch) => updateSettings(scenario.id, patch)} />
        <p className="mt-3 text-xs text-gray-400">통화: KRW (원)</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">데이터 관리</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            JSON 불러오기
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            JSON 내보내기
          </Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </div>
        {importError && <p className="mt-2 text-xs text-red-600">불러오기 실패: {importError}</p>}
        {importOk && <p className="mt-2 text-xs text-emerald-600">불러오기 완료했습니다.</p>}

        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800">
          {confirmingReset ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500">전체 데이터를 초기화하고 기본 계획으로 되돌릴까요? 되돌릴 수 없습니다.</span>
              <button onClick={resetToSeed} className="font-medium text-red-600 hover:underline">
                초기화
              </button>
              <button onClick={() => setConfirmingReset(false)} className="text-gray-400 hover:underline">
                취소
              </button>
            </div>
          ) : (
            <Button variant="danger" onClick={() => setConfirmingReset(true)}>
              전체 데이터 초기화
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
