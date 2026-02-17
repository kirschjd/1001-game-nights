import { hasCover, findBestCoverPosition } from '../coverDetection';
import { buildLOSBlockers, buildItemPositionMap, buildWallMap } from '../wallMap';
import { getReachablePositions } from '../pathfinding';
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

describe('coverDetection', () => {
  describe('hasCover', () => {
    it('no cover when nothing between attacker and target', () => {
      const ms = makeMapState();
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasCover(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.covered).toBe(false);
      expect(result.coverType).toBe('none');
      expect(result.defenseBonus).toBe(0);
    });

    it('partial cover from table', () => {
      const ms = makeMapState([
        { type: 'table', position: { x: 2, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasCover(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.covered).toBe(true);
      expect(result.coverType).toBe('partial');
      expect(result.defenseBonus).toBe(1);
    });

    it('wall blocks LOS, counts as cover', () => {
      const ms = makeMapState([
        { type: 'wall', position: { x: 1, y: 0 } },
      ]);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      const result = hasCover(
        { x: 0, y: 0 }, { x: 3, y: 0 },
        losBlockers, itemMap
      );
      expect(result.covered).toBe(true);
    });
  });

  describe('findBestCoverPosition', () => {
    it('returns null when no threats', () => {
      const ms = makeMapState();
      const wallMap = buildWallMap(ms);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 3, wallMap, ms, 'hex'
      );

      const result = findBestCoverPosition([], reachable, losBlockers, itemMap);
      expect(result).toBeNull();
    });

    it('finds position with cover from threat', () => {
      // Place a table at (2,0). If threat is at (5,0),
      // position (3,0) should have the table providing cover.
      const ms = makeMapState([
        { type: 'table', position: { x: 2, y: 0 } },
      ]);
      const wallMap = buildWallMap(ms);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);

      // Start at origin, find reachable within 4
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 4, wallMap, ms, 'hex'
      );

      const threats: Position[] = [{ x: 5, y: 0 }];
      const result = findBestCoverPosition(threats, reachable, losBlockers, itemMap);
      // Should find at least some position with cover
      expect(result).not.toBeNull();
    });

    it('returns null when no cover available', () => {
      const ms = makeMapState(); // No tables or cover items
      const wallMap = buildWallMap(ms);
      const losBlockers = buildLOSBlockers(ms);
      const itemMap = buildItemPositionMap(ms);
      const reachable = getReachablePositions(
        { x: 0, y: 0 }, 2, wallMap, ms, 'hex'
      );

      const threats: Position[] = [{ x: 5, y: 0 }];
      const result = findBestCoverPosition(threats, reachable, losBlockers, itemMap);
      expect(result).toBeNull();
    });
  });
});
