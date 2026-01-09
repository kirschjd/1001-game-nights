// HenHur Game Utilities
// Dice rolling, effect execution, and other game logic helpers

const config = require('./gameConfig');

// ============================================================================
// DICE ROLLING
// ============================================================================

/**
 * Roll dice based on priority format
 * @param {object|number} priority - Either a number or { base: number, dice: string }
 * @returns {number} The rolled priority value
 *
 * Examples:
 *   rollPriority(5) => 5
 *   rollPriority({ base: 2, dice: 'd8' }) => 2 + roll(1d8)
 *   rollPriority({ base: 1, dice: 'd6' }) => 1 + roll(1d6)
 */
function rollPriority(priority) {
  if (typeof priority === 'number') {
    return priority;
  }

  if (typeof priority === 'object' && priority.dice) {
    const base = priority.base || 0;
    const diceRoll = rollDice(priority.dice);
    return base + diceRoll;
  }

  // Fallback
  return 0;
}

/**
 * Roll dice from a dice notation string
 * @param {string} notation - Dice notation like 'd6', 'd8', '2d6', etc.
 * @returns {number} The sum of all dice rolled
 */
function rollDice(notation) {
  // Parse notation like 'd6', '2d8', '1d6'
  const match = notation.match(/^(\d*)d(\d+)$/);
  if (!match) {
    console.warn(`Invalid dice notation: ${notation}`);
    return 0;
  }

  const numDice = match[1] ? parseInt(match[1], 10) : 1;
  const dieSize = parseInt(match[2], 10);

  let total = 0;
  for (let i = 0; i < numDice; i++) {
    total += Math.floor(Math.random() * dieSize) + 1;
  }

  return total;
}

// ============================================================================
// EFFECT EXECUTION
// ============================================================================

/**
 * Execute card effects
 * @param {array} effects - Array of effect objects from card definition
 * @param {object} context - { player, gameState, isburn }
 * @returns {object} Result with any state changes
 */
function executeEffects(effects, context) {
  const results = [];

  for (const effect of effects) {
    const result = executeEffect(effect, context);
    results.push(result);

    // If an effect requires input (like choosing an opponent), stop here
    if (result.requiresInput) {
      break;
    }
  }

  return results;
}

/**
 * Execute a single effect
 * @param {object} effect - Effect object { type, params }
 * @param {object} context - { player, gameState, targetPlayerId }
 * @returns {object} Result of the effect
 */
function executeEffect(effect, context) {
  const { type, params } = effect;
  const { player, gameState } = context;

  switch (type) {
    case 'move_player_position':
      return executeMovePlayer(player, params, gameState);

    case 'move_opponent_position':
      return executeMoveOpponent(params, context);

    case 'affect_token_pool':
      return executeAffectTokens(player, params);

    case 'draw_cards':
      return executeDrawCards(player, params);

    case 'modify_priority':
      return executeModifyPriority(player, params);

    case 'affect_player_mat':
      // Generic mat modification (for special abilities)
      return executeAffectMat(player, params);

    default:
      console.warn(`Unknown effect type: ${type}`);
      return { success: false, message: `Unknown effect type: ${type}` };
  }
}

/**
 * Move the current player
 */
function executeMovePlayer(player, params, gameState) {
  const { distance } = params;
  const trackLength = gameState.track.trackLength;

  const oldSpace = player.position.space;
  const oldLap = player.position.lap;
  let newSpace = player.position.space + distance;
  let newLap = player.position.lap;

  // Handle lap completion
  while (newSpace >= trackLength) {
    newLap++;
    newSpace -= trackLength;
  }

  // Handle backward movement (can't go below 0 on lap 1)
  while (newSpace < 0) {
    if (newLap > 1) {
      newLap--;
      newSpace += trackLength;
    } else {
      newSpace = 0;
      break;
    }
  }

  player.position.space = newSpace;
  player.position.lap = newLap;
  player.distanceMoved += Math.abs(distance);

  return {
    success: true,
    message: `Moved ${distance} spaces (${oldLap}:${oldSpace} → ${newLap}:${newSpace})`
  };
}

/**
 * Move an opponent
 */
function executeMoveOpponent(params, context) {
  const { distance, targetSelection, requiresAdjacent } = params;
  const { gameState, targetPlayerId } = context;

  // If we need to choose a target and none provided, request input
  if (targetSelection === 'choose' && !targetPlayerId) {
    return {
      success: false,
      requiresInput: {
        type: 'choose_opponent',
        params: { distance, requiresAdjacent }
      },
      message: 'Must choose an opponent'
    };
  }

  const target = gameState.players.find(p => p.playerId === targetPlayerId);
  if (!target) {
    return { success: false, message: 'Target player not found' };
  }

  // Apply movement to target
  const oldSpace = target.position.space;
  target.position.space = Math.max(0, target.position.space + distance);

  return {
    success: true,
    message: `Moved opponent ${distance} spaces (${oldSpace} → ${target.position.space})`
  };
}

/**
 * Affect token pool (gain/spend/set tokens)
 */
function executeAffectTokens(player, params) {
  const { action, tokenType, count } = params;
  const maxTokens = config.tokens.maxPerPlayer;

  // Initialize token if doesn't exist
  if (player.tokens[tokenType] === undefined) {
    player.tokens[tokenType] = 0;
  }

  const oldCount = player.tokens[tokenType];
  let newCount = oldCount;

  switch (action) {
    case 'gain':
      // Calculate total tokens
      const totalTokens = Object.values(player.tokens).reduce((sum, val) => sum + val, 0);
      const canGain = Math.min(count, maxTokens - totalTokens);
      newCount = oldCount + canGain;
      break;

    case 'spend':
      newCount = Math.max(0, oldCount - count);
      break;

    case 'set':
      newCount = count;
      break;

    default:
      return { success: false, message: `Unknown token action: ${action}` };
  }

  player.tokens[tokenType] = newCount;

  return {
    success: true,
    message: `${action} ${count} ${tokenType} (${oldCount} → ${newCount})`
  };
}

/**
 * Draw cards
 */
function executeDrawCards(player, params) {
  const { count } = params;
  const { drawCards } = require('./cardUtils');

  const result = drawCards(player.deck, count);
  player.deck = result.updatedDeck;

  return {
    success: true,
    message: `Drew ${result.drawnCards.length} card(s)`
  };
}

/**
 * Modify priority for this turn
 */
function executeModifyPriority(player, params) {
  const { adjustment } = params;

  player.priorityModifier = (player.priorityModifier || 0) + adjustment;

  return {
    success: true,
    message: `Priority modifier: ${adjustment > 0 ? '+' : ''}${adjustment}`
  };
}

/**
 * Generic mat property modification
 */
function executeAffectMat(player, params) {
  const { property, value, operation } = params;

  // Store special properties in a generic object
  if (!player.matProperties) {
    player.matProperties = {};
  }

  switch (operation) {
    case 'set':
      player.matProperties[property] = value;
      break;
    case 'add':
      player.matProperties[property] = (player.matProperties[property] || 0) + value;
      break;
    default:
      player.matProperties[property] = value;
  }

  return {
    success: true,
    message: `Set ${property} to ${player.matProperties[property]}`
  };
}

// ============================================================================
// TOKEN BONUS CALCULATIONS
// ============================================================================

/**
 * Calculate priority bonus from tokens used
 */
function calculatePriorityBonus(tokensUsed) {
  let bonus = 0;
  const tokenConfig = config.tokens.types;

  tokensUsed.forEach(token => {
    const tokenDef = tokenConfig[token];
    if (tokenDef && (tokenDef.category === 'priority' || tokenDef.category === 'wild')) {
      bonus += tokenDef.value;
    }
  });

  return bonus;
}

/**
 * Calculate race movement bonus from tokens used
 */
function calculateRaceBonus(tokensUsed) {
  let bonus = 0;
  const tokenConfig = config.tokens.types;

  tokensUsed.forEach(token => {
    const tokenDef = tokenConfig[token];
    if (tokenDef && (tokenDef.category === 'race' || tokenDef.category === 'wild')) {
      bonus += tokenDef.value;
    }
  });

  return bonus;
}

/**
 * Calculate auction trick bonus from tokens used
 */
function calculateAuctionBonus(tokensUsed) {
  let bonus = 0;
  const tokenConfig = config.tokens.types;

  tokensUsed.forEach(token => {
    const tokenDef = tokenConfig[token];
    if (tokenDef && (tokenDef.category === 'auction' || tokenDef.category === 'wild')) {
      bonus += tokenDef.value;
    }
  });

  return bonus;
}

// ============================================================================
// AUCTION POOL GENERATION
// ============================================================================

/**
 * Generate auction pool based on current game state
 * @param {number} numCards - Number of cards to generate
 * @param {number} highestLap - Highest lap any player is on
 * @param {array} selectedCardIds - Card IDs available for this game (from lobby selection)
 * @returns {array} Array of cards for the auction pool
 */
function generateAuctionPool(numCards, highestLap, selectedCardIds) {
  const { LAP1_CARDS, LAP2_CARDS, LAP3_CARDS, BASE_CARDS } = require('./cardData');

  // Determine which decks are available
  const availableDecks = config.auction.getAvailableDecks(highestLap);

  // Collect eligible cards
  let eligibleCards = [];

  if (availableDecks.includes('base')) {
    eligibleCards = eligibleCards.concat(BASE_CARDS.filter(c =>
      selectedCardIds.includes(c.id)
    ));
  }
  if (availableDecks.includes('lap1')) {
    eligibleCards = eligibleCards.concat(LAP1_CARDS.filter(c =>
      selectedCardIds.includes(c.id)
    ));
  }
  if (availableDecks.includes('lap2')) {
    eligibleCards = eligibleCards.concat(LAP2_CARDS.filter(c =>
      selectedCardIds.includes(c.id)
    ));
  }
  if (availableDecks.includes('lap3')) {
    eligibleCards = eligibleCards.concat(LAP3_CARDS.filter(c =>
      selectedCardIds.includes(c.id)
    ));
  }

  // Expand cards by copies and shuffle
  let cardPool = [];
  eligibleCards.forEach(card => {
    const copies = card.copies || 1;
    for (let i = 0; i < copies; i++) {
      cardPool.push({ ...card, instanceId: `${card.id}_${i}_${Date.now()}` });
    }
  });

  // Shuffle
  shuffleArray(cardPool);

  // Take the required number
  return cardPool.slice(0, numCards);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

module.exports = {
  // Dice
  rollPriority,
  rollDice,

  // Effects
  executeEffects,
  executeEffect,

  // Token bonuses
  calculatePriorityBonus,
  calculateRaceBonus,
  calculateAuctionBonus,

  // Auction
  generateAuctionPool,

  // Utilities
  shuffleArray
};
