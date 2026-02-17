/**
 * useAIController — AI Lifecycle Hook (Step-by-Step Mode)
 *
 * Instead of auto-executing all activations, the AI:
 * 1. Analyzes the board and picks the best single-character activation
 * 2. Shows the plan in the UI
 * 3. Waits for the human to press "Execute" to run it
 * 4. After execution, goes idle until the human activates their own character
 *    and requests the next AI activation
 *
 * This enables proper alternating turns (human activates one, AI activates one).
 */

import { useRef, useCallback, useEffect, useState, Dispatch } from 'react';
import { MapState, GridType } from '../types';
import { TurnState } from '../engine/types';
import { createInitialTurnState, markActivated } from '../engine/turnStructure';
import { AIController, createAIController } from '../ai/aiController';
import { AITurnPlan, AIActivation } from '../ai/types';
import {
  AIEmitters,
  executeActivation,
  buildAIPlanLogEntry,
  AIActionResult,
} from '../ai/aiAdapter';
import { HeistCityAction } from './useHeistCityState';

// ============== Types ==============

export interface AIControllerOptions {
  enabled: boolean;
  difficulty: 'easy' | 'normal' | 'hard';
  playerNumber: 1 | 2;
  mapState: MapState | null;
  turnNumber: number;
  gridType: GridType;
  alertModifier: number;
  emitters: AIEmitters;
  dispatch: Dispatch<HeistCityAction>;
}

export interface AIControllerHookReturn {
  /** The next planned activation (null if none planned yet) */
  pendingActivation: AIActivation | null;
  /** Human-readable reasoning for the planned activation */
  lastReasoning: string;
  /** Error message if something went wrong */
  error: string | null;
  /** Plan the next single-character activation (analyzes board, picks best) */
  planNext: () => void;
  /** Execute the currently planned activation */
  executeNext: () => void;
}

// ============== Hook ==============

export function useAIController(options: AIControllerOptions): AIControllerHookReturn {
  const {
    enabled, difficulty, playerNumber, mapState, turnNumber,
    gridType, alertModifier, emitters, dispatch,
  } = options;

  // Refs for mutable state
  const controllerRef = useRef<AIController | null>(null);
  const turnStateRef = useRef<TurnState | null>(null);

  // Refs for values the execution needs to read fresh
  const mapStateRef = useRef(mapState);
  const emittersRef = useRef(emitters);
  useEffect(() => { mapStateRef.current = mapState; }, [mapState]);
  useEffect(() => { emittersRef.current = emitters; }, [emitters]);

  // State exposed to the UI
  const [pendingActivation, setPendingActivation] = useState<AIActivation | null>(null);
  const [lastReasoning, setLastReasoning] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Recreate controller when config changes
  useEffect(() => {
    if (enabled) {
      controllerRef.current = createAIController(playerNumber, difficulty, gridType);
      turnStateRef.current = null;
      setPendingActivation(null);
      setLastReasoning('');
      setError(null);
    } else {
      controllerRef.current = null;
      turnStateRef.current = null;
      setPendingActivation(null);
      setLastReasoning('');
      setError(null);
      dispatch({ type: 'SET_AI_STATUS', status: 'idle' });
    }
  }, [enabled, difficulty, playerNumber, gridType, dispatch]);

  // Reset turn state when turn number changes
  useEffect(() => {
    if (enabled && mapState) {
      turnStateRef.current = createInitialTurnState(mapState);
      setPendingActivation(null);
    }
  }, [enabled, turnNumber, mapState]);

  // Plan the next single-character activation
  const planNext = useCallback(() => {
    const controller = controllerRef.current;
    const currentMapState = mapStateRef.current;
    if (!controller || !currentMapState) return;

    try {
      dispatch({ type: 'SET_AI_STATUS', status: 'thinking' });
      setError(null);

      // Ensure we have a turn state
      if (!turnStateRef.current) {
        turnStateRef.current = createInitialTurnState(currentMapState);
      }

      // Plan the full turn (or re-plan with fresh state)
      const plan = controller.planTurn(currentMapState, turnStateRef.current, alertModifier);

      // Get the next single activation
      const activation = controller.getNextActivation(
        currentMapState, turnStateRef.current, alertModifier
      );

      if (!activation) {
        setLastReasoning('All AI characters have been activated this turn');
        setPendingActivation(null);
        dispatch({ type: 'SET_AI_STATUS', status: 'idle' });
        return;
      }

      // Find the character name for display
      const char = currentMapState.characters.find(c => c.id === activation.characterId);
      const charName = char ? `${char.name} (${char.role})` : activation.characterId;

      setPendingActivation(activation);
      setLastReasoning(`${charName}: ${activation.reasoning}`);

      // Log the plan
      dispatch({
        type: 'ADD_LOG_ENTRY',
        entry: buildAIPlanLogEntry(`Planning: ${charName} — ${activation.reasoning}`),
      });

      dispatch({ type: 'SET_AI_STATUS', status: 'idle' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown AI error';
      setError(message);
      dispatch({ type: 'SET_AI_STATUS', status: 'error', error: message });
    }
  }, [alertModifier, dispatch]);

  // Execute the currently planned activation
  const executeNext = useCallback(async () => {
    const controller = controllerRef.current;
    const currentMapState = mapStateRef.current;
    const activation = pendingActivation;

    if (!controller || !currentMapState || !activation) return;

    try {
      dispatch({ type: 'SET_AI_STATUS', status: 'executing' });
      setError(null);

      // Execute the activation
      const results = await executeActivation(
        activation, currentMapState, gridType,
        emittersRef.current,
        (result: AIActionResult) => {
          dispatch({ type: 'ADD_LOG_ENTRY', entry: result.logEntry });
        }
      );

      // Notify controller of results
      for (const result of results) {
        controller.onActionResolved(
          activation.characterId,
          result.actionId,
          null,
          mapStateRef.current || currentMapState
        );
      }

      // Mark character as activated in turn state
      if (turnStateRef.current) {
        turnStateRef.current = markActivated(
          turnStateRef.current, activation.characterId, currentMapState
        );
      }

      // Mark the character as exhausted
      emittersRef.current.emitCharacterUpdate(activation.characterId, { exhausted: true });

      // Clear pending activation — human's turn next
      setPendingActivation(null);
      dispatch({ type: 'SET_AI_STATUS', status: 'idle' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown AI error';
      setError(message);
      dispatch({ type: 'SET_AI_STATUS', status: 'error', error: message });
    }
  }, [pendingActivation, gridType, dispatch]);

  return {
    pendingActivation,
    lastReasoning,
    error,
    planNext,
    executeNext,
  };
}
