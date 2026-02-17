/**
 * AI Adapter Tests
 *
 * Tests that the adapter correctly translates AI decisions into emitter calls
 * and produces correct log entries.
 */

import {
  rollDice,
  buildAILogEntry,
  buildAIPlanLogEntry,
  executeActivation,
  AIEmitters,
  AIActionResult,
} from '../aiAdapter';
import { AIActivation } from '../types';
import { MapState, CharacterToken } from '../../types';

// ============== Helpers ==============

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'Ninja',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
    },
    state: 'Hidden',
    ...overrides,
  };
}

function makeTarget(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return makeCharacter({
    id: 'enemy-1',
    playerId: 'p2',
    playerNumber: 2,
    position: { x: 1, y: 0 },
    name: 'Guard',
    role: 'Muscle',
    state: 'Overt',
    ...overrides,
  });
}

function makeMapState(chars: CharacterToken[]): MapState {
  return { items: [], characters: chars, zones: [] };
}

function makeEmitters(): AIEmitters & { calls: Record<string, any[][]> } {
  const calls: Record<string, any[][]> = {
    emitCharacterUpdate: [],
    emitDiceRoll: [],
    emitMapStateChange: [],
    emitGameInfoUpdate: [],
  };
  return {
    calls,
    emitCharacterUpdate: (...args: any[]) => calls.emitCharacterUpdate.push(args),
    emitDiceRoll: (...args: any[]) => calls.emitDiceRoll.push(args),
    emitMapStateChange: (...args: any[]) => calls.emitMapStateChange.push(args),
    emitGameInfoUpdate: (...args: any[]) => calls.emitGameInfoUpdate.push(args),
  };
}

// ============== Tests ==============

describe('aiAdapter', () => {
  describe('rollDice', () => {
    it('returns values in valid 2d6 range', () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDice();
        expect(roll.dice1).toBeGreaterThanOrEqual(1);
        expect(roll.dice1).toBeLessThanOrEqual(6);
        expect(roll.dice2).toBeGreaterThanOrEqual(1);
        expect(roll.dice2).toBeLessThanOrEqual(6);
        expect(roll.total).toBe(roll.dice1 + roll.dice2);
      }
    });
  });

  describe('buildAILogEntry', () => {
    it('creates an ai-action log entry', () => {
      const entry = buildAILogEntry('Ninja', 'Move', 'Moved to (3,2)');
      expect(entry.type).toBe('ai-action');
      expect(entry.playerName).toBe('AI');
      expect(entry.characterName).toBe('Ninja');
      expect(entry.actionName).toBe('Move');
      expect(entry.result).toBe('Moved to (3,2)');
      expect(entry.id).toMatch(/^ai-/);
    });

    it('includes target name when provided', () => {
      const entry = buildAILogEntry('Ninja', 'Plink Gun', 'Hit for 2 damage', 'Guard');
      expect(entry.targetName).toBe('Guard');
    });
  });

  describe('buildAIPlanLogEntry', () => {
    it('creates an ai-plan log entry', () => {
      const entry = buildAIPlanLogEntry('Aggressive push for VP');
      expect(entry.type).toBe('ai-plan');
      expect(entry.reasoning).toBe('Aggressive push for VP');
    });
  });

  describe('executeActivation', () => {
    it('executes a move action and calls emitCharacterUpdate', async () => {
      const char = makeCharacter();
      const ms = makeMapState([char]);
      const emitters = makeEmitters();

      const activation: AIActivation = {
        characterId: 'char-1',
        actions: [{
          slotIndex: 0,
          actionId: 'Move (5")',
          target: { x: 3, y: 0 },
        }],
        reasoning: 'Move to objective',
      };

      const results = await executeActivation(activation, ms, 'hex', emitters);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(results[0].logEntry.type).toBe('ai-action');
      expect(emitters.calls.emitCharacterUpdate.length).toBeGreaterThanOrEqual(1);
      // First call should be the move
      expect(emitters.calls.emitCharacterUpdate[0][1]).toEqual({ position: { x: 3, y: 0 } });
    });

    it('executes a special ability (Go Loud)', async () => {
      const char = makeCharacter({ state: 'Hidden' });
      const ms = makeMapState([char]);
      const emitters = makeEmitters();

      const activation: AIActivation = {
        characterId: 'char-1',
        actions: [{
          slotIndex: 0,
          actionId: 'Go Loud',
        }],
        reasoning: 'Go overt for combat',
      };

      const results = await executeActivation(activation, ms, 'hex', emitters);

      expect(results).toHaveLength(1);
      expect(results[0].stateChange).toBe('Overt');
      expect(emitters.calls.emitCharacterUpdate[0][1]).toEqual({ state: 'Overt' });
    });

    it('executes a hack action and rolls dice', async () => {
      const char = makeCharacter({ state: 'Hidden' });
      const ms = makeMapState([char]);
      const emitters = makeEmitters();

      const activation: AIActivation = {
        characterId: 'char-1',
        actions: [{
          slotIndex: 0,
          actionId: 'Hack',
          target: 'computer-1',
        }],
        reasoning: 'Hack computer for VP',
      };

      const results = await executeActivation(activation, ms, 'hex', emitters);

      expect(results).toHaveLength(1);
      expect(results[0].diceRoll).toBeDefined();
      expect(emitters.calls.emitDiceRoll).toHaveLength(1);
    });

    it('calls onStep callback for each action', async () => {
      const char = makeCharacter();
      const ms = makeMapState([char]);
      const emitters = makeEmitters();
      const steps: AIActionResult[] = [];

      const activation: AIActivation = {
        characterId: 'char-1',
        actions: [
          { slotIndex: 0, actionId: 'Move (5")', target: { x: 1, y: 0 } },
          { slotIndex: 1, actionId: 'Go Loud' },
        ],
        reasoning: 'Move and go loud',
      };

      await executeActivation(activation, ms, 'hex', emitters, (r) => steps.push(r));

      expect(steps).toHaveLength(2);
    });

    it('returns empty results for unknown character', async () => {
      const ms = makeMapState([]);
      const emitters = makeEmitters();

      const activation: AIActivation = {
        characterId: 'nonexistent',
        actions: [{ slotIndex: 0, actionId: 'Move (5")' }],
        reasoning: 'Test',
      };

      const results = await executeActivation(activation, ms, 'hex', emitters);
      expect(results).toHaveLength(0);
    });
  });
});
