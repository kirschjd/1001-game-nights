/**
 * Rules Advisor — Barrel Export
 */

// Config
export {
  shouldShow,
  muteCategory,
  unmuteCategory,
  DEFAULT_ADVISOR_CONFIG,
} from './advisorConfig';
export type {
  AdvisorSeverity,
  RuleCategory,
  AdvisorConfig,
} from './advisorConfig';

// Log
export {
  createAdvisorEntry,
} from './advisorLog';
export type {
  AdvisorEntry,
} from './advisorLog';

// Validators
export {
  validateMovement,
  validateAlertLevel,
  validateActionSlots,
  validateStateChange,
  validateStealthAfterAttack,
  validateCombatAction,
  validateVPAward,
  validateTurnEnd,
} from './rulesAdvisor';
