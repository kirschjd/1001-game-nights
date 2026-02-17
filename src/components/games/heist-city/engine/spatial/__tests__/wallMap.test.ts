import {
  posKey,
  buildWallMap,
  buildItemPositionMap,
  buildLOSBlockers,
  isBlocked,
  isOccupiedByCharacter,
  getCoverAt,
} from '../wallMap';
import { MapState, MapItem, CharacterToken, Position } from '../../../types';

function makeMapState(
  items: Partial<MapItem>[] = [],
  characters: Partial<CharacterToken>[] = []
): MapState {
  return {
    items: items.map((item, i) => ({
      id: `item-${i}`,
      type: 'wall' as const,
      position: { x: 0, y: 0 },
      ...item,
    })) as MapItem[],
    characters: characters.map((char, i) => ({
      id: `char-${i}`,
      playerId: 'p1',
      playerNumber: 1 as const,
      position: { x: 0, y: 0 },
      color: '#ff0000',
      name: 'Test',
      role: 'Ninja' as const,
      stats: {
        movement: 5, meleeSkill: 7, ballisticSkill: 9,
        wounds: 7, maxWounds: 7, defense: 9, hack: 8, con: 8,
      },
      state: 'Overt' as const,
      ...char,
    })) as CharacterToken[],
    zones: [],
  };
}

describe('wallMap', () => {
  describe('posKey', () => {
    it('encodes position as string', () => {
      expect(posKey({ x: 3, y: -5 })).toBe('3,-5');
    });

    it('handles zero', () => {
      expect(posKey({ x: 0, y: 0 })).toBe('0,0');
    });
  });

  describe('buildWallMap', () => {
    it('includes walls', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      expect(wallMap.has('1,0')).toBe(true);
    });

    it('includes tables', () => {
      const ms = makeMapState([
        { type: 'table', position: { x: 2, y: 3 } },
      ]);
      const wallMap = buildWallMap(ms);
      expect(wallMap.has('2,3')).toBe(true);
    });

    it('excludes non-blocking items', () => {
      const ms = makeMapState([
        { type: 'computer', position: { x: 1, y: 0 } },
        { type: 'gear', position: { x: 2, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      expect(wallMap.size).toBe(0);
    });
  });

  describe('buildLOSBlockers', () => {
    it('includes walls but not tables', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
        { type: 'table', position: { x: 2, y: 0 } },
      ]);
      const blockers = buildLOSBlockers(ms);
      expect(blockers.has('1,0')).toBe(true);
      expect(blockers.has('2,0')).toBe(false);
    });
  });

  describe('buildItemPositionMap', () => {
    it('maps position keys to items', () => {
      const ms = makeMapState([
        { id: 'comp-1', type: 'computer', position: { x: 3, y: 2 } },
      ]);
      const itemMap = buildItemPositionMap(ms);
      const item = itemMap.get('3,2');
      expect(item).toBeDefined();
      expect(item!.id).toBe('comp-1');
    });
  });

  describe('isBlocked', () => {
    it('returns true for blocked positions', () => {
      const wallMap = new Set(['1,0', '2,3']);
      expect(isBlocked({ x: 1, y: 0 }, wallMap)).toBe(true);
    });

    it('returns false for unblocked positions', () => {
      const wallMap = new Set(['1,0']);
      expect(isBlocked({ x: 0, y: 0 }, wallMap)).toBe(false);
    });
  });

  describe('isOccupiedByCharacter', () => {
    it('returns true when character stands on position', () => {
      const ms = makeMapState([], [
        { id: 'char-a', position: { x: 3, y: 2 } },
      ]);
      expect(isOccupiedByCharacter({ x: 3, y: 2 }, ms)).toBe(true);
    });

    it('returns false when no character at position', () => {
      const ms = makeMapState([], [
        { id: 'char-a', position: { x: 3, y: 2 } },
      ]);
      expect(isOccupiedByCharacter({ x: 0, y: 0 }, ms)).toBe(false);
    });

    it('excludes specified character', () => {
      const ms = makeMapState([], [
        { id: 'char-a', position: { x: 3, y: 2 } },
      ]);
      expect(isOccupiedByCharacter({ x: 3, y: 2 }, ms, 'char-a')).toBe(false);
    });
  });

  describe('getCoverAt', () => {
    it('returns table at position', () => {
      const ms = makeMapState([
        { id: 'table-1', type: 'table', position: { x: 2, y: 0 } },
      ]);
      const itemMap = buildItemPositionMap(ms);
      const cover = getCoverAt({ x: 2, y: 0 }, itemMap);
      expect(cover).not.toBeNull();
      expect(cover!.type).toBe('table');
    });

    it('returns null for non-cover items', () => {
      const ms = makeMapState([
        { id: 'comp-1', type: 'computer', position: { x: 2, y: 0 } },
      ]);
      const itemMap = buildItemPositionMap(ms);
      const cover = getCoverAt({ x: 2, y: 0 }, itemMap);
      expect(cover).toBeNull();
    });

    it('returns item with provideCover flag', () => {
      const ms = makeMapState([
        { id: 'crate-1', type: 'gear', position: { x: 2, y: 0 }, provideCover: true },
      ]);
      const itemMap = buildItemPositionMap(ms);
      const cover = getCoverAt({ x: 2, y: 0 }, itemMap);
      expect(cover).not.toBeNull();
    });
  });
});
