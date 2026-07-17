import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type { Asset, CashFlowItem, Loan, Scenario, ScenarioSettings, TransferItem } from '../types';
import { buildSeedScenario } from './seed';

const DEFAULT_NEW_SCENARIO_SETTINGS: ScenarioSettings = {
  baseCurrency: 'KRW',
  startMonth: new Date().toISOString().slice(0, 7),
  forecastMonths: 36,
  monthlyEssentialLiving: 700_000,
  livingReserveMonths: 3,
  emergencyFund: 1_000_000,
  shortTermExpenseMonths: 3,
  investmentAllocationRate: 0.5,
};

interface DashboardState {
  scenarios: Scenario[];
  activeScenarioId: string;

  setActiveScenario: (id: string) => void;
  createScenario: (name: string, settings?: Partial<ScenarioSettings>) => string;
  cloneScenario: (id: string, newName: string) => string;
  renameScenario: (id: string, name: string) => void;
  deleteScenario: (id: string) => void;
  setDefaultScenario: (id: string) => void;

  updateSettings: (scenarioId: string, patch: Partial<ScenarioSettings>) => void;

  addAsset: (scenarioId: string, asset: Omit<Asset, 'id'>) => void;
  updateAsset: (scenarioId: string, id: string, patch: Partial<Asset>) => void;
  removeAsset: (scenarioId: string, id: string) => void;

  addCashFlow: (scenarioId: string, item: Omit<CashFlowItem, 'id'>) => void;
  updateCashFlow: (scenarioId: string, id: string, patch: Partial<CashFlowItem>) => void;
  removeCashFlow: (scenarioId: string, id: string) => void;

  addTransfer: (scenarioId: string, item: Omit<TransferItem, 'id'>) => void;
  updateTransfer: (scenarioId: string, id: string, patch: Partial<TransferItem>) => void;
  removeTransfer: (scenarioId: string, id: string) => void;

  addLoan: (scenarioId: string, item: Omit<Loan, 'id'>) => void;
  updateLoan: (scenarioId: string, id: string, patch: Partial<Loan>) => void;
  removeLoan: (scenarioId: string, id: string) => void;

  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
  resetToSeed: () => void;
}

function withScenario(scenarios: Scenario[], id: string, updater: (s: Scenario) => Scenario): Scenario[] {
  return scenarios.map((s) => (s.id === id ? updater(s) : s));
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      scenarios: [buildSeedScenario()],
      activeScenarioId: 'scenario-base',

      setActiveScenario: (id) => set({ activeScenarioId: id }),

      createScenario: (name, settings) => {
        const newId = uuid();
        const scenario: Scenario = {
          id: newId,
          name,
          isDefault: false,
          createdAt: new Date().toISOString(),
          settings: { ...DEFAULT_NEW_SCENARIO_SETTINGS, ...settings },
          assets: [],
          cashFlows: [],
          transfers: [],
          loans: [],
        };
        set((state) => ({ scenarios: [...state.scenarios, scenario] }));
        return newId;
      },

      cloneScenario: (id, newName) => {
        const src = get().scenarios.find((s) => s.id === id);
        if (!src) return id;
        const newId = uuid();
        const clone: Scenario = {
          ...src,
          id: newId,
          name: newName,
          isDefault: false,
          createdAt: new Date().toISOString(),
          baseScenarioId: src.id,
          assets: src.assets.map((a) => ({ ...a })),
          cashFlows: src.cashFlows.map((c) => ({ ...c })),
          transfers: src.transfers.map((t) => ({ ...t })),
          loans: src.loans.map((l) => ({ ...l })),
          settings: { ...src.settings },
        };
        set((state) => ({ scenarios: [...state.scenarios, clone] }));
        return newId;
      },

      renameScenario: (id, name) =>
        set((state) => ({ scenarios: withScenario(state.scenarios, id, (s) => ({ ...s, name })) })),

      deleteScenario: (id) =>
        set((state) => {
          const remaining = state.scenarios.filter((s) => s.id !== id);
          if (remaining.length === 0) return state; // never delete the last scenario
          const activeScenarioId =
            state.activeScenarioId === id ? (remaining.find((s) => s.isDefault) ?? remaining[0]).id : state.activeScenarioId;
          return { scenarios: remaining, activeScenarioId };
        }),

      setDefaultScenario: (id) =>
        set((state) => ({
          scenarios: state.scenarios.map((s) => ({ ...s, isDefault: s.id === id })),
        })),

      updateSettings: (scenarioId, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            settings: { ...s.settings, ...patch },
          })),
        })),

      addAsset: (scenarioId, asset) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            assets: [...s.assets, { ...asset, id: uuid() }],
          })),
        })),
      updateAsset: (scenarioId, id, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
          })),
        })),
      removeAsset: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            assets: s.assets.filter((a) => a.id !== id),
          })),
        })),

      addCashFlow: (scenarioId, item) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            cashFlows: [...s.cashFlows, { ...item, id: uuid() }],
          })),
        })),
      updateCashFlow: (scenarioId, id, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            cashFlows: s.cashFlows.map((c) => (c.id === id ? { ...c, ...patch } : c)),
          })),
        })),
      removeCashFlow: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            cashFlows: s.cashFlows.filter((c) => c.id !== id),
          })),
        })),

      addTransfer: (scenarioId, item) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            transfers: [...s.transfers, { ...item, id: uuid() }],
          })),
        })),
      updateTransfer: (scenarioId, id, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            transfers: s.transfers.map((t) => (t.id === id ? { ...t, ...patch } : t)),
          })),
        })),
      removeTransfer: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            transfers: s.transfers.filter((t) => t.id !== id),
          })),
        })),

      addLoan: (scenarioId, item) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            loans: [...s.loans, { ...item, id: uuid() }],
          })),
        })),
      updateLoan: (scenarioId, id, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            loans: s.loans.map((l) => (l.id === id ? { ...l, ...patch } : l)),
          })),
        })),
      removeLoan: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            loans: s.loans.filter((l) => l.id !== id),
          })),
        })),

      exportData: () => {
        const { scenarios, activeScenarioId } = get();
        return JSON.stringify({ scenarios, activeScenarioId }, null, 2);
      },

      importData: (json) => {
        try {
          const parsed = JSON.parse(json);
          if (!Array.isArray(parsed.scenarios) || parsed.scenarios.length === 0) {
            return { ok: false, error: '유효한 시나리오 데이터가 없습니다.' };
          }
          set({
            scenarios: parsed.scenarios,
            activeScenarioId: parsed.activeScenarioId ?? parsed.scenarios[0].id,
          });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: e instanceof Error ? e.message : String(e) };
        }
      },

      resetToSeed: () => {
        const seed = buildSeedScenario();
        set({ scenarios: [seed], activeScenarioId: seed.id });
      },
    }),
    {
      name: 'asset-planning-dashboard',
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export function useActiveScenario(): Scenario {
  const scenarios = useDashboardStore((s) => s.scenarios);
  const activeScenarioId = useDashboardStore((s) => s.activeScenarioId);
  return scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
}
