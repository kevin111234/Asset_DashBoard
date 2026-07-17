import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useDashboardStore } from '../store/store';
import { simulateScenario } from '../engine/engine';
import { formatWon, formatManwon } from '../lib/format';
import { formatYmKorean } from '../engine/month';
import { Button, TextInput } from '../components/inputs';

export default function ScenariosSection() {
  const scenarios = useDashboardStore((s) => s.scenarios);
  const activeScenarioId = useDashboardStore((s) => s.activeScenarioId);
  const setActiveScenario = useDashboardStore((s) => s.setActiveScenario);
  const cloneScenario = useDashboardStore((s) => s.cloneScenario);
  const renameScenario = useDashboardStore((s) => s.renameScenario);
  const deleteScenario = useDashboardStore((s) => s.deleteScenario);
  const setDefaultScenario = useDashboardStore((s) => s.setDefaultScenario);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [cloneSourceId, setCloneSourceId] = useState<string | null>(null);
  const [cloneName, setCloneName] = useState('');

  const [compareA, setCompareA] = useState<string>(activeScenarioId);
  const [compareB, setCompareB] = useState<string>(scenarios.find((s) => s.id !== activeScenarioId)?.id ?? activeScenarioId);

  const scenarioA = scenarios.find((s) => s.id === compareA);
  const scenarioB = scenarios.find((s) => s.id === compareB);

  const compareChart = useMemo(() => {
    if (!scenarioA || !scenarioB) return [];
    const simA = simulateScenario(scenarioA);
    const simB = simulateScenario(scenarioB);
    const len = Math.min(simA.months.length, simB.months.length, 36);
    return Array.from({ length: len }, (_, i) => ({
      month: formatYmKorean(simA.months[i].month).replace('년 ', '.').replace('월', ''),
      [`${scenarioA.name} 가용현금`]: simA.months[i].availableCash,
      [`${scenarioB.name} 가용현금`]: simB.months[i].availableCash,
    }));
  }, [scenarioA, scenarioB]);

  const summaryA = scenarioA ? simulateScenario(scenarioA).months : [];
  const summaryB = scenarioB ? simulateScenario(scenarioB).months : [];

  function startClone(id: string, currentName: string) {
    setCloneSourceId(id);
    setCloneName(`${currentName} 복제본`);
  }

  function confirmClone() {
    if (!cloneSourceId || !cloneName.trim()) return;
    const newId = cloneScenario(cloneSourceId, cloneName.trim());
    setCloneSourceId(null);
    setCloneName('');
    setActiveScenario(newId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">시나리오 관리</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">동일한 원본 데이터를 기반으로 여러 재무 계획을 저장하고 비교합니다.</p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="text-left text-xs font-medium text-gray-500 dark:text-gray-400">
              <th className="px-3 py-2">이름</th>
              <th className="px-3 py-2">기본</th>
              <th className="px-3 py-2">예측 기간</th>
              <th className="px-3 py-2">생성일</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {scenarios.map((s) => (
              <tr key={s.id} className={s.id === activeScenarioId ? 'bg-indigo-50/60 dark:bg-indigo-900/10' : ''}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">
                  {renamingId === s.id ? (
                    <div className="flex gap-2">
                      <TextInput value={renameValue} onChange={setRenameValue} />
                      <Button
                        onClick={() => {
                          if (renameValue.trim()) renameScenario(s.id, renameValue.trim());
                          setRenamingId(null);
                        }}
                      >
                        확인
                      </Button>
                    </div>
                  ) : (
                    s.name
                  )}
                </td>
                <td className="px-3 py-2">{s.isDefault ? '⭐' : ''}</td>
                <td className="px-3 py-2">{s.settings.forecastMonths}개월</td>
                <td className="px-3 py-2 text-gray-500">{new Date(s.createdAt).toLocaleDateString('ko-KR')}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2 text-xs">
                    <button onClick={() => setActiveScenario(s.id)} className="text-indigo-600 hover:underline dark:text-indigo-400">
                      선택
                    </button>
                    <button
                      onClick={() => {
                        setRenamingId(s.id);
                        setRenameValue(s.name);
                      }}
                      className="text-gray-600 hover:underline dark:text-gray-400"
                    >
                      이름변경
                    </button>
                    <button onClick={() => startClone(s.id, s.name)} className="text-gray-600 hover:underline dark:text-gray-400">
                      복제
                    </button>
                    {!s.isDefault && (
                      <button onClick={() => setDefaultScenario(s.id)} className="text-gray-600 hover:underline dark:text-gray-400">
                        기본으로 지정
                      </button>
                    )}
                    {scenarios.length > 1 && (
                      <button onClick={() => deleteScenario(s.id)} className="text-red-600 hover:underline dark:text-red-400">
                        삭제
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cloneSourceId && (
        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <span className="text-sm text-gray-600 dark:text-gray-400">새 시나리오 이름:</span>
          <TextInput value={cloneName} onChange={setCloneName} />
          <Button onClick={confirmClone}>복제 생성</Button>
          <Button variant="secondary" onClick={() => setCloneSourceId(null)}>
            취소
          </Button>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-200">시나리오 비교</h3>
        <div className="mb-4 flex flex-wrap gap-3">
          <select className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900" value={compareA} onChange={(e) => setCompareA(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="self-center text-sm text-gray-400">vs</span>
          <select className="rounded-md border border-gray-300 px-2.5 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900" value={compareB} onChange={(e) => setCompareB(e.target.value)}>
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {scenarioA && scenarioB && (
          <>
            <div className="mb-4 grid grid-cols-2 gap-4">
              {[{ name: scenarioA.name, months: summaryA }, { name: scenarioB.name, months: summaryB }].map((col, colIdx) => {
                const m0 = col.months[0];
                const m12 = col.months[Math.min(11, col.months.length - 1)];
                return (
                  <div key={colIdx} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                    <h4 className="mb-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{col.name}</h4>
                    {m0 ? (
                      <dl className="grid grid-cols-2 gap-y-1 text-xs">
                        <dt className="text-gray-500">이번 달 잔액</dt>
                        <dd className="text-right tabular-nums">{formatWon(m0.endCash)}</dd>
                        <dt className="text-gray-500">가용현금</dt>
                        <dd className="text-right tabular-nums">{formatWon(m0.availableCash)}</dd>
                        <dt className="text-gray-500">순자산</dt>
                        <dd className="text-right tabular-nums">{formatWon(m0.netWorth)}</dd>
                        <dt className="text-gray-500">12개월 후 현금</dt>
                        <dd className="text-right tabular-nums">{formatWon(m12.endCash)}</dd>
                      </dl>
                    ) : (
                      <p className="text-xs text-gray-400">데이터 없음</p>
                    )}
                  </div>
                );
              })}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={compareChart}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-800" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => formatManwon(v)} width={56} />
                <Tooltip formatter={(v) => formatWon(Number(v))} />
                <Legend />
                <Line type="monotone" dataKey={`${scenarioA.name} 가용현금`} stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey={`${scenarioB.name} 가용현금`} stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
