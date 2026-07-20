import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuid } from 'uuid';
import type {
  Asset,
  EventException,
  FinEvent,
  RecentEventEntry,
  Scenario,
  ScenarioSettings,
  YearMonth,
} from '../types';
import { buildSeedScenario } from './seed';
import { currentYearMonth } from '../engine/month';

const RECENT_EVENTS_LIMIT = 8;

const DEFAULT_NEW_SCENARIO_SETTINGS: ScenarioSettings = {
  baseCurrency: 'KRW',
  startMonth: currentYearMonth(),
  forecastMonths: 36,
  minimumCashAmount: 3_000_000,
  shortTermExpenseMonths: 3,
};

interface DashboardState {
  scenarios: Scenario[];
  activeScenarioId: string;
  recentEvents: RecentEventEntry[];

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

  addEvent: (scenarioId: string, event: Omit<FinEvent, 'id'>) => string;
  updateEvent: (scenarioId: string, id: string, patch: Partial<FinEvent>) => void;
  removeEvent: (scenarioId: string, id: string) => void;
  duplicateEvent: (scenarioId: string, id: string) => string | null;
  toggleEventActive: (scenarioId: string, id: string) => void;
  setEventException: (scenarioId: string, id: string, month: YearMonth, exception: EventException | null) => void;

  exportData: () => string;
  importData: (json: string) => { ok: true } | { ok: false; error: string };
  resetToSeed: () => void;
}

function withScenario(scenarios: Scenario[], id: string, updater: (s: Scenario) => Scenario): Scenario[] {
  return scenarios.map((s) => (s.id === id ? updater(s) : s));
}

function pushRecentEvent(recent: RecentEventEntry[], entry: RecentEventEntry): RecentEventEntry[] {
  const deduped = recent.filter((r) => !(r.type === entry.type && r.name === entry.name));
  return [entry, ...deduped].slice(0, RECENT_EVENTS_LIMIT);
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      scenarios: [buildSeedScenario()],
      activeScenarioId: 'scenario-base',
      recentEvents: [],

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
          events: [],
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
          events: src.events.map((e) => ({
            ...e,
            recurrence: e.recurrence
              ? { ...e.recurrence, exceptions: e.recurrence.exceptions ? { ...e.recurrence.exceptions } : undefined }
              : undefined,
            transfer: e.transfer ? { ...e.transfer } : undefined,
            loan: e.loan ? { ...e.loan } : undefined,
          })),
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

      addEvent: (scenarioId, event) => {
        const newId = uuid();
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            events: [...s.events, { ...event, id: newId }],
          })),
          recentEvents: pushRecentEvent(state.recentEvents, {
            type: event.type,
            name: event.name,
            amount: event.amount,
            category: event.category,
            transferKind: event.transfer?.kind,
            recurrenceFrequency: event.recurrence?.frequency,
          }),
        }));
        return newId;
      },
      updateEvent: (scenarioId, id, patch) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          })),
        })),
      removeEvent: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            events: s.events.filter((e) => e.id !== id),
          })),
        })),
      duplicateEvent: (scenarioId, id) => {
        const scenario = get().scenarios.find((s) => s.id === scenarioId);
        const src = scenario?.events.find((e) => e.id === id);
        if (!src) return null;
        const newId = uuid();
        const clone: FinEvent = {
          ...src,
          id: newId,
          recurrence: src.recurrence
            ? { ...src.recurrence, exceptions: src.recurrence.exceptions ? { ...src.recurrence.exceptions } : undefined }
            : undefined,
          transfer: src.transfer ? { ...src.transfer } : undefined,
          loan: src.loan ? { ...src.loan } : undefined,
        };
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({ ...s, events: [...s.events, clone] })),
        }));
        return newId;
      },
      toggleEventActive: (scenarioId, id) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            events: s.events.map((e) => (e.id === id ? { ...e, active: !e.active } : e)),
          })),
        })),
      setEventException: (scenarioId, id, month, exception) =>
        set((state) => ({
          scenarios: withScenario(state.scenarios, scenarioId, (s) => ({
            ...s,
            events: s.events.map((e) => {
              if (e.id !== id || !e.recurrence) return e;
              const nextExceptions = { ...(e.recurrence.exceptions ?? {}) };
              if (exception === null) delete nextExceptions[month];
              else nextExceptions[month] = exception;
              return { ...e, recurrence: { ...e.recurrence, exceptions: nextExceptions } };
            }),
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
        set({ scenarios: [seed], activeScenarioId: seed.id, recentEvents: [] });
      },
    }),
    {
      name: 'asset-planning-dashboard',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // v1 scenarios used cashFlows/transfers/loans instead of a unified
      // events array; there is no lossless way to migrate that shape, so
      // fall back to a fresh seed rather than crash on old localStorage data.
      migrate: (persistedState, version) => {
        if (version < 2) {
          const seed = buildSeedScenario();
          return { scenarios: [seed], activeScenarioId: seed.id, recentEvents: [] };
        }
        return persistedState as DashboardState;
      },
    },
  ),
);

export function useActiveScenario(): Scenario {
  const scenarios = useDashboardStore((s) => s.scenarios);
  const activeScenarioId = useDashboardStore((s) => s.activeScenarioId);
  return scenarios.find((s) => s.id === activeScenarioId) ?? scenarios[0];
}
