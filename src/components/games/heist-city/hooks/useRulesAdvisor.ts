/**
 * useRulesAdvisor — Advisor Lifecycle Hook
 *
 * Watches for game state changes and runs the appropriate validator
 * from the Rules Advisor (Phase 5). Produces advisory entries that
 * appear in the advisor panel.
 */

import { useRef, useCallback, useEffect, Dispatch } from 'react';
import { MapState, GridType, CharacterToken } from '../types';
import {
  AdvisorConfig,
  AdvisorEntry,
  shouldShow,
  validateMovement,
  validateStateChange,
  validateVPAward,
  validateTurnEnd,
  validateAlertLevel,
} from '../engine/advisor';
import { createInitialTurnState } from '../engine/turnStructure';
import { HeistCityAction } from './useHeistCityState';

// ============== Types ==============

export interface RulesAdvisorOptions {
  enabled: boolean;
  config: AdvisorConfig;
  mapState: MapState | null;
  turnNumber: number;
  gridType: GridType;
  alertModifier: number;
  dispatch: Dispatch<HeistCityAction>;
}

export interface AdvisorHookReturn {
  entries: AdvisorEntry[];
  clearEntries: () => void;
  updateConfig: (config: Partial<AdvisorConfig>) => void;
}

// ============== Hook ==============

export function useRulesAdvisor(options: RulesAdvisorOptions): AdvisorHookReturn {
  const { enabled, config, mapState, turnNumber, gridType, alertModifier, dispatch } = options;

  // Track previous state for diffing
  const prevMapStateRef = useRef<MapState | null>(null);
  const prevTurnRef = useRef(turnNumber);
  const entriesRef = useRef<AdvisorEntry[]>([]);

  // Diff and validate on mapState changes
  useEffect(() => {
    if (!enabled || !mapState) return;
    const prevMapState = prevMapStateRef.current;
    prevMapStateRef.current = mapState;

    if (!prevMapState) return;

    // Build a map of previous characters by ID for diffing
    const prevCharsById = new Map<string, CharacterToken>();
    for (const char of prevMapState.characters) {
      prevCharsById.set(char.id, char);
    }

    const newEntries: AdvisorEntry[] = [];

    // Check each character for changes
    for (const char of mapState.characters) {
      const prev = prevCharsById.get(char.id);
      if (!prev) continue;

      // Movement change
      if (prev.position.x !== char.position.x || prev.position.y !== char.position.y) {
        const moveEntries = validateMovement(char, prev.position, char.position, mapState, gridType);
        newEntries.push(...moveEntries);
      }

      // State change
      if (prev.state !== char.state) {
        // Determine the action that caused it (heuristic)
        const stateEntries = validateStateChange(char, prev.state, char.state, null);
        newEntries.push(...stateEntries);
      }

      // VP change
      const prevVP = prev.victoryPoints || 0;
      const newVP = char.victoryPoints || 0;
      if (prevVP !== newVP) {
        const vpEntries = validateVPAward(char, newVP - prevVP, prevVP);
        newEntries.push(...vpEntries);
      }
    }

    // Filter by config and dispatch
    for (const entry of newEntries) {
      if (shouldShow({ category: entry.category, severity: entry.severity }, config)) {
        dispatch({ type: 'ADD_ADVISOR_ENTRY', entry });
        entriesRef.current = [...entriesRef.current, entry];
      }
    }
  }, [enabled, mapState, config, gridType, dispatch]);

  // Turn end detection
  useEffect(() => {
    if (!enabled || !mapState || turnNumber === prevTurnRef.current) return;
    prevTurnRef.current = turnNumber;

    // Validate turn end and alert level
    const turnState = createInitialTurnState(mapState);
    const turnEntries = validateTurnEnd(mapState, turnState, alertModifier, 0);
    const alertEntries = validateAlertLevel(mapState, alertModifier, 0); // displayedLevel is 0 (auto-computed)

    const allEntries = [...turnEntries, ...alertEntries];
    for (const entry of allEntries) {
      if (shouldShow({ category: entry.category, severity: entry.severity }, config)) {
        dispatch({ type: 'ADD_ADVISOR_ENTRY', entry });
        entriesRef.current = [...entriesRef.current, entry];
      }
    }
  }, [enabled, mapState, turnNumber, alertModifier, config, dispatch]);

  const clearEntries = useCallback(() => {
    entriesRef.current = [];
    dispatch({ type: 'CLEAR_ADVISOR_ENTRIES' });
  }, [dispatch]);

  const updateConfig = useCallback((partial: Partial<AdvisorConfig>) => {
    dispatch({ type: 'SET_ADVISOR_CONFIG', config: { ...config, ...partial } });
  }, [config, dispatch]);

  return {
    entries: entriesRef.current,
    clearEntries,
    updateConfig,
  };
}
