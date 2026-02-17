/**
 * Line of Sight — Hex Grid LOS
 *
 * Determines if two positions can "see" each other on a hex grid.
 * Uses the Red Blob Games hex line-draw algorithm.
 *
 * Rules:
 *   - Walls block LOS completely
 *   - Tables do NOT block LOS but provide cover (defense bonus)
 *   - Characters do NOT block LOS
 *   - Smoke grenades block LOS for 1 turn (future)
 */

import { Position, MapItem } from '../../types';
import { hexDistance, isWithinHexBounds } from '../../data/hexGridUtils';
import { posKey } from './wallMap';

export interface LOSResult {
  clear: boolean;
  blockedBy?: Position;
  coverPositions: Position[];
}

/**
 * Draw a hex line between two points using cube coordinate interpolation.
 * Returns the sequence of hexes from `from` to `to` (inclusive).
 *
 * Algorithm (Red Blob Games):
 * 1. Convert axial to cube coords
 * 2. Linearly interpolate N steps (N = hex distance)
 * 3. Round each interpolated point to the nearest hex
 */
export function hexLineDraw(from: Position, to: Position): Position[] {
  const N = hexDistance(from.x, from.y, to.x, to.y);
  if (N === 0) return [from];

  const results: Position[] = [];

  // Convert axial to cube
  const fromCube = { q: from.x, r: from.y, s: -from.x - from.y };
  const toCube = { q: to.x, r: to.y, s: -to.x - to.y };

  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // Lerp in cube coords with epsilon nudge to avoid ambiguous hex boundaries
    const q = cubeLerp(fromCube.q, toCube.q, t) + 1e-6;
    const r = cubeLerp(fromCube.r, toCube.r, t) + 1e-6;
    const s = cubeLerp(fromCube.s, toCube.s, t) - 2e-6;

    const rounded = cubeRound(q, r, s);
    results.push({ x: rounded.q, y: rounded.r });
  }

  return results;
}

/**
 * Check line of sight between two positions.
 *
 * @param from - Source position
 * @param to - Target position
 * @param losBlockers - Set of position keys that block LOS (walls only)
 * @param itemMap - Map from position key to item (for cover detection)
 * @returns LOSResult with clear/blocked status and cover positions
 */
export function hasLineOfSight(
  from: Position,
  to: Position,
  losBlockers: Set<string>,
  itemMap: Map<string, MapItem>
): LOSResult {
  const line = hexLineDraw(from, to);
  const coverPositions: Position[] = [];

  // Check each hex along the line (skip start and end)
  for (let i = 1; i < line.length - 1; i++) {
    const pos = line[i];
    const key = posKey(pos);

    // Wall blocks LOS
    if (losBlockers.has(key)) {
      return { clear: false, blockedBy: pos, coverPositions };
    }

    // Table/cover items don't block LOS but provide cover
    const item = itemMap.get(key);
    if (item && (item.type === 'table' || item.provideCover)) {
      coverPositions.push(pos);
    }
  }

  return { clear: true, coverPositions };
}

/**
 * Get all visible positions from a source within maxRange.
 * Casts LOS rays to every hex within range and returns those with clear LOS.
 */
export function getVisiblePositions(
  from: Position,
  maxRange: number,
  losBlockers: Set<string>,
  itemMap: Map<string, MapItem>
): Set<string> {
  const visible = new Set<string>();
  visible.add(posKey(from)); // Can always see yourself

  // Check all hexes within range
  for (let q = from.x - maxRange; q <= from.x + maxRange; q++) {
    for (let r = from.y - maxRange; r <= from.y + maxRange; r++) {
      if (!isWithinHexBounds(q, r)) continue;
      const dist = hexDistance(from.x, from.y, q, r);
      if (dist === 0 || dist > maxRange) continue;

      const target: Position = { x: q, y: r };
      const los = hasLineOfSight(from, target, losBlockers, itemMap);
      if (los.clear) {
        visible.add(posKey(target));
      }
    }
  }

  return visible;
}

// ============== Helpers ==============

function cubeLerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cubeRound(q: number, r: number, s: number): { q: number; r: number } {
  let rq = Math.round(q);
  let rr = Math.round(r);
  let rs = Math.round(s);

  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  // else: rs = -rq - rr (implicit, not needed for axial output)

  return { q: rq, r: rr };
}
