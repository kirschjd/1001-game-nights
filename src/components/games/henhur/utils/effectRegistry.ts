// Effect Registry System
// Flexible, extensible system for card effects
// Add new effect types here without modifying core game logic

import { CardEffect } from '../types/card.types';

// ============================================================================
// EFFECT HANDLER TYPE
// ============================================================================

export interface EffectContext {
  playerId: string;
  targetPlayerId?: string;
  gameState: GameState;
  cardId?: string;
  isBurnEffect?: boolean;
}

export interface GameState {
  playerPositions: Record<string, { lane: number; space: number; lap: number }>;
  tokenPools: Record<string, Record<string, number>>;
  playerMats: Record<string, any>;
  currentPlayerId: string;
  playerDecks?: Record<string, any>;
  turnPhase?: string;
}

export interface EffectResult {
  success: boolean;
  message?: string;
  stateChanges: Partial<GameState>;
  requiresInput?: {
    type: 'choose_opponent' | 'choose_token' | 'choose_position' | 'choose_card';
    options?: any[];
    context?: any;
  };
  sideEffects?: {
    drawCards?: number;
    discardCards?: number;
    burnCards?: string[];
    animateMovement?: { playerId: string; from: any; to: any };
    showNotification?: string;
  };
}

export type EffectHandler = (
  effect: CardEffect,
  context: EffectContext
) => EffectResult | Promise<EffectResult>;

// ============================================================================
// EFFECT REGISTRY
// ============================================================================

const EFFECT_HANDLERS = new Map<string, EffectHandler>();

/**
 * Register a new effect handler
 */
export function registerEffect(type: string, handler: EffectHandler): void {
  EFFECT_HANDLERS.set(type, handler);
  console.log(`✅ Registered effect handler: ${type}`);
}

/**
 * Get an effect handler
 */
export function getEffectHandler(type: string): EffectHandler | undefined {
  return EFFECT_HANDLERS.get(type);
}

/**
 * Check if an effect type is registered
 */
export function hasEffectHandler(type: string): boolean {
  return EFFECT_HANDLERS.has(type);
}

/**
 * Get all registered effect types
 */
export function getRegisteredEffectTypes(): string[] {
  return Array.from(EFFECT_HANDLERS.keys());
}

/**
 * Execute a single effect
 */
export async function executeEffect(
  effect: CardEffect,
  context: EffectContext
): Promise<EffectResult> {
  const handler = EFFECT_HANDLERS.get(effect.type);

  if (!handler) {
    console.error(`Unknown effect type: ${effect.type}`);
    return {
      success: false,
      message: `Unknown effect type: ${effect.type}`,
      stateChanges: {}
    };
  }

  try {
    const result = await handler(effect, context);
    return result;
  } catch (error) {
    console.error(`Error executing effect ${effect.type}:`, error);
    return {
      success: false,
      message: `Error executing effect: ${error}`,
      stateChanges: {}
    };
  }
}

/**
 * Execute multiple effects in sequence
 */
export async function executeEffects(
  effects: CardEffect[],
  context: EffectContext
): Promise<EffectResult[]> {
  const results: EffectResult[] = [];
  let currentContext = { ...context };

  for (const effect of effects) {
    const result = await executeEffect(effect, currentContext);
    results.push(result);

    // Update context with state changes for subsequent effects
    if (result.success && result.stateChanges) {
      currentContext = {
        ...currentContext,
        gameState: {
          ...currentContext.gameState,
          ...result.stateChanges
        }
      };
    }

    // If effect requires input, stop execution chain
    if (result.requiresInput) {
      break;
    }
  }

  return results;
}

// ============================================================================
// CORE EFFECT HANDLERS
// ============================================================================

/**
 * Move the current player's position
 */
registerEffect('move_player_position', (effect, context): EffectResult => {
  const { distance } = effect.params;
  const currentPos = context.gameState.playerPositions[context.playerId];

  if (!currentPos) {
    return {
      success: false,
      message: 'Player position not found',
      stateChanges: {}
    };
  }

  const newSpace = Math.max(0, currentPos.space + distance);

  // Check if crossed finish line (assuming track is ~30 spaces)
  let newLap = currentPos.lap;
  let finalSpace = newSpace;

  const TRACK_LENGTH = 30; // TODO: Make this configurable
  if (newSpace >= TRACK_LENGTH) {
    newLap += 1;
    finalSpace = newSpace - TRACK_LENGTH;
  }

  return {
    success: true,
    message: `Moved ${distance > 0 ? 'forward' : 'backward'} ${Math.abs(distance)} space(s)`,
    stateChanges: {
      playerPositions: {
        ...context.gameState.playerPositions,
        [context.playerId]: {
          ...currentPos,
          space: finalSpace,
          lap: newLap
        }
      }
    },
    sideEffects: {
      animateMovement: {
        playerId: context.playerId,
        from: currentPos,
        to: { ...currentPos, space: finalSpace, lap: newLap }
      }
    }
  };
});

/**
 * Move an opponent's position
 */
registerEffect('move_opponent_position', (effect, context): EffectResult => {
  const { distance, targetSelection } = effect.params;

  // If target selection is required and not provided
  if (targetSelection === 'choose' && !context.targetPlayerId) {
    return {
      success: false,
      message: 'Target player required',
      stateChanges: {},
      requiresInput: {
        type: 'choose_opponent',
        context: { distance }
      }
    };
  }

  const targetId = context.targetPlayerId;
  if (!targetId) {
    return {
      success: false,
      message: 'No target player specified',
      stateChanges: {}
    };
  }

  const currentPos = context.gameState.playerPositions[targetId];
  if (!currentPos) {
    return {
      success: false,
      message: 'Target player position not found',
      stateChanges: {}
    };
  }

  const newSpace = Math.max(0, currentPos.space + distance);

  return {
    success: true,
    message: `Opponent moved ${distance > 0 ? 'forward' : 'backward'} ${Math.abs(distance)} space(s)`,
    stateChanges: {
      playerPositions: {
        ...context.gameState.playerPositions,
        [targetId]: {
          ...currentPos,
          space: newSpace
        }
      }
    }
  };
});

/**
 * Affect token pool (gain, spend, set tokens)
 */
registerEffect('affect_token_pool', (effect, context): EffectResult => {
  const { action, tokenType, count } = effect.params;
  const playerPool = context.gameState.tokenPools[context.playerId] || {};
  const currentCount = playerPool[tokenType] || 0;

  let newCount: number;
  let actionVerb: string;

  switch (action) {
    case 'gain':
      newCount = currentCount + count;
      actionVerb = 'Gained';
      break;
    case 'spend':
      newCount = Math.max(0, currentCount - count);
      actionVerb = 'Spent';
      break;
    case 'set':
      newCount = count;
      actionVerb = 'Set';
      break;
    default:
      return {
        success: false,
        message: `Unknown token action: ${action}`,
        stateChanges: {}
      };
  }

  return {
    success: true,
    message: `${actionVerb} ${count} ${tokenType} token(s)`,
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
});

/**
 * Draw cards
 */
registerEffect('draw_cards', (effect, context): EffectResult => {
  const { count } = effect.params;

  return {
    success: true,
    message: `Draw ${count} card(s)`,
    stateChanges: {},
    sideEffects: {
      drawCards: count
    }
  };
});

/**
 * Discard cards
 */
registerEffect('discard_cards', (effect, context): EffectResult => {
  const { count } = effect.params;

  return {
    success: true,
    message: `Discard ${count} card(s)`,
    stateChanges: {},
    sideEffects: {
      discardCards: count
    }
  };
});

/**
 * Modify priority (for turn order)
 */
registerEffect('modify_priority', (effect, context): EffectResult => {
  const { adjustment } = effect.params;

  // Store priority modifications in player mat
  const playerMat = context.gameState.playerMats[context.playerId] || {};
  const currentPriorityMod = playerMat.priorityModifier || 0;

  return {
    success: true,
    message: `Priority ${adjustment > 0 ? 'increased' : 'decreased'} by ${Math.abs(adjustment)}`,
    stateChanges: {
      playerMats: {
        ...context.gameState.playerMats,
        [context.playerId]: {
          ...playerMat,
          priorityModifier: currentPriorityMod + adjustment
        }
      }
    }
  };
});

/**
 * Block an action
 */
registerEffect('block_action', (effect, context): EffectResult => {
  const { actionType, duration = 1 } = effect.params;

  const playerMat = context.gameState.playerMats[context.playerId] || {};
  const blockedActions = playerMat.blockedActions || [];

  return {
    success: true,
    message: `Blocked ${actionType} for ${duration} turn(s)`,
    stateChanges: {
      playerMats: {
        ...context.gameState.playerMats,
        [context.playerId]: {
          ...playerMat,
          blockedActions: [...blockedActions, { actionType, duration }]
        }
      }
    }
  };
});

/**
 * Gain resource (generic resource gain)
 */
registerEffect('gain_resource', (effect, context): EffectResult => {
  const { resourceType, amount } = effect.params;

  const playerMat = context.gameState.playerMats[context.playerId] || {};
  const resources = playerMat.resources || {};
  const currentAmount = resources[resourceType] || 0;

  return {
    success: true,
    message: `Gained ${amount} ${resourceType}`,
    stateChanges: {
      playerMats: {
        ...context.gameState.playerMats,
        [context.playerId]: {
          ...playerMat,
          resources: {
            ...resources,
            [resourceType]: currentAmount + amount
          }
        }
      }
    }
  };
});

/**
 * Affect player mat (generic mat modification)
 */
registerEffect('affect_player_mat', (effect, context): EffectResult => {
  const { property, value, operation = 'set' } = effect.params;

  const playerMat = context.gameState.playerMats[context.playerId] || {};
  let newValue: any;

  switch (operation) {
    case 'set':
      newValue = value;
      break;
    case 'add':
      newValue = (playerMat[property] || 0) + value;
      break;
    case 'multiply':
      newValue = (playerMat[property] || 1) * value;
      break;
    default:
      return {
        success: false,
        message: `Unknown operation: ${operation}`,
        stateChanges: {}
      };
  }

  return {
    success: true,
    message: `Updated ${property}`,
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
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all valid effect types (for validation)
 */
export const VALID_EFFECT_TYPES = new Set(getRegisteredEffectTypes());

/**
 * Debug: List all registered effects
 */
export function debugListEffects(): void {
  console.log('📋 Registered Effect Types:');
  getRegisteredEffectTypes().forEach(type => {
    console.log(`  - ${type}`);
  });
}