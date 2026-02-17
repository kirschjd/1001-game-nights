/**
 * Cover Detection
 *
 * Determines if a target has cover from an attacker based on LOS.
 *
 * Rules:
 *   - Tables and cover-providing items along the LOS line provide partial cover
 *   - Cover gives +1 defense bonus
 *   - Doesn't apply if the character is ON the cover item
 */

import { Position, MapItem } from '../../types';
import { hasLineOfSight } from './lineOfSight';
import { posKey } from './wallMap';
import { ReachableCell } from './pathfinding';

export interface CoverResult {
  covered: boolean;
  coverType: 'none' | 'partial';
  defenseBonus: number;
}

/**
 * Check if a target has cover from an attacker.
 * Cover is provided by tables or cover-providing items along the LOS line.
 *
 * @param attackerPos - Attacker position
 * @param targetPos - Target position
 * @param losBlockers - Set of position keys that block LOS (walls)
 * @param itemMap - Map from position key to item
 */
export function hasCover(
  attackerPos: Position,
  targetPos: Position,
  losBlockers: Set<string>,
  itemMap: Map<string, MapItem>
): CoverResult {
  const los = hasLineOfSight(attackerPos, targetPos, losBlockers, itemMap);

  // If LOS is blocked, there's no direct shot at all
  if (!los.clear) {
    return { covered: true, coverType: 'partial', defenseBonus: 1 };
  }

  if (los.coverPositions.length > 0) {
    return { covered: true, coverType: 'partial', defenseBonus: 1 };
  }

  return { covered: false, coverType: 'none', defenseBonus: 0 };
}

/**
 * AI helper: find the reachable position that provides the most cover
 * from a set of threat positions.
 *
 * Scores each position by how many threats it has cover from.
 *
 * @param threatsFrom - Positions of threats to take cover from
 * @param reachablePositions - Map of reachable positions from pathfinding
 * @param losBlockers - Set of LOS-blocking position keys
 * @param itemMap - Map from position key to item
 * @returns Best cover position, or null if no cover available
 */
export function findBestCoverPosition(
  threatsFrom: Position[],
  reachablePositions: Map<string, ReachableCell>,
  losBlockers: Set<string>,
  itemMap: Map<string, MapItem>
): Position | null {
  if (threatsFrom.length === 0) return null;

  let bestPos: Position | null = null;
  let bestScore = -1;

  reachablePositions.forEach((cell) => {
    let coverCount = 0;
    for (const threat of threatsFrom) {
      const cover = hasCover(threat, cell.position, losBlockers, itemMap);
      if (cover.covered) coverCount++;
    }

    // Prefer positions that cover from more threats.
    // Tiebreak: prefer closer positions (less movement spent)
    if (
      coverCount > bestScore ||
      (coverCount === bestScore && bestPos !== null && cell.distance < getDistanceOf(bestPos, reachablePositions))
    ) {
      bestScore = coverCount;
      bestPos = cell.position;
    }
  });

  return bestScore > 0 ? bestPos : null;
}

function getDistanceOf(pos: Position, reachable: Map<string, ReachableCell>): number {
  const cell = reachable.get(posKey(pos));
  return cell ? cell.distance : Infinity;
}
