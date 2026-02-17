/**
 * Utility Scoring — the AI's core brain
 *
 * Scores each legal action across multiple dimensions and combines
 * them using posture-weighted sums. The highest-scoring action
 * is selected (with difficulty-based randomness applied later).
 *
 * Dimensions:
 *   vpValue      — expected VP gain from this action
 *   damageValue  — expected damage dealt (weighted by target priority)
 *   safetyValue  — how safe the character is after the action
 *   positionValue — strategic positioning quality of the result
 *   alertPenalty  — cost of raising alert level
 *   synergy       — team coordination bonus
 */

import { CharacterToken, MapState, GridType, Position } from '../types';
import { LegalAction, TurnState, AlertLevelState } from '../engine/types';
import { expectedDamage } from '../engine/combat';
import { probability2d6 } from '../engine/dice';
import { predictAlertLevel, computeAlertLevel } from '../engine/alertLevel';
import { previewNPCPhase } from '../engine/npc/npcPhase';
import { createGridUtils } from '../data/gridUtils';
import { getReachablePositions } from '../engine/spatial/pathfinding';
import { buildWallMap, buildLOSBlockers, buildItemPositionMap } from '../engine/spatial/wallMap';
import { hasCover } from '../engine/spatial/coverDetection';
import { getEnemiesInRange } from '../engine/spatial/rangeQueries';
import {
  ScoredAction,
  ScoreBreakdown,
  BoardEvaluation,
  AIDifficulty,
  PostureWeights,
  POSTURE_WEIGHTS,
} from './types';

/**
 * Score all legal actions for a character.
 * Returns sorted by score (highest first).
 */
export function scoreActions(
  character: CharacterToken,
  legalActions: LegalAction[],
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  boardEval: BoardEvaluation,
  alertModifier: number
): ScoredAction[] {
  const scored: ScoredAction[] = [];

  for (const action of legalActions) {
    const result = scoreAction(
      character, action, mapState, turnState, gridType, boardEval, alertModifier
    );
    scored.push(result);
  }

  // Sort highest score first
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Score a single action. Computes sub-scores, applies posture weights.
 */
export function scoreAction(
  character: CharacterToken,
  action: LegalAction,
  mapState: MapState,
  turnState: TurnState,
  gridType: GridType,
  boardEval: BoardEvaluation,
  alertModifier: number
): ScoredAction {
  const weights = POSTURE_WEIGHTS[boardEval.strategicPosture];

  // Determine best target for this action
  const bestTarget = pickBestTarget(action, character, mapState, gridType);

  const breakdown: ScoreBreakdown = {
    vpValue: scoreVPValue(action, character, mapState, turnState),
    damageValue: scoreCombatValue(action, character, bestTarget, mapState, gridType),
    safetyValue: scoreSafetyValue(action, character, mapState, gridType, boardEval, alertModifier),
    positionValue: scorePositionValue(action, character, mapState, gridType, boardEval),
    objectiveProgress: scoreObjectiveProgress(action, character, mapState, gridType, boardEval),
    alertPenalty: scoreAlertPenalty(action, character, mapState, alertModifier, turnState),
    synergy: 0, // Simplified: synergy scoring requires full team plan context
  };

  const score = applyWeights(breakdown, weights);

  return {
    action,
    characterId: character.id,
    targetId: bestTarget?.id,
    score,
    breakdown,
  };
}

// ============== Sub-Scoring Functions ==============

/**
 * Expected VP gain from this action.
 */
export function scoreVPValue(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  turnState: TurnState
): number {
  const baseName = extractBaseName(action.actionId);

  // Hack computer: P(success) * 1 VP
  if (baseName === 'Hack' && action.validTargets) {
    const hasComputer = action.validTargets.some(tid =>
      mapState.items.some(item => item.id === tid && item.type === 'computer')
    );
    if (hasComputer) {
      const pSuccess = probability2d6(character.stats.hack);
      return pSuccess * 1.0;
    }
    const hasInfoDrop = action.validTargets.some(tid =>
      mapState.items.some(item => item.id === tid && item.type === 'info-drop')
    );
    if (hasInfoDrop) {
      const pSuccess = probability2d6(character.stats.hack + 1); // +1 difficulty
      return pSuccess * 1.0;
    }
  }

  // Get Mob Intel: P(charm) * 1 VP (only if disguised)
  if (baseName === 'Get Mob Intel' && character.state === 'Disguised') {
    const pSuccess = probability2d6(character.stats.con + 2); // +2 difficulty
    return pSuccess * 1.0;
  }

  // Attack that could down an enemy: P(kill) * 1 VP
  if (action.metadata?.isAttack && action.validTargets) {
    const attackType = action.metadata.attackType as 'melee' | 'ranged';
    const weaponId = action.metadata.weaponId as string;

    for (const targetId of action.validTargets) {
      const target = mapState.characters.find(c => c.id === targetId);
      if (target && target.stats.wounds > 0) {
        const expDmg = expectedDamage(character, target, weaponId || 'fist', attackType);
        if (expDmg >= target.stats.wounds) {
          // Could down this target
          return (expDmg / Math.max(1, target.stats.wounds)) * 1.0;
        }
      }
    }
  }

  return 0;
}

/**
 * Expected combat value (damage dealt, weighted by target priority).
 */
export function scoreCombatValue(
  action: LegalAction,
  character: CharacterToken,
  target: CharacterToken | null,
  mapState: MapState,
  gridType: GridType
): number {
  if (!action.metadata?.isAttack || !target) return 0;

  const attackType = action.metadata.attackType as 'melee' | 'ranged';
  const weaponId = action.metadata.weaponId as string;
  const repeatPenalty = (action.metadata.repeatPenalty as number) || 0;

  let expDmg = expectedDamage(character, target, weaponId || 'fist', attackType, repeatPenalty);

  // Fallback for fist/unknown weapons (expectedDamage returns 0 if weapon not in DB)
  if (expDmg === 0 && (weaponId === 'fist' || !weaponId)) {
    const dc = attackType === 'melee' ? character.stats.meleeSkill : character.stats.ballisticSkill;
    const pHit = probability2d6(dc);
    expDmg = pHit * 1; // fist does 1 damage
  }

  // Bonus for potentially downing the target
  const downBonus = expDmg >= target.stats.wounds ? 0.5 : 0;

  // Normalize: 3 damage is roughly max expected per attack
  return Math.min(1, expDmg / 3) + downBonus;
}

/**
 * Safety score: how safe is the character after this action.
 * Higher = safer. Evaluates exposure to NPC and enemy attacks.
 */
export function scoreSafetyValue(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  boardEval: BoardEvaluation,
  alertModifier: number
): number {
  // Base safety from character state
  let safety = 0.5;

  // Non-move actions don't change position, so safety is current safety
  if (character.state === 'Hidden') safety = 0.9;
  else if (character.state === 'Disguised') safety = 0.8;
  else if (character.state === 'Overt') safety = 0.4;

  // Actions that break stealth reduce safety
  const baseName = extractBaseName(action.actionId);
  if (baseName === 'Go Loud') {
    safety -= 0.3;
  }

  // Attacks with non-silent weapons break stealth
  if (action.metadata?.isAttack && character.state !== 'Overt') {
    safety -= 0.2; // May break stealth
  }

  // Fewer threats in range = safer
  const myThreats = boardEval.threats.filter(t => t.characterId === character.id);
  const threatPenalty = Math.min(myThreats.length * 0.1, 0.4);
  safety -= threatPenalty;

  // Health factor: low health = more concerned about safety
  const healthPct = character.stats.wounds / character.stats.maxWounds;
  if (healthPct < 0.3) safety -= 0.2;

  return Math.max(0, Math.min(1, safety));
}

/**
 * Strategic position value.
 * For move actions: evaluates the best reachable position.
 * For non-move actions: evaluates current position.
 */
export function scorePositionValue(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  boardEval: BoardEvaluation
): number {
  const gridUtils = createGridUtils(gridType);

  // Find the character's assigned objective
  const assigned = boardEval.objectivesAvailable.find(o => o.assignedTo === character.id);
  if (!assigned) return 0.5; // No objective, neutral score

  const currentDist = gridUtils.getCellDistance(character.position, assigned.position);

  // For move actions: position value is about getting closer to objective
  const baseName = extractBaseName(action.actionId);
  if (baseName === 'Move' || baseName === 'Hustle' || baseName === 'Sprint') {
    // Moving is generally good if we're far from our objective
    const closerBonus = currentDist > 1 ? 0.3 : 0;
    return 0.5 + closerBonus;
  }

  // For non-move actions at the objective: high value
  if (currentDist <= 1) return 0.8;

  return 0.4;
}

/**
 * Objective progress — direct VP-generating potential.
 */
export function scoreObjectiveProgress(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType,
  boardEval: BoardEvaluation
): number {
  const baseName = extractBaseName(action.actionId);

  // Hack at a computer = direct objective progress
  if (baseName === 'Hack') return 0.8;

  // Get Mob Intel = objective progress (if disguised)
  if (baseName === 'Get Mob Intel' && character.state === 'Disguised') return 0.7;

  // Move toward objective
  if (baseName === 'Move' || baseName === 'Hustle' || baseName === 'Sprint') {
    const assigned = boardEval.objectivesAvailable.find(o => o.assignedTo === character.id);
    if (assigned) {
      const gridUtils = createGridUtils(gridType);
      const dist = gridUtils.getCellDistance(character.position, assigned.position);
      // Closer to objective = more progress implied
      return dist > 0 ? Math.min(0.6, 0.6 / dist) : 0.3;
    }
    return 0.3;
  }

  return 0;
}

/**
 * Penalty for actions that would raise the alert level.
 * Returns a negative penalty (higher penalty = worse).
 */
export function scoreAlertPenalty(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  alertModifier: number,
  turnState: TurnState
): number {
  const baseName = extractBaseName(action.actionId);

  // Only penalize actions that could raise alert
  const wouldReveal = (
    (baseName === 'Go Loud') ||
    (action.metadata?.isAttack && character.state !== 'Overt')
  );

  if (!wouldReveal) return 0;

  // Calculate current vs predicted alert
  const current = computeAlertLevel(mapState, alertModifier);
  const predicted = predictAlertLevel(mapState, alertModifier, 1);

  // Crossing a threshold is especially costly
  if (predicted.level > current.level) {
    // Bigger penalty for bigger jumps
    const jump = predicted.level - current.level;
    // Less penalty on later turns (alert matters less near game end)
    const turnFactor = Math.max(0.3, 1 - (turnState.turnNumber - 1) * 0.15);
    return -(0.3 * jump * turnFactor);
  }

  // Minor penalty for adding to revealed count even without threshold
  return -0.05;
}

// ============== Helpers ==============

/**
 * Apply posture weights to a score breakdown.
 */
export function applyWeights(breakdown: ScoreBreakdown, weights: PostureWeights): number {
  return (
    breakdown.vpValue * weights.vp +
    breakdown.damageValue * weights.combat +
    breakdown.safetyValue * weights.safety +
    breakdown.positionValue * weights.position +
    breakdown.objectiveProgress * weights.vp + // objective uses VP weight
    breakdown.alertPenalty * weights.alert +
    breakdown.synergy * weights.synergy
  );
}

/**
 * Pick the best target for an action from its valid targets.
 * Returns the enemy character with the lowest wounds (easiest to down).
 */
function pickBestTarget(
  action: LegalAction,
  character: CharacterToken,
  mapState: MapState,
  gridType: GridType
): CharacterToken | null {
  if (!action.validTargets || action.validTargets.length === 0) return null;
  if (!action.metadata?.isAttack) return null;

  let bestTarget: CharacterToken | null = null;
  let lowestWounds = Infinity;

  for (const targetId of action.validTargets) {
    const target = mapState.characters.find(c => c.id === targetId);
    if (target && target.stats.wounds < lowestWounds) {
      lowestWounds = target.stats.wounds;
      bestTarget = target;
    }
  }

  return bestTarget;
}

/**
 * Extract base action name (before parenthetical stats).
 */
function extractBaseName(actionId: string): string {
  const parenIndex = actionId.indexOf(' (');
  if (parenIndex > 0) return actionId.substring(0, parenIndex);
  return actionId;
}
