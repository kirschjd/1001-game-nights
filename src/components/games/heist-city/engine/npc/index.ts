/**
 * NPC Automation — Barrel Export
 *
 * NPC targeting, movement, actions, elite spawning,
 * and full phase orchestration.
 */

// Targeting
export {
  isVisibleToMob,
  selectMobTarget,
  resolveMobTargetTiebreak,
} from './npcTargeting';

// Movement
export {
  calculateNPCMove,
  isAdjacentToTarget,
} from './npcMovement';
export type { NPCMoveResult } from './npcMovement';

// Actions
export {
  getNPCStatsForItem,
  selectNPCAction,
  getNPCAttackInfo,
  resolveNPCAttack,
} from './npcActions';
export type { NPCStats, NPCActionType } from './npcActions';

// Elite Spawner
export {
  spawnElites,
  findSecurityPortals,
  hasElitesAlreadySpawned,
} from './eliteSpawner';

// NPC Phase Orchestration
export {
  executeNPCPhase,
  previewNPCPhase,
} from './npcPhase';
export type {
  NPCPhaseResult,
  NPCCombatLogEntry,
  StateChangeEntry,
  NPCPhasePreview,
} from './npcPhase';
