/**
 * AI Controller — Barrel Export
 *
 * Utility-based AI player for Heist City.
 * Strategic planning, tactical scoring, threat assessment,
 * and team coordination.
 */

// Types & Constants
export type {
  ScoredAction,
  ScoreBreakdown,
  AIDifficulty,
  BoardEvaluation,
  ObjectiveInfo,
  ThreatInfo,
  CharacterHealthInfo,
  CharacterPositionScore,
  AIActivation,
  AIActionSlot,
  AITurnPlan,
  PostureWeights,
  StrategicPosture,
} from './types';

export {
  DIFFICULTY_EASY,
  DIFFICULTY_NORMAL,
  DIFFICULTY_HARD,
  POSTURE_WEIGHTS,
  MAX_TURNS,
} from './types';

// Threat Assessment
export {
  assessThreats,
  assessCharacterThreat,
  predictNPCThreat,
} from './threatAssessment';

// Character Evaluation
export {
  evaluateCharacterPosition,
  evaluateTeamPosition,
} from './characterEvaluation';

// Utility Scoring
export {
  scoreActions,
  scoreAction,
  scoreVPValue,
  scoreCombatValue,
  scoreSafetyValue,
  scorePositionValue,
  scoreAlertPenalty,
  applyWeights,
} from './utilityScoring';

// Team Coordination
export {
  planActivationOrder,
  selectNextCharacter,
} from './teamCoordination';

// Strategic Planning
export {
  evaluateBoard,
  getStrategicPosture,
  prioritizeObjectives,
  assignCharactersToObjectives,
} from './strategicPlanning';

// AI Controller
export {
  AIController,
  createAIController,
} from './aiController';
