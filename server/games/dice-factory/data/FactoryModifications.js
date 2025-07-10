// 1001 Game Nights - Factory Modifications (Permanent cards, 9 pips)
// Version: 2.1.0 - Implemented full deck with bidding/auction system
// Updated: December 2024

const { PIP_COSTS } = require('./GameConstants');

// Complete Factory Modifications deck with actual cards
const FACTORY_MODIFICATIONS = [
  {
    id: 'dice_pool_size',
    name: 'Dice Pool Size',
    description: 'Increase your die pool by 1',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: true,
    count: 5 // Number of copies in deck
  },
  {
    id: 'outsourcing',
    name: 'Outsourcing',
    description: 'You may recruit 1 die regardless of the roll on it. It recruits a die of the same size.',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 5
  },
  {
    id: 'synergy',
    name: 'Synergy',
    description: 'Whenever a trick is made, it counts as having 1 additional die in it.',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 4
  },
  {
    id: 'cash_flow_enhancement',
    name: 'Cash Flow Enhancement',
    description: 'The first processed die gives 3X the free pips',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 4
  },
  {
    id: 'quality_control',
    name: 'Quality Control',
    description: 'You may reroll one die for free each turn',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 3
  },
  {
    id: 'dice_pool_upgrade',
    name: 'Dice Pool Upgrade',
    description: 'Your dice pool provides d6s',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 3
  },
  {
    id: 'variable_dice_pool',
    name: 'Variable Dice Pool',
    description: 'You may spend 10 free pips to increase your dice pool',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 3
  },
  {
    id: 'patent_protection',
    name: 'Patent Protection',
    description: 'When you score a trick, you keep the highest die from the score',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 2
  },
  {
    id: 'market_manipulation',
    name: 'Market Manipulation',
    description: 'Effects and Modifications cost 4 pips less',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 2
  },
  {
    id: 'dividend',
    name: 'Dividend',
    description: 'Instead of getting free pips with a die at the end of turn, you may instead get that many points.',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 2
  },
  {
    id: 'arbitrage',
    name: 'Arbitrage',
    description: 'You may process a die for 2X the victory points (instead of free pips)',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 2
  },
  {
    id: 'dice_tower',
    name: 'Dice Tower',
    description: 'At the beginning of your turn, you may reroll all of your dice',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 2
  },
  {
    id: 'improved_rollers',
    name: 'Improved Rollers',
    description: 'Rerolls cost 1 free pip',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'roller_derby',
    name: 'Roller Derby',
    description: 'Every turn, you may recruit a d4 for free, if you do so, everyone including you recruits a d4',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'global',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'diversification',
    name: 'Diversification',
    description: 'You can recruit a d4 off a 2 rolled on a d4',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'due_diligence',
    name: 'Due Diligence',
    description: 'Increasing die value costs 3 free pips',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'joint_venture',
    name: 'Joint Venture',
    description: 'When constructing a set, you may use 2 die values instead of just 1',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'vertical_integration',
    name: 'Vertical Integration',
    description: 'When constructing a straight, you may skip a number',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'corporate_debt',
    name: 'Corporate Debt',
    description: 'You may go negative values of free pips (to -20). They lose points every round equal to their debt. This modification can be sold for 8 free pips, but only if you have no debt.',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  },
  {
    id: 'tworus',
    name: '2rUS',
    description: 'Reroll all 2s automatically',
    cost: PIP_COSTS.FACTORY_MODIFICATION,
    type: 'modification',
    category: 'player',
    persistent: true,
    stackable: false,
    count: 1
  }
];

/**
 * Create a shuffled deck with proper card counts
 * @returns {Array} - Shuffled deck of modification IDs
 */
function createModificationDeck() {
  const deck = [];
  
  // Add each card the specified number of times
  FACTORY_MODIFICATIONS.forEach(mod => {
    for (let i = 0; i < mod.count; i++) {
      deck.push(mod.id);
    }
  });
  
  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  
  return deck;
}

/**
 * Draw cards from deck
 * @param {Array} deck - Current deck state
 * @param {number} count - Number of cards to draw
 * @returns {Object} - {drawnCards: Array, remainingDeck: Array}
 */
function drawFromDeck(deck, count = 3) {
  if (deck.length === 0) {
    return { drawnCards: [], remainingDeck: [] };
  }
  
  const drawnCards = deck.slice(0, count);
  const remainingDeck = deck.slice(count);
  
  return { drawnCards, remainingDeck };
}

/**
 * Get a random selection of factory modifications for the game (legacy function)
 * @param {number} count - Number of modifications to select
 * @returns {Array} - Array of selected modifications
 */
function getRandomModifications(count = 3) {
  // Legacy function - now just returns first 3 unique modifications for compatibility
  const uniqueModifications = FACTORY_MODIFICATIONS.slice(0, count);
  return uniqueModifications;
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
  
  // Calculate actual cost (consider Market Manipulation)
  let actualCost = modification.cost;
  if (player.modifications?.includes('market_manipulation')) {
    actualCost = Math.max(0, actualCost - 4);
  }
  
  if (player.freePips < actualCost) {
    return { canPurchase: false, reason: 'Not enough pips' };
  }
  
  // Check if player already has this modification and it's not stackable
  if (!modification.stackable && player.modifications?.includes(modId)) {
    return { canPurchase: false, reason: 'Modification already owned and not stackable' };
  }
  
  return { canPurchase: true, reason: '' };
}

/**
 * Apply modification effects to player or game state
 * @param {Object} gameState - Current game state
 * @param {string} playerId - Player applying the modification
 * @param {string} modId - Modification to apply
 * @returns {Object} - {success: boolean, message: string, newState?: Object}
 */
function applyModification(gameState, playerId, modId) {
  const modification = getModificationById(modId);
  const player = gameState.players.find(p => p.id === playerId);
  
  if (!modification || !player) {
    return { success: false, message: 'Modification or player not found' };
  }
  
  // Apply immediate effects based on modification type
  switch (modId) {
    case 'dice_pool_size':
      player.diceFloor += 1;
      break;
      
    case 'dice_pool_upgrade':
      // Change minimum dice type from d4 to d6
      player.minimumDieSize = 6;
      
      // Upgrade all existing d4s to d6s
      const DiceHelpers = require('../utils/DiceHelpers');
      let upgradedCount = 0;
      for (let i = 0; i < player.dicePool.length; i++) {
        if (player.dicePool[i].sides === 4) {
          // Create a new d6 with the same value
          const newDie = DiceHelpers.createDie(6, player.dicePool[i].value);
          player.dicePool[i] = newDie;
          upgradedCount++;
        }
      }
      
      // Log the upgrade
      if (upgradedCount > 0) {
        const logAction = require('../utils/GameLogger').logAction;
        gameState.gameLog = logAction(
          gameState.gameLog,
          player.name,
          `upgraded ${upgradedCount} d4s to d6s with Dice Pool Upgrade`,
          gameState.round
        );
      }
      break;
      
    // Most modifications are passive and don't need immediate application
    // Their effects are checked during relevant game actions
    
    default:
      // Passive modification - no immediate effect
      break;
  }
  
  return { 
    success: true, 
    message: `Applied modification: ${modification.name}`,
    newState: gameState
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

/**
 * Calculate actual cost for a modification (considering Market Manipulation)
 * @param {Object} player - Player object
 * @param {string} modId - Modification ID
 * @returns {number} - Actual cost in pips
 */
function getActualModificationCost(player, modId) {
  const modification = getModificationById(modId);
  if (!modification) return 0;
  
  let cost = modification.cost;
  
  // Apply Market Manipulation discount
  if (playerHasModification(player, 'market_manipulation')) {
    cost = Math.max(0, cost - 4);
  }
  
  return cost;
}

module.exports = {
  FACTORY_MODIFICATIONS,
  createModificationDeck,
  drawFromDeck,
  getRandomModifications,
  getModificationById,
  getModificationsByCategory,
  canPurchaseModification,
  applyModification,
  getPlayerModifications,
  playerHasModification,
  getActualModificationCost
};