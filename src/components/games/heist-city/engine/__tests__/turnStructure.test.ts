import {
  createInitialTurnState,
  getNextActivatingPlayer,
  markActivated,
  allPlayersActivated,
  advanceToNPCPhase,
  advanceToEndOfTurn,
  advanceToNextTurn,
  getEndOfTurnUpdates,
  isFinalTurn,
  getActivatableCharacters,
} from '../turnStructure';
import { MapState, CharacterToken } from '../../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'Test',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
    },
    state: 'Overt',
    ...overrides,
  };
}

function makeMapState(characters: CharacterToken[]): MapState {
  return { items: [], characters, zones: [] };
}

describe('turnStructure', () => {
  const p1Char = makeCharacter({ id: 'p1-ninja', playerNumber: 1 });
  const p2Char = makeCharacter({ id: 'p2-face', playerNumber: 2, role: 'Face' });
  const mapState = makeMapState([p1Char, p2Char]);

  describe('createInitialTurnState', () => {
    it('starts at turn 1 with player 1', () => {
      const state = createInitialTurnState(mapState);
      expect(state.turnNumber).toBe(1);
      expect(state.activePlayerNumber).toBe(1);
      expect(state.phase).toBe('player-activation');
    });

    it('marks all non-Unconscious characters as needing activation', () => {
      const state = createInitialTurnState(mapState);
      expect(state.activationsRemaining.get('p1-ninja')).toBe(true);
      expect(state.activationsRemaining.get('p2-face')).toBe(true);
    });

    it('excludes Unconscious characters', () => {
      const unconscious = makeCharacter({ id: 'ko', state: 'Unconscious', playerNumber: 1 });
      const ms = makeMapState([p1Char, p2Char, unconscious]);
      const state = createInitialTurnState(ms);
      expect(state.activationsRemaining.has('ko')).toBe(false);
    });
  });

  describe('markActivated', () => {
    it('marks character as activated and switches player', () => {
      const state = createInitialTurnState(mapState);
      const updated = markActivated(state, 'p1-ninja', mapState);
      expect(updated.activationsRemaining.get('p1-ninja')).toBe(false);
      expect(updated.activePlayerNumber).toBe(2);
    });
  });

  describe('allPlayersActivated', () => {
    it('returns false when some characters haven\'t activated', () => {
      const state = createInitialTurnState(mapState);
      expect(allPlayersActivated(state, mapState)).toBe(false);
    });

    it('returns true when all have activated', () => {
      let state = createInitialTurnState(mapState);
      state = markActivated(state, 'p1-ninja', mapState);
      state = markActivated(state, 'p2-face', mapState);
      expect(allPlayersActivated(state, mapState)).toBe(true);
    });
  });

  describe('getNextActivatingPlayer', () => {
    it('switches when both have remaining', () => {
      const state = createInitialTurnState(mapState);
      expect(getNextActivatingPlayer(state, mapState)).toBe(1); // starts with p1
    });

    it('continues with remaining player when other is done', () => {
      // Only p1 has characters
      const soloMap = makeMapState([
        makeCharacter({ id: 'a', playerNumber: 1 }),
        makeCharacter({ id: 'b', playerNumber: 1 }),
      ]);
      const state = createInitialTurnState(soloMap);
      expect(getNextActivatingPlayer(state, soloMap)).toBe(1);
    });
  });

  describe('getActivatableCharacters', () => {
    it('returns unactivated characters for the given player', () => {
      const state = createInitialTurnState(mapState);
      const chars = getActivatableCharacters(state, mapState, 1);
      expect(chars).toHaveLength(1);
      expect(chars[0].id).toBe('p1-ninja');
    });
  });

  describe('phase transitions', () => {
    it('advances to NPC phase', () => {
      const state = createInitialTurnState(mapState);
      const npcPhase = advanceToNPCPhase(state);
      expect(npcPhase.phase).toBe('npc-phase');
    });

    it('advances to end of turn', () => {
      const state = advanceToNPCPhase(createInitialTurnState(mapState));
      const endOfTurn = advanceToEndOfTurn(state);
      expect(endOfTurn.phase).toBe('end-of-turn');
      expect(endOfTurn.npcPhaseComplete).toBe(true);
    });

    it('advances to next turn', () => {
      const state = createInitialTurnState(mapState);
      const nextTurn = advanceToNextTurn(state, mapState);
      expect(nextTurn.turnNumber).toBe(2);
      expect(nextTurn.phase).toBe('player-activation');
      // All characters should be reset to needing activation
      expect(nextTurn.activationsRemaining.get('p1-ninja')).toBe(true);
    });

    it('game over after turn 5', () => {
      const state = { ...createInitialTurnState(mapState), turnNumber: 5 };
      const gameOver = advanceToNextTurn(state, mapState);
      expect(gameOver.phase).toBe('game-over');
      expect(gameOver.turnNumber).toBe(6);
    });
  });

  describe('getEndOfTurnUpdates', () => {
    it('clears actions and resets exhausted', () => {
      const chars = [
        makeCharacter({ id: 'a', actions: ['Move', 'Hack'], exhausted: true }),
      ];
      const ms = makeMapState(chars);
      const updated = getEndOfTurnUpdates(ms);
      expect(updated[0].actions).toEqual([]);
      expect(updated[0].exhausted).toBe(false);
    });

    it('does not modify Unconscious characters', () => {
      const chars = [
        makeCharacter({ id: 'ko', state: 'Unconscious', actions: ['old'], exhausted: true }),
      ];
      const ms = makeMapState(chars);
      const updated = getEndOfTurnUpdates(ms);
      expect(updated[0].actions).toEqual(['old']);
      expect(updated[0].exhausted).toBe(true);
    });
  });

  describe('isFinalTurn', () => {
    it('true on turn 5', () => {
      expect(isFinalTurn({ ...createInitialTurnState(mapState), turnNumber: 5 })).toBe(true);
    });

    it('false before turn 5', () => {
      expect(isFinalTurn(createInitialTurnState(mapState))).toBe(false);
    });
  });
});
