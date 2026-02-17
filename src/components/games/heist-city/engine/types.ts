/**
 * Engine-specific types for Heist City rules engine.
 *
 * These types are used by the rules engine for combat resolution,
 * action legality, turn management, and VP tracking. They extend
 * the existing game types in types/index.ts.
 */

import { CharacterState, CharacterToken, Position, MapState } from '../types';

// ============== Dice ==============

/** Result of rolling 2d6 */
export interface DiceRollResult {
  dice1: number;
  dice2: number;
  total: number;
}

// ============== Combat ==============

/** Outcome of a single attack */
export interface AttackResult {
  hit: boolean;
  roll: DiceRollResult;
  targetNumber: number;
  damage: number;
  weaponId: string;
  attackerState: CharacterState;
}

/** Outcome of a defense save */
export interface DefenseResult {
  saved: boolean;
  roll: DiceRollResult;
  targetNumber: number;
  damageReduced: number;
  finalDamage: number;
}

/** Full combat exchange */
export interface CombatResult {
  attack: AttackResult;
  defense: DefenseResult | null;
  targetWoundsAfter: number;
  targetStateAfter: CharacterState;
  targetDowned: boolean;
}

// ============== Actions ==============

/** A legal action a character can take right now */
export interface LegalAction {
  actionId: string;
  name: string;
  slotCost: number;
  requiresTarget: boolean;
  validTargets?: string[];
  validDestinations?: Position[];
  metadata?: Record<string, unknown>;
}

// ============== Turn Structure ==============

export type TurnPhase = 'player-activation' | 'npc-phase' | 'end-of-turn' | 'game-over';

export interface TurnState {
  turnNumber: number;
  phase: TurnPhase;
  activePlayerNumber: 1 | 2;
  activationsRemaining: Map<string, boolean>;
  npcPhaseComplete: boolean;
}

// ============== Victory Points ==============

export type VPEventType =
  | 'hack-computer'
  | 'hack-info-drop'
  | 'info-drop-extract'
  | 'down-enemy'
  | 'reveal-hidden'
  | 'reveal-disguised'
  | 'mob-intel'
  | 'escape';

export interface VPEvent {
  type: VPEventType;
  characterId: string;
  points: number;
  turnNumber: number;
  description: string;
}

// ============== Alert Level ==============

export interface AlertLevelState {
  level: 0 | 1 | 2 | 3;
  unitsRevealed: number;
  modifier: number;
  total: number;
  npcActionsPerActivation: number;
}

// ============== State Modifiers ==============

export interface StateModifiers {
  hitModifier: number;
  damageModifier: number;
  defenseModifier: number;
  hackModifier: number;
  charmModifier: number;
}
