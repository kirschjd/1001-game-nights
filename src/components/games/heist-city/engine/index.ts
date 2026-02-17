/**
 * Heist City Rules Engine
 *
 * Pure, stateless functions for formalizing game rules.
 * Used by the AI controller (strict) and Rules Advisor (advisory).
 */

// Types
export type {
  DiceRollResult,
  AttackResult,
  DefenseResult,
  CombatResult,
  LegalAction,
  TurnPhase,
  TurnState,
  VPEventType,
  VPEvent,
  AlertLevelState,
  StateModifiers,
} from './types';

// Dice
export {
  roll2d6,
  rollVsTarget,
  probability2d6,
  probability2d6GTE,
  expectedSuccessMargin,
  all2d6Outcomes,
} from './dice';

// Alert Level
export {
  computeAlertLevel,
  countRevealedUnits,
  getNPCActionCount,
  shouldSpawnElites,
  predictAlertLevel,
} from './alertLevel';

// State Transitions
export {
  getStateTransition,
  getWoundStateTransition,
  applyStateTransition,
  getStateModifiers,
  preservesHiddenState,
  preservesDisguisedState,
} from './stateTransitions';

// Combat
export {
  resolveRangedAttack,
  resolveMeleeAttack,
  resolveDefenseSave,
  applyDamage,
  resolveCombat,
  resolveHackCheck,
  resolveCharmCheck,
  resolveOpposedRoll,
  expectedDamage,
} from './combat';

// Actions
export {
  getLegalActions,
  isActionLegal,
  getRemainingSlots,
  getFirstEmptySlot,
  canActivate,
  getRepeatPenalty,
  isLimitedAbilityUsed,
} from './actions';

// Turn Structure
export {
  createInitialTurnState,
  getNextActivatingPlayer,
  markActivated,
  allPlayersActivated,
  getActivatableCharacters,
  advanceToNPCPhase,
  advanceToEndOfTurn,
  advanceToNextTurn,
  getEndOfTurnUpdates,
  isFinalTurn,
  getPhaseDescription,
} from './turnStructure';

// Victory Points
export {
  awardVP,
  calculateTeamVP,
  calculateEscapeVP,
  getVPOpportunities,
} from './victoryPoints';
