/**
 * Range Queries — Find entities within range
 *
 * Find characters, items, and enemies within range of a position.
 * Used constantly by the AI and NPC systems.
 */

import { Position, MapState, MapItem, CharacterToken, GridType } from '../../types';
import { hexDistance } from '../../data/hexGridUtils';
import { createGridUtils } from '../../data/gridUtils';
import { hasLineOfSight, LOSResult } from './lineOfSight';
import { posKey } from './wallMap';

export interface TargetResult {
  inRange: boolean;
  hasLOS: boolean;
  hasCover: boolean;
  distance: number;
}

/**
 * Find all characters within range of a position.
 *
 * @param position - Center position
 * @param range - Maximum hex distance
 * @param mapState - Current map state
 * @param gridType - Grid type
 * @param filterFn - Optional filter (e.g., only Overt, only enemy team)
 */
export function getCharactersInRange(
  position: Position,
  range: number,
  mapState: MapState,
  gridType: GridType,
  filterFn?: (char: CharacterToken) => boolean
): CharacterToken[] {
  const gridUtils = createGridUtils(gridType);
  return mapState.characters.filter(char => {
    if (gridUtils.getCellDistance(position, char.position) > range) return false;
    if (filterFn && !filterFn(char)) return false;
    return true;
  });
}

/**
 * Find all map items within range.
 * Used for finding hackable computers, pickupable items, etc.
 */
export function getItemsInRange(
  position: Position,
  range: number,
  mapState: MapState,
  gridType: GridType,
  filterFn?: (item: MapItem) => boolean
): MapItem[] {
  const gridUtils = createGridUtils(gridType);
  return mapState.items.filter(item => {
    if (gridUtils.getCellDistance(position, item.position) > range) return false;
    if (filterFn && !filterFn(item)) return false;
    return true;
  });
}

/**
 * Get all NPC enemy items (security-guard, elite, camera) within range.
 */
export function getEnemiesInRange(
  position: Position,
  range: number,
  mapState: MapState,
  gridType: GridType
): MapItem[] {
  return getItemsInRange(position, range, mapState, gridType, item =>
    item.type === 'enemy-security-guard' ||
    item.type === 'enemy-elite' ||
    item.type === 'enemy-camera'
  );
}

/**
 * Combined range + LOS + cover check for targeting.
 *
 * @param attackerPos - Attacker position
 * @param targetPosition - Target position
 * @param weaponRange - Weapon range in hexes
 * @param losBlockers - Set of position keys that block LOS (walls)
 * @param itemMap - Map from position key to item
 * @param gridType - Grid type
 */
export function canTarget(
  attackerPos: Position,
  targetPosition: Position,
  weaponRange: number,
  losBlockers: Set<string>,
  itemMap: Map<string, MapItem>,
  gridType: GridType
): TargetResult {
  const gridUtils = createGridUtils(gridType);
  const distance = gridUtils.getCellDistance(attackerPos, targetPosition);
  const inRange = distance <= weaponRange;

  if (!inRange) {
    return { inRange: false, hasLOS: false, hasCover: false, distance };
  }

  const los = hasLineOfSight(attackerPos, targetPosition, losBlockers, itemMap);

  return {
    inRange: true,
    hasLOS: los.clear,
    hasCover: los.coverPositions.length > 0,
    distance,
  };
}

/**
 * Get characters in the 6 neighboring hexes.
 * Used for melee range checks and "into melee" penalty detection.
 */
export function getAdjacentCharacters(
  position: Position,
  mapState: MapState,
  gridType: GridType
): CharacterToken[] {
  return getCharactersInRange(position, 1, mapState, gridType, char =>
    posKey(char.position) !== posKey(position)
  );
}
