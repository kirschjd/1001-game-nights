/**
 * Spatial Reasoning — Barrel Export
 *
 * Pathfinding, line-of-sight, range queries, cover detection,
 * and movement validation for the Heist City hex grid.
 */

// Wall Map
export {
  posKey,
  buildWallMap,
  buildItemPositionMap,
  buildLOSBlockers,
  isBlocked,
  isOccupiedByCharacter,
  getCoverAt,
} from './wallMap';

// Pathfinding
export {
  findPath,
  getReachablePositions,
  getMoveCost,
} from './pathfinding';
export type { ReachableCell } from './pathfinding';

// Line of Sight
export {
  hexLineDraw,
  hasLineOfSight,
  getVisiblePositions,
} from './lineOfSight';
export type { LOSResult } from './lineOfSight';

// Range Queries
export {
  getCharactersInRange,
  getItemsInRange,
  getEnemiesInRange,
  canTarget,
  getAdjacentCharacters,
} from './rangeQueries';
export type { TargetResult } from './rangeQueries';

// Cover Detection
export {
  hasCover,
  findBestCoverPosition,
} from './coverDetection';
export type { CoverResult } from './coverDetection';

// Movement Validation
export {
  validateMove,
  validateMoveAndAttack,
  getEffectiveMovement,
} from './movementValidation';
export type { MoveValidation, MovementActionType } from './movementValidation';
