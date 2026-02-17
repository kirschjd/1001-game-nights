/**
 * Turn Structure & Activation Management
 *
 * Rules:
 *   - Game is 5 turns
 *   - Turn 1 initiative to deploying player; alternates each turn
 *   - Players alternate activating one character at a time
 *   - If one side finishes first, the other continues solo
 *   - After all player activations: NPC phase
 *   - After NPC phase: end-of-turn cleanup (clear actions, reset exhausted, recalculate alert)
 */

import { MapState, CharacterToken } from '../types';
import { TurnState, TurnPhase } from './types';

const MAX_TURNS = 5;

/**
 * Create initial turn state for turn 1.
 * All non-Unconscious characters start unactivated.
 */
export function createInitialTurnState(mapState: MapState): TurnState {
  const activations = new Map<string, boolean>();
  for (const char of mapState.characters) {
    if (char.state !== 'Unconscious') {
      activations.set(char.id, true); // true = still needs to activate
    }
  }

  return {
    turnNumber: 1,
    phase: 'player-activation',
    activePlayerNumber: 1, // Player 1 deploys, gets first initiative
    activationsRemaining: activations,
    npcPhaseComplete: false,
  };
}

/**
 * Get characters belonging to a player that still need to activate.
 */
function getUnactivatedCharacters(turnState: TurnState, mapState: MapState, playerNumber: 1 | 2): CharacterToken[] {
  return mapState.characters.filter(char =>
    char.playerNumber === playerNumber &&
    char.state !== 'Unconscious' &&
    turnState.activationsRemaining.get(char.id) === true
  );
}

/**
 * Which player activates next?
 * Alternates, but if one side is fully activated, the other continues.
 */
export function getNextActivatingPlayer(turnState: TurnState, mapState: MapState): 1 | 2 {
  const p1Remaining = getUnactivatedCharacters(turnState, mapState, 1);
  const p2Remaining = getUnactivatedCharacters(turnState, mapState, 2);

  // If one side has no remaining activations, the other goes
  if (p1Remaining.length === 0 && p2Remaining.length > 0) return 2;
  if (p2Remaining.length === 0 && p1Remaining.length > 0) return 1;

  // Both have remaining — return the active player (alternating)
  return turnState.activePlayerNumber;
}

/**
 * Mark a character as having activated this turn.
 * Switches active player to the other side.
 */
export function markActivated(turnState: TurnState, characterId: string, mapState: MapState): TurnState {
  const newActivations = new Map(turnState.activationsRemaining);
  newActivations.set(characterId, false); // false = already activated

  const otherPlayer: 1 | 2 = turnState.activePlayerNumber === 1 ? 2 : 1;

  const newState: TurnState = {
    ...turnState,
    activationsRemaining: newActivations,
    activePlayerNumber: otherPlayer,
  };

  // Correct the active player based on who actually has remaining activations
  newState.activePlayerNumber = getNextActivatingPlayer(newState, mapState);

  return newState;
}

/**
 * Check if all non-Unconscious characters have been activated.
 */
export function allPlayersActivated(turnState: TurnState, mapState: MapState): boolean {
  for (const char of mapState.characters) {
    if (char.state === 'Unconscious') continue;
    if (turnState.activationsRemaining.get(char.id) === true) {
      return false;
    }
  }
  return true;
}

/**
 * Get the list of characters that can still be activated by a player.
 */
export function getActivatableCharacters(turnState: TurnState, mapState: MapState, playerNumber: 1 | 2): CharacterToken[] {
  return getUnactivatedCharacters(turnState, mapState, playerNumber);
}

/**
 * Transition to NPC phase.
 */
export function advanceToNPCPhase(turnState: TurnState): TurnState {
  return {
    ...turnState,
    phase: 'npc-phase',
  };
}

/**
 * Transition to end-of-turn cleanup.
 */
export function advanceToEndOfTurn(turnState: TurnState): TurnState {
  return {
    ...turnState,
    phase: 'end-of-turn',
    npcPhaseComplete: true,
  };
}

/**
 * Advance to the next turn. Resets all activations.
 * If turn > 5, sets phase to 'game-over'.
 */
export function advanceToNextTurn(turnState: TurnState, mapState: MapState): TurnState {
  const nextTurn = turnState.turnNumber + 1;

  if (nextTurn > MAX_TURNS) {
    return {
      ...turnState,
      turnNumber: nextTurn,
      phase: 'game-over',
    };
  }

  // Reset activations for the new turn
  const activations = new Map<string, boolean>();
  for (const char of mapState.characters) {
    if (char.state !== 'Unconscious') {
      activations.set(char.id, true);
    }
  }

  // Initiative alternates each turn
  const nextInitiative: 1 | 2 = turnState.turnNumber % 2 === 0 ? 1 : 2;

  return {
    turnNumber: nextTurn,
    phase: 'player-activation',
    activePlayerNumber: nextInitiative,
    activationsRemaining: activations,
    npcPhaseComplete: false,
  };
}

/**
 * Get the updates to apply at end of turn.
 * Clears action arrays, resets exhausted flags (except Unconscious).
 */
export function getEndOfTurnUpdates(mapState: MapState): CharacterToken[] {
  return mapState.characters.map(char => {
    if (char.state === 'Unconscious') return char;

    return {
      ...char,
      actions: [],
      exhausted: false,
    };
  });
}

/**
 * Check if it's the final turn (turn 5).
 */
export function isFinalTurn(turnState: TurnState): boolean {
  return turnState.turnNumber >= MAX_TURNS;
}

/**
 * Get the current turn phase description.
 */
export function getPhaseDescription(phase: TurnPhase): string {
  switch (phase) {
    case 'player-activation': return 'Player Activation';
    case 'npc-phase': return 'NPC Phase';
    case 'end-of-turn': return 'End of Turn';
    case 'game-over': return 'Game Over';
  }
}
