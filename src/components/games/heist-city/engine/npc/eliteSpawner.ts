/**
 * Elite Spawner
 *
 * At alert level 3, spawns elite enemies at security portal locations.
 * Security portals are teleporter items on the map.
 *
 * Rules:
 *   - Elites spawn once when alert level first reaches 3
 *   - One elite per security portal (teleporter)
 *   - Elites don't spawn on occupied portals
 */

import { Position, MapItem, MapState } from '../../types';
import { posKey } from '../spatial/wallMap';

/**
 * Find all security portal positions (teleporter items).
 */
export function findSecurityPortals(mapState: MapState): Position[] {
  return mapState.items
    .filter(item => item.type === 'teleporter')
    .map(item => item.position);
}

/**
 * Check if elites have already been spawned this game.
 * Detects existing elite items on the map.
 */
export function hasElitesAlreadySpawned(mapState: MapState): boolean {
  return mapState.items.some(item => item.type === 'enemy-elite');
}

/**
 * Spawn elite enemies at security portal locations.
 *
 * Only spawns on unoccupied portals (no character or NPC standing there).
 * Returns the new elite MapItems to add to the map.
 *
 * @param mapState - Current map state
 * @returns Array of new elite MapItems
 */
export function spawnElites(mapState: MapState): MapItem[] {
  if (hasElitesAlreadySpawned(mapState)) {
    return [];
  }

  const portals = findSecurityPortals(mapState);
  if (portals.length === 0) return [];

  // Build a set of occupied positions
  const occupied = new Set<string>();
  for (const char of mapState.characters) {
    occupied.add(posKey(char.position));
  }
  for (const item of mapState.items) {
    if (item.type === 'enemy-security-guard' || item.type === 'enemy-elite') {
      occupied.add(posKey(item.position));
    }
  }

  const elites: MapItem[] = [];

  for (let i = 0; i < portals.length; i++) {
    const pos = portals[i];
    if (occupied.has(posKey(pos))) continue;

    elites.push({
      id: `elite-spawn-${i}`,
      type: 'enemy-elite',
      position: { x: pos.x, y: pos.y },
    });
  }

  return elites;
}
