import {
  computeAlertLevel,
  countRevealedUnits,
  getNPCActionCount,
  shouldSpawnElites,
  predictAlertLevel,
} from '../alertLevel';
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
    state: 'Hidden',
    ...overrides,
  };
}

function makeMapState(characters: CharacterToken[]): MapState {
  return { items: [], characters, zones: [] };
}

describe('alertLevel', () => {
  describe('countRevealedUnits', () => {
    it('counts Overt, Stunned, and Unconscious characters', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Hidden' }),
        makeCharacter({ id: '3', state: 'Disguised' }),
        makeCharacter({ id: '4', state: 'Stunned' }),
        makeCharacter({ id: '5', state: 'Unconscious' }),
      ]);
      expect(countRevealedUnits(mapState)).toBe(3); // Overt + Stunned + Unconscious
    });

    it('returns 0 when all are hidden/disguised', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Hidden' }),
        makeCharacter({ id: '2', state: 'Disguised' }),
      ]);
      expect(countRevealedUnits(mapState)).toBe(0);
    });
  });

  describe('computeAlertLevel', () => {
    it('level 0 when total <= 2', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Overt' }),
      ]);
      const result = computeAlertLevel(mapState, 0);
      expect(result.level).toBe(0);
      expect(result.unitsRevealed).toBe(2);
      expect(result.npcActionsPerActivation).toBe(0);
    });

    it('level 1 when total 3-5', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Overt' }),
        makeCharacter({ id: '3', state: 'Overt' }),
      ]);
      const result = computeAlertLevel(mapState, 0);
      expect(result.level).toBe(1);
      expect(result.npcActionsPerActivation).toBe(1);
    });

    it('level 2 when total 6-7', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Overt' }),
        makeCharacter({ id: '3', state: 'Overt' }),
        makeCharacter({ id: '4', state: 'Overt' }),
        makeCharacter({ id: '5', state: 'Overt' }),
        makeCharacter({ id: '6', state: 'Overt' }),
      ]);
      const result = computeAlertLevel(mapState, 0);
      expect(result.level).toBe(2);
      expect(result.npcActionsPerActivation).toBe(2);
    });

    it('level 3 when total >= 8', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Overt' }),
        makeCharacter({ id: '3', state: 'Overt' }),
        makeCharacter({ id: '4', state: 'Overt' }),
        makeCharacter({ id: '5', state: 'Overt' }),
        makeCharacter({ id: '6', state: 'Stunned' }),
        makeCharacter({ id: '7', state: 'Stunned' }),
        makeCharacter({ id: '8', state: 'Unconscious' }),
      ]);
      const result = computeAlertLevel(mapState, 0);
      expect(result.level).toBe(3);
      expect(result.npcActionsPerActivation).toBe(2);
    });

    it('includes alert modifier in total', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
      ]);
      // 1 overt + 2 modifier = 3 → level 1
      const result = computeAlertLevel(mapState, 2);
      expect(result.level).toBe(1);
      expect(result.total).toBe(3);
    });
  });

  describe('getNPCActionCount', () => {
    it('returns correct action counts', () => {
      expect(getNPCActionCount(0)).toBe(0);
      expect(getNPCActionCount(1)).toBe(1);
      expect(getNPCActionCount(2)).toBe(2);
      expect(getNPCActionCount(3)).toBe(2);
    });
  });

  describe('shouldSpawnElites', () => {
    it('only at level 3', () => {
      expect(shouldSpawnElites(0)).toBe(false);
      expect(shouldSpawnElites(1)).toBe(false);
      expect(shouldSpawnElites(2)).toBe(false);
      expect(shouldSpawnElites(3)).toBe(true);
    });
  });

  describe('predictAlertLevel', () => {
    it('predicts level with additional overt characters', () => {
      const mapState = makeMapState([
        makeCharacter({ id: '1', state: 'Overt' }),
        makeCharacter({ id: '2', state: 'Hidden' }),
      ]);
      // Currently 1 overt. If 2 more go overt: total = 3 → level 1
      const result = predictAlertLevel(mapState, 0, 2);
      expect(result.level).toBe(1);
      expect(result.unitsRevealed).toBe(3);
    });
  });
});
