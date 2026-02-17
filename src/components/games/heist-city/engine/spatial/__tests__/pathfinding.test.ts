import { findPath, getReachablePositions, getMoveCost } from '../pathfinding';
import { buildWallMap } from '../wallMap';
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

describe('pathfinding', () => {
  describe('getMoveCost', () => {
    it('returns 1 for adjacent hexes', () => {
      expect(getMoveCost({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1);
    });
  });

  describe('findPath', () => {
    it('finds direct path with no obstacles', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        wallMap, ms, 'hex', 10
      );
      expect(path).not.toBeNull();
      expect(path!.length).toBe(4); // start + 3 steps
      expect(path![0]).toEqual({ x: 0, y: 0 });
      expect(path![path!.length - 1]).toEqual({ x: 3, y: 0 });
    });

    it('routes around a wall', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 2, y: 0 },
        wallMap, ms, 'hex', 10
      );
      expect(path).not.toBeNull();
      // Must go around: (0,0) → (1,-1) → (2,0) or similar 3-step route
      expect(path!.length).toBeGreaterThan(3);
      // Should not pass through the wall
      const passesWall = path!.some(p => p.x === 1 && p.y === 0);
      expect(passesWall).toBe(false);
    });

    it('returns null when goal is blocked', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 2, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 2, y: 0 },
        wallMap, ms, 'hex', 10
      );
      expect(path).toBeNull();
    });

    it('returns null when destination is beyond maxDistance', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 5, y: 0 },
        wallMap, ms, 'hex', 3
      );
      expect(path).toBeNull();
    });

    it('returns start when start equals goal', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 0, y: 0 },
        wallMap, ms, 'hex', 10
      );
      expect(path).toEqual([{ x: 0, y: 0 }]);
    });

    it('routes around other characters', () => {
      const ms = makeMapState([], [
        { id: 'blocker', position: { x: 1, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 2, y: 0 },
        wallMap, ms, 'hex', 10, 'mover'
      );
      expect(path).not.toBeNull();
      const passesBlocker = path!.some(p => p.x === 1 && p.y === 0);
      expect(passesBlocker).toBe(false);
    });

    it('excludeCharacterId prevents self-blocking', () => {
      const ms = makeMapState([], [
        { id: 'mover', position: { x: 0, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      const path = findPath(
        { x: 0, y: 0 }, { x: 1, y: 0 },
        wallMap, ms, 'hex', 10, 'mover'
      );
      expect(path).not.toBeNull();
    });
  });

  describe('getReachablePositions', () => {
    it('returns positions within movement range', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 2, wallMap, ms, 'hex'
      );

      // Should include start
      expect(reachable.has('0,0')).toBe(true);
      expect(reachable.get('0,0')!.distance).toBe(0);

      // Should include neighbors (distance 1)
      expect(reachable.has('1,0')).toBe(true);
      expect(reachable.get('1,0')!.distance).toBe(1);

      // Should include distance-2 hexes
      expect(reachable.has('2,0')).toBe(true);
      expect(reachable.get('2,0')!.distance).toBe(2);

      // Should NOT include distance-3 hexes
      expect(reachable.has('3,0')).toBe(false);
    });

    it('respects walls', () => {
      const ms = makeMapState([
        // Wall surrounding (2,0) from the left
        { type: 'wall', position: { x: 1, y: 0 } },
        { type: 'wall', position: { x: 1, y: -1 } },
      ]);
      const wallMap = buildWallMap(ms);
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 2, wallMap, ms, 'hex'
      );

      // Walls should not be reachable
      expect(reachable.has('1,0')).toBe(false);
      expect(reachable.has('1,-1')).toBe(false);
    });

    it('stores paths', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 3, wallMap, ms, 'hex'
      );

      const cell = reachable.get('2,0');
      expect(cell).toBeDefined();
      expect(cell!.path.length).toBe(3); // start + 2 steps
      expect(cell!.path[0]).toEqual({ x: 0, y: 0 });
    });
  });
});
