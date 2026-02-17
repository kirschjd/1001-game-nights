/**
 * AI Controller Types
 *
 * Type definitions, difficulty presets, and weight tables for the
 * Heist City AI player controller.
 */

import { CharacterState, Position } from '../types';
import { LegalAction } from '../engine/types';

// ============== Score Breakdown ==============

/** How a score was computed — useful for debugging and tuning */
export interface ScoreBreakdown {
  vpValue: number;
  damageValue: number;
  safetyValue: number;
  positionValue: number;
  objectiveProgress: number;
  alertPenalty: number;
  synergy: number;
}

/** A scored action candidate */
export interface ScoredAction {
  action: LegalAction;
  characterId: string;
  targetPosition?: Position;
  targetId?: string;
  score: number;
  breakdown: ScoreBreakdown;
}

// ============== Difficulty ==============

/** AI difficulty preset */
export interface AIDifficulty {
  name: 'easy' | 'normal' | 'hard';
  lookAheadDepth: number;   // 0=greedy, 1=considers NPC response
  randomness: number;       // 0.0=always best, 1.0=random
  objectiveWeight: number;  // VP vs combat emphasis
  safetyWeight: number;     // risk aversion
}

export const DIFFICULTY_EASY: AIDifficulty = {
  name: 'easy',
  lookAheadDepth: 0,
  randomness: 0.4,
  objectiveWeight: 0.5,
  safetyWeight: 0.8,
};

export const DIFFICULTY_NORMAL: AIDifficulty = {
  name: 'normal',
  lookAheadDepth: 1,
  randomness: 0.1,
  objectiveWeight: 0.7,
  safetyWeight: 0.5,
};

export const DIFFICULTY_HARD: AIDifficulty = {
  name: 'hard',
  lookAheadDepth: 1,
  randomness: 0.0,
  objectiveWeight: 0.8,
  safetyWeight: 0.3,
};

// ============== Board Evaluation ==============

export type StrategicPosture = 'aggressive' | 'balanced' | 'defensive' | 'escape';

/** Info about a map objective the AI can pursue */
export interface ObjectiveInfo {
  type: 'computer' | 'info-drop' | 'escape-zone' | 'enemy-character';
  position: Position;
  targetId: string;
  vpValue: number;
  assignedTo?: string;
  turnsToReach?: number;
}

/** Threat to an AI character */
export interface ThreatInfo {
  characterId: string;       // which AI character is threatened
  threatSourceId: string;    // enemy character or NPC ID
  threatType: 'melee' | 'ranged' | 'npc';
  expectedDamagePerTurn: number;
  distanceInMoves: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

/** Character health snapshot for board evaluation */
export interface CharacterHealthInfo {
  characterId: string;
  current: number;
  max: number;
  state: CharacterState;
}

/** Full board evaluation snapshot */
export interface BoardEvaluation {
  playerVP: number;
  opponentVP: number;
  vpDifferential: number;
  alertLevel: number;
  turnsRemaining: number;
  objectivesAvailable: ObjectiveInfo[];
  characterHealth: CharacterHealthInfo[];
  threats: ThreatInfo[];
  strategicPosture: StrategicPosture;
}

// ============== Character Evaluation ==============

/** How good is a character's current board position */
export interface CharacterPositionScore {
  healthPercent: number;
  hasCover: boolean;
  threatsInRange: number;
  distanceToObjective: number;
  distanceToDeployment: number;
  stateScore: number;
  overall: number;
}

// ============== AI Activation / Turn Plan ==============

/** A single action to execute in an activation */
export interface AIActionSlot {
  slotIndex: number;
  actionId: string;
  target?: Position | string;
}

/** What the AI decides to do with one character activation */
export interface AIActivation {
  characterId: string;
  actions: AIActionSlot[];
  reasoning: string;
}

/** Full turn plan */
export interface AITurnPlan {
  activationOrder: string[];
  characterPlans: Array<{ characterId: string; actions: ScoredAction[] }>;
  strategicGoal: string;
  boardEval: BoardEvaluation;
}

// ============== Posture Weights ==============

/** Weight multipliers for each scoring dimension */
export interface PostureWeights {
  vp: number;
  combat: number;
  safety: number;
  position: number;
  alert: number;
  synergy: number;
}

export const POSTURE_WEIGHTS: Record<StrategicPosture, PostureWeights> = {
  aggressive: { vp: 1.0, combat: 0.8, safety: 0.3, position: 0.5, alert: 0.2, synergy: 0.4 },
  balanced:   { vp: 0.7, combat: 0.5, safety: 0.5, position: 0.6, alert: 0.5, synergy: 0.5 },
  defensive:  { vp: 0.4, combat: 0.3, safety: 0.9, position: 0.7, alert: 0.8, synergy: 0.6 },
  escape:     { vp: 0.3, combat: 0.1, safety: 0.7, position: 1.0, alert: 0.3, synergy: 0.3 },
};

/** Maximum number of turns in a game */
export const MAX_TURNS = 5;
