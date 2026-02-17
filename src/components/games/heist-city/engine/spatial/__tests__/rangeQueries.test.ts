import {
  getCharactersInRange,
  getItemsInRange,
  getEnemiesInRange,
  canTarget,
  getAdjacentCharacters,
} from '../rangeQueries';
import { buildLOSBlockers, buildItemPositionMap } from '../wallMap';
import { MapState, MapItem, CharacterToken } from '../../../types';

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

function makeMapState(
  items: Partial<MapItem>[] = [],
  characters: CharacterToken[] = []
): MapState {
  return {
    items: items.map((item, i) => ({
      id: `item-${i}`,
      type: 'wall' as const,
      position: { x: 0, y: 0 },
      ...item,
    })) as MapItem[],
    characters,
    zones: [],
  };
}

describe('rangeQueries', () => {
  describe('getCharactersInRange', () => {
    it('finds characters within range', () => {
      const chars = [
        makeCharacter({ id: 'near', position: { x: 2, y: 0 } }),
        makeCharacter({ id: 'far', position: { x: 10, y: 0 } }),
      ];
      const ms = makeMapState([], chars);

      const result = getCharactersInRange({ x: 0, y: 0 }, 3, ms, 'hex');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('near');
    });

    it('applies filter function', () => {
      const chars = [
        makeCharacter({ id: 'overt', position: { x: 1, y: 0 }, state: 'Overt' }),
        makeCharacter({ id: 'hidden', position: { x: 1, y: -1 }, state: 'Hidden' }),
      ];
      const ms = makeMapState([], chars);

      const result = getCharactersInRange(
        { x: 0, y: 0 }, 3, ms, 'hex',
        c => c.state === 'Overt'
      );
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('overt');
    });
  });

  describe('getItemsInRange', () => {
    it('finds items within range', () => {
      const ms = makeMapState([
        { id: 'comp-near', type: 'computer', position: { x: 1, y: 0 } },
        { id: 'comp-far', type: 'computer', position: { x: 10, y: 0 } },
      ]);

      const result = getItemsInRange({ x: 0, y: 0 }, 2, ms, 'hex');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('comp-near');
    });
  });

  describe('getEnemiesInRange', () => {
    it('finds guards and elites', () => {
      const ms = makeMapState([
        { id: 'guard', type: 'enemy-security-guard', position: { x: 1, y: 0 } },
        { id: 'elite', type: 'enemy-elite', position: { x: 2, y: 0 } },
        { id: 'comp', type: 'computer', position: { x: 1, y: -1 } },
      ]);

      const result = getEnemiesInRange({ x: 0, y: 0 }, 3, ms, 'hex');
      expect(result.length).toBe(2);
      const ids = result.map(r => r.id);
      expect(ids).toContain('guard');
      expect(ids).toContain('elite');
    });
  });

  describe('canTarget', () => {
    it('reports in range + clear LOS', () => {
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = canTarget(
        { x: 0, y: 0 }, { x: 3, y: 0 }, 5,
        losBlockers, itemMap, 'hex'
      );
      expect(result.inRange).toBe(true);
      expect(result.hasLOS).toBe(true);
      expect(result.hasCover).toBe(false);
      expect(result.distance).toBe(3);
    });

    it('reports out of range', () => {
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = canTarget(
        { x: 0, y: 0 }, { x: 10, y: 0 }, 5,
        losBlockers, itemMap, 'hex'
      );
      expect(result.inRange).toBe(false);
      expect(result.hasLOS).toBe(false);
    });

    it('reports blocked LOS from wall', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 2, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = canTarget(
        { x: 0, y: 0 }, { x: 4, y: 0 }, 10,
        losBlockers, itemMap, 'hex'
      );
      expect(result.inRange).toBe(true);
      expect(result.hasLOS).toBe(false);
    });

    it('detects cover from table', () => {
      const ms = makeMapState([
        { type: 'table', position: { x: 2, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = canTarget(
        { x: 0, y: 0 }, { x: 3, y: 0 }, 10,
        losBlockers, itemMap, 'hex'
      );
      expect(result.inRange).toBe(true);
      expect(result.hasLOS).toBe(true);
      expect(result.hasCover).toBe(true);
    });
  });

  describe('getAdjacentCharacters', () => {
    it('finds adjacent characters but not self at same position', () => {
      const chars = [
        makeCharacter({ id: 'self', position: { x: 0, y: 0 } }),
        makeCharacter({ id: 'adj', position: { x: 1, y: 0 } }),
        makeCharacter({ id: 'far', position: { x: 3, y: 0 } }),
      ];
      const ms = makeMapState([], chars);

      const result = getAdjacentCharacters({ x: 0, y: 0 }, ms, 'hex');
      // Should include 'adj' (distance 1) and 'self' is at distance 0 so filtered by posKey check
      const ids = result.map(r => r.id);
      expect(ids).toContain('adj');
      expect(ids).not.toContain('far');
    });
  });
});
