/**
 * useHeistCityState Tests — AI/Advisor reducer extensions
 *
 * Tests the new AI and Rules Advisor state fields and reducer actions
 * added in Phase 6.
 */

import {
  heistCityReducer,
  initialHeistCityState,
  HeistCityState,
} from '../useHeistCityState';
import { DEFAULT_ADVISOR_CONFIG, muteCategory, createAdvisorEntry } from '../../engine/advisor';

describe('heistCityReducer — AI/Advisor extensions', () => {
  // ============== Initial State ==============

  describe('initial state', () => {
    it('has AI disabled by default', () => {
      expect(initialHeistCityState.aiEnabled).toBe(false);
      expect(initialHeistCityState.aiDifficulty).toBe('normal');
      expect(initialHeistCityState.aiPlayerNumber).toBe(2);
      expect(initialHeistCityState.aiStatus).toBe('idle');
      expect(initialHeistCityState.aiError).toBeNull();
    });

    it('has advisor disabled by default', () => {
      expect(initialHeistCityState.advisorEnabled).toBe(false);
      expect(initialHeistCityState.advisorConfig).toEqual(DEFAULT_ADVISOR_CONFIG);
      expect(initialHeistCityState.advisorEntries).toEqual([]);
    });
  });

  // ============== AI Actions ==============

  describe('SET_AI_ENABLED', () => {
    it('enables AI', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_AI_ENABLED', enabled: true,
      });
      expect(state.aiEnabled).toBe(true);
    });

    it('disabling resets status to idle and clears error', () => {
      const running: HeistCityState = {
        ...initialHeistCityState,
        aiEnabled: true,
        aiStatus: 'executing',
        aiError: 'something',
      };
      const state = heistCityReducer(running, {
        type: 'SET_AI_ENABLED', enabled: false,
      });
      expect(state.aiEnabled).toBe(false);
      expect(state.aiStatus).toBe('idle');
      expect(state.aiError).toBeNull();
    });
  });

  describe('SET_AI_DIFFICULTY', () => {
    it('changes difficulty', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_AI_DIFFICULTY', difficulty: 'hard',
      });
      expect(state.aiDifficulty).toBe('hard');
    });
  });

  describe('SET_AI_PLAYER', () => {
    it('changes AI player number', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_AI_PLAYER', playerNumber: 1,
      });
      expect(state.aiPlayerNumber).toBe(1);
    });
  });

  describe('SET_AI_STATUS', () => {
    it('sets status', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_AI_STATUS', status: 'thinking',
      });
      expect(state.aiStatus).toBe('thinking');
      expect(state.aiError).toBeNull();
    });

    it('sets error with status', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_AI_STATUS', status: 'error', error: 'something broke',
      });
      expect(state.aiStatus).toBe('error');
      expect(state.aiError).toBe('something broke');
    });
  });

  // ============== Advisor Actions ==============

  describe('SET_ADVISOR_ENABLED', () => {
    it('enables advisor', () => {
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_ADVISOR_ENABLED', enabled: true,
      });
      expect(state.advisorEnabled).toBe(true);
    });
  });

  describe('SET_ADVISOR_CONFIG', () => {
    it('replaces advisor config', () => {
      const newConfig = muteCategory(DEFAULT_ADVISOR_CONFIG, 'movement');
      const state = heistCityReducer(initialHeistCityState, {
        type: 'SET_ADVISOR_CONFIG', config: newConfig,
      });
      expect(state.advisorConfig.mutedCategories.has('movement')).toBe(true);
    });
  });

  describe('ADD_ADVISOR_ENTRY', () => {
    it('appends entry to list', () => {
      const entry = createAdvisorEntry('movement', 'warning', 'Test');
      const state = heistCityReducer(initialHeistCityState, {
        type: 'ADD_ADVISOR_ENTRY', entry,
      });
      expect(state.advisorEntries).toHaveLength(1);
      expect(state.advisorEntries[0].message).toBe('Test');
    });

    it('accumulates entries', () => {
      const e1 = createAdvisorEntry('movement', 'warning', 'First');
      const s1 = heistCityReducer(initialHeistCityState, { type: 'ADD_ADVISOR_ENTRY', entry: e1 });
      const e2 = createAdvisorEntry('combat', 'error', 'Second');
      const s2 = heistCityReducer(s1, { type: 'ADD_ADVISOR_ENTRY', entry: e2 });
      expect(s2.advisorEntries).toHaveLength(2);
    });
  });

  describe('CLEAR_ADVISOR_ENTRIES', () => {
    it('clears all entries', () => {
      const entry = createAdvisorEntry('movement', 'warning', 'Test');
      const withEntry = heistCityReducer(initialHeistCityState, {
        type: 'ADD_ADVISOR_ENTRY', entry,
      });
      expect(withEntry.advisorEntries).toHaveLength(1);

      const cleared = heistCityReducer(withEntry, { type: 'CLEAR_ADVISOR_ENTRIES' });
      expect(cleared.advisorEntries).toHaveLength(0);
    });
  });
});
