/**
 * AI Controller
 *
 * Main orchestrator that ties together strategic planning, tactical scoring,
 * and team coordination. Manages one AI player's decisions across a turn.
 *
 * Usage:
 *   const ai = new AIController(2, DIFFICULTY_NORMAL, 'hex');
 *   const plan = ai.planTurn(mapState, turnState, alertModifier);
 *   const activation = ai.getNextActivation(mapState, turnState, alertModifier);
 *   // ... execute activation ...
 *   ai.onActionResolved(characterId, actionId, result, updatedMapState);
 */

import { CharacterToken, MapState, GridType, Position } from '../types';
import { TurnState, LegalAction, AlertLevelState, CombatResult } from '../engine/types';
import { getLegalActions, canActivate } from '../engine/actions';
import { computeAlertLevel } from '../engine/alertLevel';
import { buildWallMap } from '../engine/spatial/wallMap';
import { getReachablePositions } from '../engine/spatial/pathfinding';
import { createGridUtils } from '../data/gridUtils';
import {
  AIDifficulty,
  AITurnPlan,
  AIActivation,
  ScoredAction,
  BoardEvaluation,
  DIFFICULTY_EASY,
  DIFFICULTY_NORMAL,
  DIFFICULTY_HARD,
} from './types';
import { evaluateBoard } from './strategicPlanning';
import { scoreActions } from './utilityScoring';
import { planActivationOrder, selectNextCharacter } from './teamCoordination';

/**
 * Stateful AI controller for one player's team.
 */
export class AIController {
  readonly playerNumber: 1 | 2;
  readonly difficulty: AIDifficulty;
  readonly gridType: GridType;

  private currentPlan: AITurnPlan | null = null;
  private activationOrder: string[] = [];
  private usedAbilities: Set<string> = new Set();

  constructor(playerNumber: 1 | 2, difficulty: AIDifficulty, gridType: GridType) {
    this.playerNumber = playerNumber;
    this.difficulty = difficulty;
    this.gridType = gridType;
  }

  /**
   * Plan the full turn. Called at the start of the AI's turn.
   * Evaluates the board, determines strategy, plans activation order,
   * and pre-scores actions for each character.
   */
  planTurn(
    mapState: MapState,
    turnState: TurnState,
    alertModifier: number
  ): AITurnPlan {
    // Strategic evaluation
    const boardEval = evaluateBoard(
      mapState, turnState, this.gridType,
      this.playerNumber, alertModifier, this.difficulty
    );

    const alertLevel = computeAlertLevel(mapState, alertModifier);

    // Plan activation order
    this.activationOrder = planActivationOrder(
      mapState, turnState, this.gridType,
      this.playerNumber, boardEval, alertLevel
    );

    // Pre-score actions for each character
    const characterPlans: Array<{ characterId: string; actions: ScoredAction[] }> = [];

    for (const charId of this.activationOrder) {
      const char = mapState.characters.find(c => c.id === charId);
      if (!char) continue;

      const legalActions = getLegalActions(
        char, mapState, turnState, this.gridType, this.usedAbilities
      );
      const scored = scoreActions(
        char, legalActions, mapState, turnState,
        this.gridType, boardEval, alertModifier
      );

      characterPlans.push({ characterId: charId, actions: scored });
    }

    // Determine strategic goal description
    const goal = describeStrategy(boardEval);

    this.currentPlan = {
      activationOrder: this.activationOrder,
      characterPlans,
      strategicGoal: goal,
      boardEval,
    };

    return this.currentPlan;
  }

  /**
   * Get the next character activation.
   * Returns the character to activate and their planned actions.
   * Returns null when all characters have been activated (AI should pass).
   */
  getNextActivation(
    mapState: MapState,
    turnState: TurnState,
    alertModifier: number
  ): AIActivation | null {
    // Re-plan if needed (e.g., state changed significantly)
    if (!this.currentPlan) {
      this.planTurn(mapState, turnState, alertModifier);
    }

    // Find next character to activate
    const nextCharId = selectNextCharacter(
      this.activationOrder, turnState, mapState
    );
    if (!nextCharId) return null;

    const char = mapState.characters.find(c => c.id === nextCharId);
    if (!char) return null;

    // Re-score actions with current state (may have changed)
    const boardEval = this.currentPlan!.boardEval;
    const legalActions = getLegalActions(
      char, mapState, turnState, this.gridType, this.usedAbilities
    );

    if (legalActions.length === 0) {
      return {
        characterId: nextCharId,
        actions: [],
        reasoning: 'No legal actions available',
      };
    }

    const scored = scoreActions(
      char, legalActions, mapState, turnState,
      this.gridType, boardEval, alertModifier
    );

    // Apply difficulty filter to select actions
    const selectedActions = this.selectActionsForActivation(scored, char);

    // Build the activation with action slots
    const activationActions = selectedActions.map((sa, idx) => {
      // For move actions, compute the best reachable destination
      const baseName = extractBaseName(sa.action.actionId);
      let target: Position | string | undefined = sa.targetId;

      if (baseName === 'Move' || baseName === 'Hustle' || baseName === 'Sprint') {
        target = this.pickMoveDestination(char, mapState, boardEval);
      }

      return {
        slotIndex: idx,
        actionId: sa.action.actionId,
        target,
      };
    });

    const reasoning = selectedActions.length > 0
      ? describeActivation(char, selectedActions, boardEval)
      : 'No beneficial actions found';

    return {
      characterId: nextCharId,
      actions: activationActions,
      reasoning,
    };
  }

  /**
   * Called after each action resolves with actual results.
   * Updates internal state for re-planning.
   */
  onActionResolved(
    characterId: string,
    actionId: string,
    result: CombatResult | null,
    updatedMapState: MapState
  ): void {
    // Track used once-per-game abilities
    const baseName = extractBaseName(actionId);
    const oncePerGame = ['In Plain Sight', 'All Eyes On Me', 'Ninja Vanish', 'All According to Plan'];
    if (oncePerGame.indexOf(baseName) >= 0) {
      this.usedAbilities.add(baseName);
    }

    // Invalidate plan to trigger re-evaluation next activation
    // (This is simple but effective — the AI re-scores each activation)
    this.currentPlan = null;
  }

  /**
   * Select actions for a full activation (up to 3 slots).
   * Applies difficulty-based randomness.
   */
  private selectActionsForActivation(
    scored: ScoredAction[],
    character: CharacterToken
  ): ScoredAction[] {
    if (scored.length === 0) return [];

    const selected: ScoredAction[] = [];
    let remainingSlots = 3 - (character.actions || []).filter(a => a && a !== '').length;

    // Greedily select best actions that fit in remaining slots
    const available = scored.slice(); // copy

    while (remainingSlots > 0 && available.length > 0) {
      const picked = this.applyDifficultyFilter(available);
      if (!picked) break;
      if (picked.action.slotCost > remainingSlots) {
        // Remove this action and try next
        const idx = available.indexOf(picked);
        if (idx >= 0) available.splice(idx, 1);
        continue;
      }

      selected.push(picked);
      remainingSlots -= picked.action.slotCost;

      // Remove picked action from available
      const idx = available.indexOf(picked);
      if (idx >= 0) available.splice(idx, 1);
    }

    return selected;
  }

  /**
   * Apply difficulty-based randomness to action selection.
   * Easy: randomly pick from top 3 (weighted)
   * Normal: 90% best, 10% second-best
   * Hard: always best
   */
  private applyDifficultyFilter(scored: ScoredAction[]): ScoredAction | null {
    if (scored.length === 0) return null;
    if (scored.length === 1) return scored[0];

    const randomness = this.difficulty.randomness;

    if (randomness <= 0) {
      // Hard mode: always best
      return scored[0];
    }

    // Determine how many candidates to consider
    const candidateCount = Math.min(
      scored.length,
      randomness >= 0.3 ? 3 : 2
    );

    // Weighted random from top candidates
    const candidates = scored.slice(0, candidateCount);
    const totalScore = candidates.reduce((sum, c) => sum + Math.max(0.01, c.score), 0);

    let roll = Math.random() * totalScore;
    for (const candidate of candidates) {
      roll -= Math.max(0.01, candidate.score);
      if (roll <= 0) return candidate;
    }

    return candidates[candidates.length - 1];
  }

  /**
   * Pick the best reachable position for a move action.
   * Moves toward the assigned objective, or closest enemy if no objective.
   */
  private pickMoveDestination(
    character: CharacterToken,
    mapState: MapState,
    boardEval: BoardEvaluation
  ): Position {
    const gridUtils = createGridUtils(this.gridType);
    const wallMap = buildWallMap(mapState);
    const moveRange = character.stats.movement;
    const reachable = getReachablePositions(
      character.position, moveRange, wallMap, mapState, this.gridType, character.id
    );

    // Find our target position: assigned objective, or nearest enemy, or fallback
    let goalPos: Position | null = null;

    // Check assigned objective
    const assigned = boardEval.objectivesAvailable.find(o => o.assignedTo === character.id);
    if (assigned) {
      goalPos = assigned.position;
    }

    // Fallback: nearest enemy character
    if (!goalPos) {
      let bestDist = Infinity;
      for (const c of mapState.characters) {
        if (c.playerNumber === character.playerNumber) continue;
        if (c.state === 'Unconscious') continue;
        const dist = gridUtils.getCellDistance(character.position, c.position);
        if (dist < bestDist) {
          bestDist = dist;
          goalPos = c.position;
        }
      }
    }

    // Pick the reachable position closest to the goal
    if (goalPos) {
      let bestPos = character.position;
      let bestDist = gridUtils.getCellDistance(character.position, goalPos);

      reachable.forEach((cell) => {
        const dist = gridUtils.getCellDistance(cell.position, goalPos!);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = cell.position;
        }
      });

      return bestPos;
    }

    // No goal found — pick a random reachable position (shouldn't happen often)
    const cells: Position[] = [];
    reachable.forEach((cell) => cells.push(cell.position));
    if (cells.length > 0) {
      return cells[Math.floor(Math.random() * cells.length)];
    }

    return character.position;
  }

  /** Reset state for a new game */
  reset(): void {
    this.currentPlan = null;
    this.activationOrder = [];
    this.usedAbilities = new Set();
  }
}

// ============== Factory Functions ==============

/** Create an AI controller with a preset difficulty */
export function createAIController(
  playerNumber: 1 | 2,
  difficultyName: 'easy' | 'normal' | 'hard',
  gridType: GridType
): AIController {
  const difficulties: Record<string, AIDifficulty> = {
    easy: DIFFICULTY_EASY,
    normal: DIFFICULTY_NORMAL,
    hard: DIFFICULTY_HARD,
  };
  return new AIController(playerNumber, difficulties[difficultyName], gridType);
}

// ============== Helpers ==============

function extractBaseName(actionId: string): string {
  const parenIndex = actionId.indexOf(' (');
  if (parenIndex > 0) return actionId.substring(0, parenIndex);
  return actionId;
}

function describeStrategy(boardEval: BoardEvaluation): string {
  const posture = boardEval.strategicPosture;
  const vpDiff = boardEval.vpDifferential;

  if (posture === 'escape') return 'Get characters to deployment zone for escape VP';
  if (posture === 'aggressive') return `Behind by ${Math.abs(vpDiff)} VP — aggressive scoring push`;
  if (posture === 'defensive') return `Ahead by ${vpDiff} VP — protect the lead`;
  return 'Balanced approach: mix of objectives and survival';
}

function describeActivation(
  char: CharacterToken,
  actions: ScoredAction[],
  boardEval: BoardEvaluation
): string {
  if (actions.length === 0) return 'No actions planned';

  const parts: string[] = [];
  for (const sa of actions) {
    const baseName = extractBaseName(sa.action.actionId);
    if (sa.targetId) {
      parts.push(`${baseName} → ${sa.targetId}`);
    } else {
      parts.push(baseName);
    }
  }

  return `${char.name} (${char.role}): ${parts.join(', ')}`;
}
