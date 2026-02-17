/**
 * Wall Map — Precomputed Obstacle Lookup
 *
 * Builds fast lookup structures from MapState.items so pathfinding
 * and LOS don't scan all items every query. Should be rebuilt whenever
 * the map state changes (wall destroyed, item moved).
 */

import { Position, MapState, MapItem } from '../../types';

/** Encode a position as a string key for Set/Map lookup */
export function posKey(pos: Position): string {
  return `${pos.x},${pos.y}`;
}

/**
 * Build a Set of position keys for all wall/blocking items.
 * Items that block movement:
 *   - `wall` type items
 *   - `table` type items (block movement, provide cover, don't block LOS)
 */
export function buildWallMap(mapState: MapState): Set<string> {
  const walls = new Set<string>();
  for (const item of mapState.items) {
    if (item.type === 'wall' || item.type === 'table') {
      walls.add(posKey(item.position));
    }
  }
  return walls;
}

/**
 * Build a Map from position keys to items for fast property lookups.
 */
export function buildItemPositionMap(mapState: MapState): Map<string, MapItem> {
  const map = new Map<string, MapItem>();
  for (const item of mapState.items) {
    map.set(posKey(item.position), item);
  }
  return map;
}

/**
 * Fast O(1) check if a position is impassable (wall or table).
 */
export function isBlocked(position: Position, wallMap: Set<string>): boolean {
  return wallMap.has(posKey(position));
}

/**
 * Check if another character is standing on a position.
 * Optionally exclude a specific character (the moving character).
 */
export function isOccupiedByCharacter(
  position: Position,
  mapState: MapState,
  excludeCharacterId?: string
): boolean {
  const key = posKey(position);
  for (const char of mapState.characters) {
    if (excludeCharacterId && char.id === excludeCharacterId) continue;
    if (posKey(char.position) === key) return true;
  }
  return false;
}

/**
 * Get all cover-providing items at a position.
 * Tables provide cover but don't block LOS.
 */
export function getCoverAt(position: Position, itemMap: Map<string, MapItem>): MapItem | null {
  const item = itemMap.get(posKey(position));
  if (item && (item.type === 'table' || item.provideCover)) {
    return item;
  }
  return null;
}

/**
 * Build a Set of position keys that block LOS (walls only, not tables).
 */
export function buildLOSBlockers(mapState: MapState): Set<string> {
  const blockers = new Set<string>();
  for (const item of mapState.items) {
    if (item.type === 'wall') {
      blockers.add(posKey(item.position));
    }
  }
  return blockers;
}
