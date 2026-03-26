// 1001 Game Nights - Factory Effects (One-time cards, 7 pips)
// Version: 2.0.0 - Modular refactor with flexible structure
// Updated: December 2024

const { PIP_COSTS } = require('./GameConstants');

// Factory Effects are one-time use cards that cost 7 pips
// They go to player's hand and can be played on a later turn

// Placeholder structure - will be replaced with actual effects
const FACTORY_EFFECTS = [
  {
    id: 'effect_001',
    name: 'Placeholder Effect 1',
    description: 'This is a placeholder effect',
    cost: PIP_COSTS.FACTORY_EFFECT,
    type: 'effect',
    category: 'player', // 'player' or 'global'
    trigger: 'manual', // 'manual', 'automatic', 'condition'
    data: {
      // Custom data for this effect
    }
  },
  {
    id: 'effect_002', 
    name: 'Placeholder Effect 2',
    description: 'This is another placeholder effect',
    cost: PIP_COSTS.FACTORY_EFFECT,
    type: 'effect',
    category: 'global',
    trigger: 'automatic',
    data: {
      // Custom data for this effect
    }
  }
  // More effects will be added here
];

/**
 * Get a random selection of factory effects for the game
 * @param {number} count - Number of effects to select
 * @returns {Array} - Array of selected effects
 */
function getRandomEffects(count = 3) {
  if (FACTORY_EFFECTS.length === 0) {
    return []; // Return empty array if no effects defined
  }
  
  const shuffled = [...FACTORY_EFFECTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, FACTORY_EFFECTS.length));
}

/**
 * Get effect by ID
 * @param {string} effectId - The effect ID to find
 * @returns {Object|null} - The effect object or null if not found
 */
function getEffectById(effectId) {
  return FACTORY_EFFECTS.find(effect => effect.id === effectId) || null;
}

/**
 * Get all effects of a specific category
 * @param {string} category - 'player' or 'global'
 * @returns {Array} - Array of effects in that category
 */
function getEffectsByCategory(category) {
  return FACTORY_EFFECTS.filter(effect => effect.category === category);
}

/**
 * Validate if player can purchase effect
 * @param {Object} player - Player object
 * @param {string} effectId - Effect ID to purchase
 * @returns {Object} - {canPurchase: boolean, reason: string}
 */
function canPurchaseEffect(player, effectId) {
  const effect = getEffectById(effectId);
  
  if (!effect) {
    return { canPurchase: false, reason: 'Effect not found' };
  }
  
  if (player.freePips < effect.cost) {
    return { canPurchase: false, reason: 'Not enough pips' };
  }
  
  // Additional validation can be added here
  
  return { canPurchase: true, reason: '' };
}

/**
 * Apply effect to player or game state
 * This is a placeholder - actual implementation will depend on effect type
 * @param {Object} gameState - Current game state
 * @param {string} playerId - Player applying the effect
 * @param {string} effectId - Effect to apply
 * @returns {Object} - {success: boolean, message: string, newState?: Object}
 */
function applyEffect(gameState, playerId, effectId) {  
  const effect = getEffectById(effectId);
  
  if (!effect) {
    return { success: false, message: 'Effect not found' };
  }
  
  // Placeholder implementation
  // Actual effect logic will be implemented based on specific effects
  
  return { 
    success: true, 
    message: `Applied effect: ${effect.name}`,
    newState: gameState // Modified state would be returned here
  };
}

module.exports = {
  FACTORY_EFFECTS,
  getRandomEffects,
  getEffectById,
  getEffectsByCategory,
  canPurchaseEffect,
  applyEffect
};