// 1001 Game Nights - Factory System
// Version: 2.0.0 - Handles factory effects and modifications
// Updated: December 2024

const { 
  getRandomEffects, 
  canPurchaseEffect, 
  applyEffect 
} = require('../data/FactoryEffects');
const { 
  getRandomModifications, 
  canPurchaseModification, 
  applyModification,
  getPlayerModifications 
} = require('../data/FactoryModifications');
const { logFactoryPurchase, logAction } = require('../utils/GameLogger');

class FactorySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Initialize factory effects and modifications for the game
   * @param {number} effectCount - Number of effects to make available
   * @param {number} modificationCount - Number of modifications to make available
   */
  initializeFactory(effectCount = 3, modificationCount = 3) {
    // Get random effects and modifications for this game
    this.gameState.availableEffects = getRandomEffects(effectCount);
    this.gameState.availableModifications = getRandomModifications(modificationCount);
    
    // Ensure arrays are initialized even if empty
    if (!this.gameState.availableEffects) this.gameState.availableEffects = [];
    if (!this.gameState.availableModifications) this.gameState.availableModifications = [];
    
    // Initialize player factory data
    for (const player of this.gameState.players) {
      if (!player.effects) player.effects = [];
      if (!player.modifications) player.modifications = [];
      if (!player.factoryHand) player.factoryHand = []; // Effects in hand (purchased but not played)
    }
  }

  /**
   * Purchase a factory effect (7 pips)
   * @param {string} playerId - Player ID
   * @param {string} effectId - Effect ID to purchase
   * @returns {Object} - {success: boolean, message: string}
   */
  purchaseEffect(playerId, effectId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Check if effect is available in this game
    const effect = this.gameState.availableEffects?.find(e => e.id === effectId);
    if (!effect) {
      return { success: false, message: 'Effect not available in this game' };
    }

    // Validate purchase
    const canPurchase = canPurchaseEffect(player, effectId);
    if (!canPurchase.canPurchase) {
      return { success: false, message: canPurchase.reason };
    }

    // Deduct pips and add to player's hand
    player.freePips -= effect.cost;
    player.factoryHand.push(effectId);

    // Log purchase
    this.gameState.gameLog = logFactoryPurchase(
      this.gameState.gameLog,
      player.name,
      'effect',
      effect.name,
      effect.cost,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Purchased effect: ${effect.name}` 
    };
  }

  /**
   * Purchase a factory modification (9 pips)
   * @param {string} playerId - Player ID
   * @param {string} modificationId - Modification ID to purchase
   * @returns {Object} - {success: boolean, message: string}
   */
  purchaseModification(playerId, modificationId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Check if modification is available in this game
    const modification = this.gameState.availableModifications?.find(m => m.id === modificationId);
    if (!modification) {
      return { success: false, message: 'Modification not available in this game' };
    }

    // Validate purchase
    const canPurchase = canPurchaseModification(player, modificationId);
    if (!canPurchase.canPurchase) {
      return { success: false, message: canPurchase.reason };
    }

    // Deduct pips and add to player's modifications
    player.freePips -= modification.cost;
    player.modifications.push(modificationId);

    // Apply modification immediately (modifications are persistent)
    const applyResult = this.applyModification(playerId, modificationId);

    // Log purchase
    this.gameState.gameLog = logFactoryPurchase(
      this.gameState.gameLog,
      player.name,
      'modification',
      modification.name,
      modification.cost,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Purchased modification: ${modification.name}` 
    };
  }

  /**
   * Play an effect card from hand
   * @param {string} playerId - Player ID
   * @param {string} effectId - Effect ID to play
   * @returns {Object} - {success: boolean, message: string}
   */
  playEffect(playerId, effectId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Check if player has this effect in hand
    const handIndex = player.factoryHand.indexOf(effectId);
    if (handIndex === -1) {
      return { success: false, message: 'Effect not in hand' };
    }

    // Apply the effect
    const applyResult = this.applyEffect(playerId, effectId);
    if (!applyResult.success) {
      return applyResult;
    }

    // Remove from hand and add to played effects
    player.factoryHand.splice(handIndex, 1);
    player.effects.push(effectId);

    const effect = this.gameState.availableEffects?.find(e => e.id === effectId);
    
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `played effect: ${effect?.name || effectId}`,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Played effect: ${effect?.name || effectId}` 
    };
  }

  /**
   * Apply an effect to the game state
   * @param {string} playerId - Player ID
   * @param {string} effectId - Effect ID to apply
   * @returns {Object} - {success: boolean, message: string}
   */
  applyEffect(playerId, effectId) {
    // This is a placeholder for the actual effect application
    // The real implementation will depend on the specific effects designed
    
    const result = applyEffect(this.gameState, playerId, effectId);
    
    if (result.newState) {
      // Update game state with any changes from the effect
      Object.assign(this.gameState, result.newState);
    }
    
    return result;
  }

  /**
   * Apply a modification to the game state
   * @param {string} playerId - Player ID
   * @param {string} modificationId - Modification ID to apply
   * @returns {Object} - {success: boolean, message: string}
   */
  applyModification(playerId, modificationId) {
    // This is a placeholder for the actual modification application
    // The real implementation will depend on the specific modifications designed
    
    const result = applyModification(this.gameState, playerId, modificationId);
    
    if (result.newState) {
      // Update game state with any changes from the modification
      Object.assign(this.gameState, result.newState);
    }
    
    return result;
  }

  /**
   * Get all active effects and modifications for a player
   * @param {string} playerId - Player ID
   * @returns {Object} - {effects: Array, modifications: Array, hand: Array}
   */
  getPlayerFactoryItems(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { effects: [], modifications: [], hand: [] };
    }

    return {
      effects: player.effects || [],
      modifications: getPlayerModifications(player),
      hand: player.factoryHand || []
    };
  }

  /**
   * Check if a player has a specific effect or modification
   * @param {string} playerId - Player ID
   * @param {string} itemId - Effect or modification ID
   * @returns {Object} - {hasEffect: boolean, hasModification: boolean, inHand: boolean}
   */
  playerHasFactoryItem(playerId, itemId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { hasEffect: false, hasModification: false, inHand: false };
    }

    return {
      hasEffect: player.effects?.includes(itemId) || false,
      hasModification: player.modifications?.includes(itemId) || false,
      inHand: player.factoryHand?.includes(itemId) || false
    };
  }

  /**
   * Get available factory items for purchase
   * @returns {Object} - {effects: Array, modifications: Array}
   */
  getAvailableFactoryItems() {
    return {
      effects: this.gameState.availableEffects || [],
      modifications: this.gameState.availableModifications || []
    };
  }

  /**
   * Process factory effects that trigger at specific times
   * @param {string} trigger - When the effect triggers ('turn_start', 'turn_end', 'scoring', etc.)
   * @param {string} playerId - Player ID (optional, for player-specific triggers)
   * @returns {Array} - Array of triggered effects
   */
  processTriggers(trigger, playerId = null) {
    const triggeredEffects = [];

    // Process global effects first
    for (const player of this.gameState.players) {
      for (const effectId of player.effects || []) {
        const effect = this.gameState.availableEffects?.find(e => e.id === effectId);
        if (effect && effect.trigger === trigger) {
          const result = this.applyEffect(player.id, effectId);
          if (result.success) {
            triggeredEffects.push({
              playerId: player.id,
              effectId,
              result
            });
          }
        }
      }
    }

    // Process modifications that might trigger
    for (const player of this.gameState.players) {
      for (const modId of player.modifications || []) {
        const modification = this.gameState.availableModifications?.find(m => m.id === modId);
        if (modification && modification.trigger === trigger) {
          const result = this.applyModification(player.id, modId);
          if (result.success) {
            triggeredEffects.push({
              playerId: player.id,
              modificationId: modId,
              result
            });
          }
        }
      }
    }

    return triggeredEffects;
  }

  /**
   * Reset factory items for new game
   */
  resetFactory() {
    this.gameState.availableEffects = [];
    this.gameState.availableModifications = [];
    
    for (const player of this.gameState.players) {
      player.effects = [];
      player.modifications = [];
      player.factoryHand = [];
    }
  }

  /**
   * Get factory statistics
   * @returns {Object} - Factory usage statistics
   */
  getFactoryStats() {
    const stats = {
      totalEffectsPurchased: 0,
      totalModificationsPurchased: 0,
      totalPipsCost: 0,
      playerStats: {}
    };

    for (const player of this.gameState.players) {
      const playerEffects = player.effects?.length || 0;
      const playerMods = player.modifications?.length || 0;
      const playerHand = player.factoryHand?.length || 0;

      stats.totalEffectsPurchased += playerEffects + playerHand;
      stats.totalModificationsPurchased += playerMods;

      stats.playerStats[player.id] = {
        effects: playerEffects,
        modifications: playerMods,
        inHand: playerHand,
        total: playerEffects + playerMods + playerHand
      };
    }

    return stats;
  }
}

module.exports = FactorySystem;