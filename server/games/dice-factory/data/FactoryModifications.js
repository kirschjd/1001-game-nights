// 1001 Game Nights - Factory Modifications (Permanent cards, 9 pips)
// Version: 2.0.0 - Modular refactor with flexible structure
// Updated: December 2024

const { PIP_COSTS } = require('./GameConstants');

// Factory Modifications are permanent changes that cost 9 pips
// They go to player's factory area and effects persist immediately

// Placeholder structure - will be replaced with actual modifications
const FACTORY_MODIFICATIONS = [
  {
    id: 'mod_001',
    name: 'Placeholder Modification 1',
    description: 'This is a placeholder modification',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player', // 'player' or 'global' 
    persistent: true, // Modifications are always persistent
    stackable: false, // Can this modification be purchased multiple times?
    data: {
      // Custom data for this modification
    }
  },
  {
    id: 'mod_002',
    name: 'Placeholder Modification 2', 
    description: 'This is another placeholder modification',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'global',
    persistent: true,
    stackable: true,
    data: {
      // Custom data for this modification
    }
  }
  // More modifications will be added here
];

/**
 * Get a random selection of factory modifications for the game
 * @param {number} count - Number of modifications to select
 * @returns {Array} - Array of selected modifications
 */
function getRandomModifications(count = 3) {
  if (FACTORY_MODIFICATIONS.length === 0) {
    return []; // Return empty array if no modifications defined
  }
  
  const shuffled = [...FACTORY_MODIFICATIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, FACTORY_MODIFICATIONS.length));
}

/**
 * Get modification by ID
 * @param {string} modId - The modification ID to find
 * @returns {Object|null} - The modification object or null if not found
 */
function getModificationById(modId) {
  return FACTORY_MODIFICATIONS.find(mod => mod.id === modId) || null;
}

/**
 * Get all modifications of a specific category
 * @param {string} category - 'player' or 'global'
 * @returns {Array} - Array of modifications in that category
 */
function getModificationsByCategory(category) {
  return FACTORY_MODIFICATIONS.filter(mod => mod.category === category);
}

/**
 * Validate if player can purchase modification
 * @param {Object} player - Player object
 * @param {string} modId - Modification ID to purchase
 * @returns {Object} - {canPurchase: boolean, reason: string}
 */
function canPurchaseModification(player, modId) {
  const modification = getModificationById(modId);
  
  if (!modification) {
    return { canPurchase: false, reason: 'Modification not found' };
  }
  
  if (player.freePips < modification.cost) {
    return { canPurchase: false, reason: 'Not enough pips' };
  }
  
  // Check if player already has this modification and it's not stackable
  if (!modification.stackable && player.modifications?.includes(modId)) {
    return { canPurchase: false, reason: 'Modification already owned and not stackable' };
  }
  
  return { canPurchase: true, reason: '' };
}

/**
 * Apply modification to player or game state
 * This is a placeholder - actual implementation will depend on modification type
 * @param {Object} gameState - Current game state
 * @param {string} playerId - Player applying the modification
 * @param {string} modId - Modification to apply
 * @returns {Object} - {success: boolean, message: string, newState?: Object}
 */
function applyModification(gameState, playerId, modId) {
  const modification = getModificationById(modId);
  
  if (!modification) {
    return { success: false, message: 'Modification not found' };
  }
  
  // Placeholder implementation
  // Actual modification logic will be implemented based on specific modifications
  
  return { 
    success: true, 
    message: `Applied modification: ${modification.name}`,
    newState: gameState // Modified state would be returned here
  };
}

/**
 * Get all active modifications for a player
 * @param {Object} player - Player object
 * @returns {Array} - Array of active modification objects
 */
function getPlayerModifications(player) {
  if (!player.modifications) return [];
  
  return player.modifications.map(modId => getModificationById(modId)).filter(Boolean);
}

/**
 * Check if a player has a specific modification
 * @param {Object} player - Player object
 * @param {string} modId - Modification ID to check
 * @returns {boolean} - True if player has the modification
 */
function playerHasModification(player, modId) {
  return player.modifications?.includes(modId) || false;
}

module.exports = {
  FACTORY_MODIFICATIONS,
  getRandomModifications,
  getModificationById,
  getModificationsByCategory,
  canPurchaseModification,
  applyModification,
  getPlayerModifications,
  playerHasModification
};