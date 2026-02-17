/**
 * A* Pathfinding on Hex Grid
 *
 * Hex-grid pathfinding using A* with hexDistance as the heuristic.
 * Also provides BFS flood-fill for reachable positions within a movement budget.
 *
 * Uses existing hexGridUtils for neighbor expansion and distance calculations.
 */

import { Position, MapState, GridType } from '../../types';
import { hexDistance, isWithinHexBounds } from '../../data/hexGridUtils';
import { createGridUtils } from '../../data/gridUtils';
import { isBlocked, isOccupiedByCharacter, posKey } from './wallMap';

export interface ReachableCell {
  position: Position;
  distance: number;
  path: Position[];
}

/**
 * Movement cost between adjacent cells.
 * Currently always 1. Designed to support difficult terrain in the future.
 */
export function getMoveCost(_from: Position, _to: Position): number {
  return 1;
}

/**
 * A* pathfinding from start to goal on a hex grid.
 *
 * @param start - Starting position
 * @param goal - Goal position
 * @param wallMap - Set of blocked position keys
 * @param mapState - Current map state (for character positions)
 * @param gridType - Grid type
 * @param maxDistance - Maximum path length
 * @param excludeCharacterId - Character to exclude from blocking (the mover)
 * @returns Array of positions forming the path (including start and goal), or null if unreachable
 */
export function findPath(
  start: Position,
  goal: Position,
  wallMap: Set<string>,
  mapState: MapState,
  gridType: GridType,
  maxDistance: number,
  excludeCharacterId?: string
): Position[] | null {
  const gridUtils = createGridUtils(gridType);
  const startKey = posKey(start);
  const goalKey = posKey(goal);

  // Goal itself is blocked → unreachable
  if (isBlocked(goal, wallMap) || isOccupiedByCharacter(goal, mapState, excludeCharacterId)) {
    return null;
  }

  // Start == Goal
  if (startKey === goalKey) return [start];

  // A* with hexDistance heuristic
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const positionMap = new Map<string, Position>();

  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(start, goal));
  positionMap.set(startKey, start);

  // Open list (use object to avoid Set iteration TS target issue)
  const openList: string[] = [startKey];
  const inOpen: Record<string, boolean> = { [startKey]: true };

  while (openList.length > 0) {
    // Find node in openList with lowest fScore
    let bestIdx = 0;
    let lowestF = fScore.get(openList[0]) ?? Infinity;
    for (let i = 1; i < openList.length; i++) {
      const f = fScore.get(openList[i]) ?? Infinity;
      if (f < lowestF) {
        lowestF = f;
        bestIdx = i;
      }
    }
    const currentKey = openList[bestIdx];

    if (currentKey === goalKey) {
      return reconstructPath(cameFrom, positionMap, goalKey);
    }

    // Remove from open list (swap with last for O(1) removal)
    openList[bestIdx] = openList[openList.length - 1];
    openList.pop();
    delete inOpen[currentKey];
    const current = positionMap.get(currentKey)!;
    const currentG = gScore.get(currentKey) ?? Infinity;

    // Don't expand beyond maxDistance
    if (currentG >= maxDistance) continue;

    const neighbors = gridUtils.getNeighbors(current);
    for (const neighbor of neighbors) {
      // Skip out-of-bounds
      if (gridType === 'hex' && !isWithinHexBounds(neighbor.x, neighbor.y)) continue;

      const neighborKey = posKey(neighbor);

      // Skip blocked or occupied (except by mover)
      if (isBlocked(neighbor, wallMap)) continue;
      if (neighborKey !== goalKey && isOccupiedByCharacter(neighbor, mapState, excludeCharacterId)) continue;

      const tentativeG = currentG + getMoveCost(current, neighbor);

      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));
        positionMap.set(neighborKey, neighbor);
        if (!inOpen[neighborKey]) {
          openList.push(neighborKey);
          inOpen[neighborKey] = true;
        }
      }
    }
  }

  return null; // No path found
}

/**
 * BFS flood-fill from start position. Returns all positions reachable
 * within the movement budget.
 *
 * @param start - Starting position
 * @param maxDistance - Movement budget
 * @param wallMap - Set of blocked position keys
 * @param mapState - Current map state
 * @param gridType - Grid type
 * @param excludeCharacterId - Character to exclude from blocking
 * @returns Map from position key to ReachableCell
 */
export function getReachablePositions(
  start: Position,
  maxDistance: number,
  wallMap: Set<string>,
  mapState: MapState,
  gridType: GridType,
  excludeCharacterId?: string
): Map<string, ReachableCell> {
  const gridUtils = createGridUtils(gridType);
  const result = new Map<string, ReachableCell>();
  const startKey = posKey(start);

  result.set(startKey, { position: start, distance: 0, path: [start] });

  // BFS queue: [positionKey, distance]
  const queue: [string, number][] = [[startKey, 0]];

  while (queue.length > 0) {
    const [currentKey, currentDist] = queue.shift()!;
    const currentCell = result.get(currentKey)!;

    if (currentDist >= maxDistance) continue;

    const neighbors = gridUtils.getNeighbors(currentCell.position);
    for (const neighbor of neighbors) {
      if (gridType === 'hex' && !isWithinHexBounds(neighbor.x, neighbor.y)) continue;

      const neighborKey = posKey(neighbor);
      if (result.has(neighborKey)) continue; // Already visited

      if (isBlocked(neighbor, wallMap)) continue;
      if (isOccupiedByCharacter(neighbor, mapState, excludeCharacterId)) continue;

      const newDist = currentDist + getMoveCost(currentCell.position, neighbor);
      if (newDist > maxDistance) continue;

      const cell: ReachableCell = {
        position: neighbor,
        distance: newDist,
        path: [...currentCell.path, neighbor],
      };
      result.set(neighborKey, cell);
      queue.push([neighborKey, newDist]);
    }
  }

  return result;
}

// ============== Helpers ==============

function heuristic(a: Position, b: Position): number {
  return hexDistance(a.x, a.y, b.x, b.y);
}

function reconstructPath(
  cameFrom: Map<string, string>,
  positionMap: Map<string, Position>,
  goalKey: string
): Position[] {
  const path: Position[] = [];
  let current = goalKey;
  while (current) {
    path.unshift(positionMap.get(current)!);
    const prev = cameFrom.get(current);
    if (!prev) break;
    current = prev;
  }
  return path;
}
