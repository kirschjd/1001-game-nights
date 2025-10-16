// HenHur Card Effect Executor
// Handles execution of card effects in the game

import { CardEffect } from '../types/card.types';

export interface GameState {
  playerPositions: Record<string, number>;
  tokenPools: Record<string, Record<string, number>>;
  playerMats: Record<string, any>;
  currentPlayerId: string;
}

export interface EffectContext {
  playerId: string;
  targetPlayerId?: string;
  gameState: GameState;
}

export interface EffectResult {
  success: boolean;
  message?: string;
  stateChanges: Partial<GameState>;
  requiresInput?: {
    type: 'choose_opponent' | 'choose_token' | 'choose_position';
    options?: any[];
  };
}

/**
 * Execute a single card effect
 */
export function executeEffect(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  switch (effect.type) {
    case 'move_player_position':
      return executeMovePlayerPosition(effect, context);

    case 'move_opponent_position':
      return executeMoveOpponentPosition(effect, context);

    case 'affect_token_pool':
      return executeAffectTokenPool(effect, context);

    case 'affect_player_mat':
      return executeAffectPlayerMat(effect, context);

    case 'draw_cards':
      return executeDrawCards(effect, context);

    case 'discard_cards':
      return executeDiscardCards(effect, context);

    case 'modify_priority':
      return executeModifyPriority(effect, context);

    case 'block_action':
      return executeBlockAction(effect, context);

    case 'gain_resource':
      return executeGainResource(effect, context);

    default:
      return {
        success: false,
        message: `Unknown effect type: ${effect.type}`,
        stateChanges: {}
      };
  }
}

/**
 * Execute multiple effects in sequence
 */
export function executeEffects(
  effects: CardEffect[],
  context: EffectContext
): EffectResult[] {
  const results: EffectResult[] = [];
  let currentContext = { ...context };

  for (const effect of effects) {
    const result = executeEffect(effect, currentContext);
    results.push(result);

    // Update context with state changes for subsequent effects
    if (result.success) {
      currentContext = {
        ...currentContext,
        gameState: {
          ...currentContext.gameState,
          ...result.stateChanges
        }
      };
    }
  }

  return results;
}

// Individual effect executors

function executeMovePlayerPosition(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { distance } = effect.params;
  const currentPosition = context.gameState.playerPositions[context.playerId] || 0;
  const newPosition = Math.max(0, currentPosition + distance);

  return {
    success: true,
    message: `Moved ${distance > 0 ? 'forward' : 'backward'} ${Math.abs(distance)} space(s)`,
    stateChanges: {
      playerPositions: {
        ...context.gameState.playerPositions,
        [context.playerId]: newPosition
      }
    }
  };
}

function executeMoveOpponentPosition(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { distance, targetSelection } = effect.params;

  // If target selection is required and not provided
  if (targetSelection === 'choose' && !context.targetPlayerId) {
    return {
      success: false,
      message: 'Target player required',
      stateChanges: {},
      requiresInput: {
        type: 'choose_opponent'
      }
    };
  }

  const targetId = context.targetPlayerId || effect.params.targetPlayerId;
  if (!targetId) {
    return {
      success: false,
      message: 'No target player specified',
      stateChanges: {}
    };
  }

  const currentPosition = context.gameState.playerPositions[targetId] || 0;
  const newPosition = Math.max(0, currentPosition + distance);

  return {
    success: true,
    message: `Opponent moved ${distance > 0 ? 'forward' : 'backward'} ${Math.abs(distance)} space(s)`,
    stateChanges: {
      playerPositions: {
        ...context.gameState.playerPositions,
        [targetId]: newPosition
      }
    }
  };
}

function executeAffectTokenPool(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { action, tokenType, count } = effect.params;
  const playerPool = context.gameState.tokenPools[context.playerId] || {};
  const currentCount = playerPool[tokenType] || 0;

  let newCount: number;
  if (action === 'gain') {
    newCount = currentCount + count;
  } else if (action === 'spend') {
    newCount = Math.max(0, currentCount - count);
  } else if (action === 'set') {
    newCount = count;
  } else {
    return {
      success: false,
      message: `Unknown token action: ${action}`,
      stateChanges: {}
    };
  }

  return {
    success: true,
    message: `${action === 'gain' ? 'Gained' : action === 'spend' ? 'Spent' : 'Set'} ${count} ${tokenType} token(s)`,
    stateChanges: {
      tokenPools: {
        ...context.gameState.tokenPools,
        [context.playerId]: {
          ...playerPool,
          [tokenType]: newCount
        }
      }
    }
  };
}

function executeAffectPlayerMat(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { property, value, operation } = effect.params;
  const playerMat = context.gameState.playerMats[context.playerId] || {};

  let newValue: any;
  if (operation === 'set') {
    newValue = value;
  } else if (operation === 'add') {
    newValue = (playerMat[property] || 0) + value;
  } else if (operation === 'multiply') {
    newValue = (playerMat[property] || 1) * value;
  } else {
    return {
      success: false,
      message: `Unknown mat operation: ${operation}`,
      stateChanges: {}
    };
  }

  return {
    success: true,
    message: `Updated player mat: ${property}`,
    stateChanges: {
      playerMats: {
        ...context.gameState.playerMats,
        [context.playerId]: {
          ...playerMat,
          [property]: newValue
        }
      }
    }
  };
}

function executeDrawCards(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { count } = effect.params;

  // Note: Actual card drawing is handled by cardUtils
  // This just returns the intent
  return {
    success: true,
    message: `Draw ${count} card(s)`,
    stateChanges: {}
  };
}

function executeDiscardCards(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { count } = effect.params;

  // Note: Actual discarding is handled by cardUtils
  return {
    success: true,
    message: `Discard ${count} card(s)`,
    stateChanges: {}
  };
}

function executeModifyPriority(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { adjustment } = effect.params;

  // Priority modifications would be tracked in player mat or separate state
  return {
    success: true,
    message: `Priority ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
    stateChanges: {}
  };
}

function executeBlockAction(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { actionType, duration } = effect.params;

  return {
    success: true,
    message: `Blocked ${actionType} for ${duration || 1} turn(s)`,
    stateChanges: {}
  };
}

function executeGainResource(
  effect: CardEffect,
  context: EffectContext
): EffectResult {
  const { resourceType, amount } = effect.params;

  return {
    success: true,
    message: `Gained ${amount} ${resourceType}`,
    stateChanges: {}
  };
}
