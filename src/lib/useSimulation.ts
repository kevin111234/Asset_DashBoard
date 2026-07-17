import { useMemo } from 'react';
import type { Scenario } from '../types';
import { simulateScenario } from '../engine/engine';

export function useSimulation(scenario: Scenario) {
  return useMemo(() => simulateScenario(scenario), [scenario]);
}
