/**
 * Character System - Barrel Export
 *
 * This folder contains all character-related data and abilities:
 * - characterStats: Character roles, base stats, and role-specific abilities
 * - stateAbilities: State-based abilities (Overt, Hidden, Disguised, etc.)
 * - roleAbilities: Quick lookups for role ability names
 * - actionCosts: Action cost calculations for abilities
 * - enemyStats: Enemy unit statistics
 */

// Character stats, roles, and level calculations
export {
  CHARACTER_DATA,
  INITIAL_CHARACTER_STATS,
  CHARACTER_ROLES,
  calculateLevel,
  getLevelThresholds,
  type CharacterAbility,
  type CharacterInfo,
} from './characterStats';

// State-based abilities
export {
  STATE_DATA,
  getStateInfo,
  getAllStates,
  getAllStateActions,
  type StateAbility,
  type StateAction,
  type StateInfo,
} from './stateAbilities';

// Role abilities
export { ROLE_ABILITIES, getRoleAbilities } from './roleAbilities';

// Action costs
export {
  getActionCost,
  canSelectAction,
  getActionCostDisplay,
  getAllAbilityCosts,
  getActionDescription,
} from './actionCosts';

// Enemy stats
export {
  ENEMY_STATS,
  getEnemyStats,
  isMovableEnemy,
  isEnemyUnit,
  type EnemyStats,
} from './enemyStats';

// Core actions (available to all characters)
export {
  CORE_ACTIONS,
  DEFAULT_MELEE,
  getCoreActions,
  getDefaultMeleeAction,
  formatWeaponAction,
  type CoreAction,
} from './coreActions';

// Action utilities (available actions for a character)
export { getAvailableActions } from './actionUtils';

// Action slot logic (assignment, continuation, clearing)
export { isContinuationSlot, assignAction } from './actionSlots';