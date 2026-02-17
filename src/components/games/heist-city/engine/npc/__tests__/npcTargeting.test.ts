import { isVisibleToMob, selectMobTarget, resolveMobTargetTiebreak } from '../npcTargeting';
import { CharacterToken, MapItem, MapState } from '../../../types';

function makeCharacter(overrides: Partial<CharacterToken> = {}): CharacterToken {
  return {
    id: 'char-1',
    playerId: 'p1',
    playerNumber: 1,
    position: { x: 0, y: 0 },
    color: '#ff0000',
    name: 'TestChar',
    role: 'Ninja',
    stats: {
      movement: 5, meleeSkill: 7, ballisticSkill: 9,
      wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
    },
    state: 'Overt',
    equipment: [],
    ...overrides,
  };
}

function makeGuard(overrides: Partial<MapItem> = {}): MapItem {
  return {
    id: 'guard-1',
    type: 'enemy-security-guard',
    position: { x: 5, y: 0 },
    ...overrides,
  };
}

function makeMapState(
  items: MapItem[] = [],
  characters: CharacterToken[] = []
): MapState {
  return { items, characters, zones: [] };
}

describe('npcTargeting', () => {
  describe('isVisibleToMob', () => {
    it('Overt characters are visible', () => {
      const char = makeCharacter({ state: 'Overt' });
      expect(isVisibleToMob(char)).toBe(true);
    });

    it('Hidden characters are invisible', () => {
      const char = makeCharacter({ state: 'Hidden' });
      expect(isVisibleToMob(char)).toBe(false);
    });

    it('Disguised characters are invisible', () => {
      const char = makeCharacter({ state: 'Disguised' });
      expect(isVisibleToMob(char)).toBe(false);
    });

    it('Stunned characters are not targeted', () => {
      const char = makeCharacter({ state: 'Stunned' });
      expect(isVisibleToMob(char)).toBe(false);
    });

    it('Unconscious characters are not targeted', () => {
      const char = makeCharacter({ state: 'Unconscious' });
      expect(isVisibleToMob(char)).toBe(false);
    });

    it('security-uniform grants immunity', () => {
      const char = makeCharacter({ equipment: ['security-uniform'] });
      expect(isVisibleToMob(char)).toBe(false);
    });

    it('in-plain-sight action grants immunity', () => {
      const char = makeCharacter({ actions: ['in-plain-sight'] });
      expect(isVisibleToMob(char)).toBe(false);
    });
  });

  describe('selectMobTarget', () => {
    it('targets nearest Overt character', () => {
      const nearOvert = makeCharacter({ id: 'near', position: { x: 3, y: 0 }, state: 'Overt' });
      const farOvert = makeCharacter({ id: 'far', position: { x: 8, y: 0 }, state: 'Overt' });
      const guard = makeGuard({ position: { x: 5, y: 0 } });
      const ms = makeMapState([guard], [nearOvert, farOvert]);

      const result = selectMobTarget(guard, ms, 'hex');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('near');
    });

    it('ignores Hidden characters', () => {
      const hidden = makeCharacter({ id: 'hidden', position: { x: 2, y: 0 }, state: 'Hidden' });
      const overt = makeCharacter({ id: 'overt', position: { x: 8, y: 0 }, state: 'Overt' });
      const guard = makeGuard({ position: { x: 5, y: 0 } });
      const ms = makeMapState([guard], [hidden, overt]);

      const result = selectMobTarget(guard, ms, 'hex');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('overt');
    });

    it('returns null when all characters are Hidden', () => {
      const h1 = makeCharacter({ id: 'h1', state: 'Hidden' });
      const h2 = makeCharacter({ id: 'h2', state: 'Hidden', position: { x: 3, y: 0 } });
      const guard = makeGuard();
      const ms = makeMapState([guard], [h1, h2]);

      expect(selectMobTarget(guard, ms, 'hex')).toBeNull();
    });

    it('tiebreaks by lower defense', () => {
      // Both at same distance from guard, different defense
      const lowDef = makeCharacter({
        id: 'low-def', position: { x: 3, y: 0 }, state: 'Overt',
        stats: { movement: 5, meleeSkill: 7, ballisticSkill: 9, wounds: 7, maxWounds: 7, defense: 7, hack: 8, con: 8 },
      });
      const highDef = makeCharacter({
        id: 'high-def', position: { x: 7, y: 0 }, state: 'Overt',
        stats: { movement: 5, meleeSkill: 7, ballisticSkill: 9, wounds: 7, maxWounds: 7, defense: 10, hack: 8, con: 8 },
      });
      const guard = makeGuard({ position: { x: 5, y: 0 } });
      const ms = makeMapState([guard], [lowDef, highDef]);

      const result = selectMobTarget(guard, ms, 'hex');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('low-def');
    });

    it('returns null when no characters exist', () => {
      const guard = makeGuard();
      const ms = makeMapState([guard], []);

      expect(selectMobTarget(guard, ms, 'hex')).toBeNull();
    });
  });

  describe('resolveMobTargetTiebreak', () => {
    it('returns the only candidate if just one', () => {
      const char = makeCharacter({ id: 'solo' });
      const guard = makeGuard();
      const rolls = new Map([['solo', 8]]);

      expect(resolveMobTargetTiebreak([char], guard, rolls)).toBe(char);
    });

    it('targets the character with the lowest roll', () => {
      const c1 = makeCharacter({ id: 'c1' });
      const c2 = makeCharacter({ id: 'c2' });
      const guard = makeGuard();
      const rolls = new Map([['c1', 10], ['c2', 5]]);

      const result = resolveMobTargetTiebreak([c1, c2], guard, rolls);
      expect(result.id).toBe('c2');
    });
  });
});
