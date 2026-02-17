import { hexLineDraw, hasLineOfSight, getVisiblePositions } from '../lineOfSight';
import { buildLOSBlockers, buildItemPositionMap } from '../wallMap';
import { MapState, MapItem, Position } from '../../../types';

function makeMapState(items: Partial<MapItem>[] = []): MapState {
  return {
    items: items.map((item, i) => ({
      id: `item-${i}`,
      type: 'wall' as const,
      position: { x: 0, y: 0 },
      ...item,
    })) as MapItem[],
    characters: [],
    zones: [],
  };
}

describe('lineOfSight', () => {
  describe('hexLineDraw', () => {
    it('returns single point for same position', () => {
      const line = hexLineDraw({ x: 0, y: 0 }, { x: 0, y: 0 });
      expect(line.length).toBe(1);
      expect(line[0]).toEqual({ x: 0, y: 0 });
    });

    it('draws line along q axis', () => {
      const line = hexLineDraw({ x: 0, y: 0 }, { x: 3, y: 0 });
      expect(line.length).toBe(4);
      expect(line[0]).toEqual({ x: 0, y: 0 });
      expect(line[1]).toEqual({ x: 1, y: 0 });
      expect(line[2]).toEqual({ x: 2, y: 0 });
      expect(line[3]).toEqual({ x: 3, y: 0 });
    });

    it('draws line along r axis', () => {
      const line = hexLineDraw({ x: 0, y: 0 }, { x: 0, y: 3 });
      expect(line.length).toBe(4);
      expect(line[0]).toEqual({ x: 0, y: 0 });
      expect(line[3]).toEqual({ x: 0, y: 3 });
    });

    it('draws diagonal line', () => {
      const line = hexLineDraw({ x: 0, y: 0 }, { x: 2, y: -2 });
      expect(line.length).toBe(3); // distance is 2
      expect(line[0]).toEqual({ x: 0, y: 0 });
      expect(line[2]).toEqual({ x: 2, y: -2 });
    });

    it('includes start and end', () => {
      const line = hexLineDraw({ x: -1, y: 2 }, { x: 2, y: -1 });
      expect(line[0]).toEqual({ x: -1, y: 2 });
      expect(line[line.length - 1]).toEqual({ x: 2, y: -1 });
    });
  });

  describe('hasLineOfSight', () => {
    it('clear LOS with no obstacles', () => {
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasLineOfSight(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.clear).toBe(true);
      expect(result.coverPositions.length).toBe(0);
    });

    it('blocked by wall', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasLineOfSight(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.clear).toBe(false);
      expect(result.blockedBy).toEqual({ x: 1, y: 0 });
    });

    it('table provides cover but does not block LOS', () => {
      const ms = makeMapState([
        { type: 'table', position: { x: 2, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasLineOfSight(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.clear).toBe(true);
      expect(result.coverPositions.length).toBe(1);
      expect(result.coverPositions[0]).toEqual({ x: 2, y: 0 });
    });

    it('adjacent hexes always have LOS', () => {
      // Even if there's a wall "between" them, the algorithm only checks
      // intermediate hexes (skips start and end)
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasLineOfSight(
        { x: 0, y: 0 }, { x: 1, y: 0 },
        losBlockers, itemMap
      );
      expect(result.clear).toBe(true);
    });
  });

  describe('getVisiblePositions', () => {
    it('sees all hexes within range when no walls', () => {
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const visible = getVisiblePositions(
        { x: 0, y: 0 }, 2,
        losBlockers, itemMap
      );

      // Should include self
      expect(visible.has('0,0')).toBe(true);
      // Should include all 6 neighbors
      expect(visible.has('1,0')).toBe(true);
      expect(visible.has('0,1')).toBe(true);
      expect(visible.has('-1,0')).toBe(true);
    });

    it('wall blocks visibility to hexes behind it', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const visible = getVisiblePositions(
        { x: 0, y: 0 }, 3,
        losBlockers, itemMap
      );

      // Can see everything not blocked by the wall
      expect(visible.has('0,0')).toBe(true);
      // Hex directly behind wall on q axis should be hidden
      expect(visible.has('2,0')).toBe(false);
      expect(visible.has('3,0')).toBe(false);
    });
  });
});
