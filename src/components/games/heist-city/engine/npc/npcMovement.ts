/**
 * NPC Movement
 *
 * Pathfinds NPCs toward their targets using A* from the spatial engine.
 *
 * Rules:
 *   - Guards and Elites: M=4, move along shortest path to target
 *   - Turrets (cameras): stationary, never move
 *   - NPCs already adjacent to target don't move
 *   - NPCs with no path to target stay put
 */

import { Position, MapItem, MapState, CharacterToken, GridType } from '../../types';
import { findPath } from '../spatial/pathfinding';
import { buildWallMap, posKey } from '../spatial/wallMap';
import { createGridUtils } from '../../data/gridUtils';

export interface NPCMoveResult {
  newPosition: Position;
  path: Position[];
  distanceMoved: number;
}

/**
 * Check if NPC is adjacent (distance 1) to target.
 */
export function isAdjacentToTarget(
  npcPosition: Position,
  targetPosition: Position,
  gridType: GridType
): boolean {
  const gridUtils = createGridUtils(gridType);
  return gridUtils.getCellDistance(npcPosition, targetPosition) <= 1;
}

/**
 * Calculate the NPC's move toward a target.
 *
 * Uses A* pathfinding to find the shortest path, then moves
 * up to the NPC's movement stat along that path.
 *
 * Returns null for:
 *   - Turrets/cameras (stationary)
 *   - NPCs already adjacent to target
 *   - NPCs with no valid path
 *
 * @param npc - The NPC map item
 * @param movement - NPC's movement stat (e.g. 4 for guards/elites)
 * @param target - Target character to move toward
 * @param mapState - Current map state
 * @param gridType - Grid type
 */
export function calculateNPCMove(
  npc: MapItem,
  movement: number,
  target: CharacterToken,
  mapState: MapState,
  gridType: GridType
): NPCMoveResult | null {
  // Turrets/cameras don't move
  if (npc.type === 'enemy-camera') {
    return null;
  }

  // Already adjacent — no need to move
  if (isAdjacentToTarget(npc.position, target.position, gridType)) {
    return null;
  }

  // No movement stat means stationary
  if (movement <= 0) {
    return null;
  }

  const wallMap = buildWallMap(mapState);

  // Find path toward the target. Exclude the target character from blocking
  // so the pathfinder can find a path TO their hex (we stop short of it).
  const maxSearchDistance = movement * 3;
  const fullPath = findPath(
    npc.position,
    target.position,
    wallMap,
    mapState,
    gridType,
    maxSearchDistance,
    target.id
  );

  if (!fullPath || fullPath.length <= 1) {
    return null;
  }

  // Move along the path up to movement stat, but never onto the target's hex.
  // fullPath includes start and goal, so max steps without landing on goal = length - 2
  const maxStepsWithoutGoal = fullPath.length - 2;
  const stepsToTake = Math.min(movement, Math.max(0, maxStepsWithoutGoal));
  if (stepsToTake <= 0) return null;

  const travelPath = fullPath.slice(0, stepsToTake + 1);
  const newPosition = travelPath[travelPath.length - 1];

  return {
    newPosition,
    path: travelPath,
    distanceMoved: stepsToTake,
  };
}
