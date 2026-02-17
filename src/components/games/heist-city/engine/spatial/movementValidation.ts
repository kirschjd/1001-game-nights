/**
 * Movement Validation
 *
 * Validates character moves against movement stat, obstacles, and action type.
 *
 * Movement rules:
 *   - Movement stat = number of hexes a character can move
 *   - Each hex costs 1 movement (future: difficult terrain costs extra)
 *   - Can't move through walls or occupied hexes
 *   - Equipment bonuses add to movement stat
 *
 * Special movement types:
 *   - Hustle (2-slot, Overt/Hidden): 2x movement + 2
 *   - Sprint (3-slot, Overt): 3x movement + 4
 *   - Ninja Vanish (2-slot): fixed 3 hexes
 *   - CQC Technique (1-slot): fixed 3 hexes, then melee
 *   - All According to Plan (3-slot): move every allied unit 1
 *   - Move It Along (2-slot): move an allied unit/mob 1
 */

import { CharacterToken, MapState, GridType, Position } from '../../types';
import { getEffectiveStats } from '../../data/equipmentLoader';
import { getReachablePositions } from './pathfinding';
import { posKey } from './wallMap';

export interface MoveValidation {
  valid: boolean;
  reason?: string;
  path?: Position[];
  distance?: number;
}

export type MovementActionType =
  | 'move'
  | 'hustle'
  | 'sprint'
  | 'ninja-vanish'
  | 'cqc-technique'
  | 'move-it-along'
  | 'all-according-to-plan';

/**
 * Compute effective movement distance for an action type.
 *
 * @param character - The character moving
 * @param actionType - Type of movement action
 * @returns Maximum movement distance in hexes
 */
export function getEffectiveMovement(
  character: CharacterToken,
  actionType: MovementActionType
): number {
  const stats = getEffectiveStats(character.stats, character.equipment || []);
  const baseM = stats.movement;

  switch (actionType) {
    case 'move':
      return baseM;
    case 'hustle':
      return 2 * baseM + 2;
    case 'sprint':
      return 3 * baseM + 4;
    case 'ninja-vanish':
      return 3;
    case 'cqc-technique':
      return 3;
    case 'move-it-along':
      return 1;
    case 'all-according-to-plan':
      return 1;
    default:
      return baseM;
  }
}

/**
 * Validate whether a character can move to a destination.
 * Uses pathfinding to check reachability and path length.
 *
 * @param character - The character trying to move
 * @param destination - Target hex
 * @param wallMap - Set of blocked position keys
 * @param mapState - Current map state
 * @param gridType - Grid type
 * @param actionType - What kind of movement action
 * @returns Validation result with path if valid
 */
export function validateMove(
  character: CharacterToken,
  destination: Position,
  wallMap: Set<string>,
  mapState: MapState,
  gridType: GridType,
  actionType: MovementActionType = 'move'
): MoveValidation {
  const maxMove = getEffectiveMovement(character, actionType);
  const reachable = getReachablePositions(
    character.position,
    maxMove,
    wallMap,
    mapState,
    gridType,
    character.id
  );

  const destKey = posKey(destination);
  const cell = reachable.get(destKey);

  if (!cell) {
    return {
      valid: false,
      reason: `Destination is not reachable within ${maxMove} movement (action: ${actionType})`,
    };
  }

  return {
    valid: true,
    path: cell.path,
    distance: cell.distance,
  };
}

/**
 * Validate a combined move-and-attack action (e.g., CQC Technique).
 * Checks that the move is valid AND the target is adjacent to the destination.
 *
 * @param character - The character
 * @param moveDest - Destination after movement
 * @param targetPos - Position of the attack target
 * @param wallMap - Set of blocked position keys
 * @param mapState - Current map state
 * @param gridType - Grid type
 */
export function validateMoveAndAttack(
  character: CharacterToken,
  moveDest: Position,
  targetPos: Position,
  wallMap: Set<string>,
  mapState: MapState,
  gridType: GridType
): MoveValidation {
  const moveResult = validateMove(character, moveDest, wallMap, mapState, gridType, 'cqc-technique');
  if (!moveResult.valid) {
    return moveResult;
  }

  // Check target is adjacent to destination
  const { createGridUtils } = require('../../data/gridUtils');
  const gridUtils = createGridUtils(gridType);
  const distance = gridUtils.getCellDistance(moveDest, targetPos);

  if (distance > 1) {
    return {
      valid: false,
      reason: `Target is ${distance} hexes from move destination, must be adjacent (1 hex)`,
    };
  }

  return moveResult;
}
