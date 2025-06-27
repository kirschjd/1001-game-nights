// 1001 Game Nights - Factory System
// Version: 2.1.0 - Added bidding/auction system for modifications
// Updated: December 2024

const { 
  getRandomEffects, 
  canPurchaseEffect, 
  applyEffect 
} = require('../data/FactoryEffects');
const { 
  createModificationDeck,
  drawFromDeck,
  getModificationById,
  canPurchaseModification,
  applyModification,
  getPlayerModifications,
  getActualModificationCost
} = require('../data/FactoryModifications');
const { logFactoryPurchase, logAction } = require('../utils/GameLogger');

class FactorySystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Initialize factory effects and modifications for the game
   * @param {number} effectCount - Number of effects to make available
   */
  initializeFactory(effectCount = 3) {
    // Get random effects for this game (unchanged)
    this.gameState.availableEffects = getRandomEffects(effectCount);
    
    // Initialize modification deck system
    this.gameState.modificationDeck = createModificationDeck();
    this.gameState.availableModifications = []; // Will be drawn each turn
    this.gameState.currentTurnModifications = []; // 3 cards available for bidding this turn
    this.gameState.modificationBids = {}; // playerId -> {modificationId: bidAmount}
    this.gameState.pendingAuctions = []; // Modifications with multiple bidders
    
    // Draw initial 3 modifications for turn 1
    this.drawTurnModifications();
    
    // Ensure arrays are initialized even if empty
    if (!this.gameState.availableEffects) this.gameState.availableEffects = [];
    
    // Initialize player factory data
    for (const player of this.gameState.players) {
      if (!player.effects) player.effects = [];
      if (!player.modifications) player.modifications = [];
      if (!player.factoryHand) player.factoryHand = []; // Effects in hand (purchased but not played)
      if (!player.modificationBids) player.modificationBids = {}; // Current turn bids
    }
  }

  /**
   * Draw 3 new modifications for the current turn
   */
  drawTurnModifications() {
    const { drawnCards, remainingDeck } = drawFromDeck(this.gameState.modificationDeck, 3);
    
    this.gameState.currentTurnModifications = drawnCards.map(modId => ({
      id: modId,
      modification: getModificationById(modId),
      bids: [], // {playerId, amount}
      winner: null
    }));
    
    this.gameState.modificationDeck = remainingDeck;
    
    // Log the new modifications available
    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      'SYSTEM',
      `New modifications available: ${drawnCards.map(id => getModificationById(id)?.name || id).join(', ')}`,
      this.gameState.round
    );
  }

  /**
   * Player places a bid on a modification
   * @param {string} playerId - Player ID
   * @param {string} modificationId - Modification ID from current turn
   * @param {number} bidAmount - Amount to bid in pips
   * @returns {Object} - {success: boolean, message: string}
   */
  placeBid(playerId, modificationId, bidAmount) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Find the modification in current turn offerings
    const modCard = this.gameState.currentTurnModifications.find(card => card.id === modificationId);
    if (!modCard) {
      return { success: false, message: 'Modification not available for bidding this turn' };
    }

    const modification = modCard.modification;
    if (!modification) {
      return { success: false, message: 'Invalid modification' };
    }

    // Validate bid amount
    if (bidAmount < 0) {
      return { success: false, message: 'Bid amount cannot be negative' };
    }

    if (player.freePips < bidAmount) {
      return { success: false, message: 'Not enough pips to place this bid' };
    }

    // Check if player already has this modification and it's not stackable
    if (!modification.stackable && player.modifications?.includes(modificationId)) {
      return { success: false, message: 'Already own this modification and it\'s not stackable' };
    }

    // Remove any existing bid from this player on this modification
    modCard.bids = modCard.bids.filter(bid => bid.playerId !== playerId);
    
    // Add new bid
    modCard.bids.push({
      playerId: playerId,
      playerName: player.name,
      amount: bidAmount
    });

    this.gameState.gameLog = logAction(
      this.gameState.gameLog,
      player.name,
      `placed bid of ${bidAmount} pips on ${modification.name}`,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Bid placed on ${modification.name}` 
    };
  }

  /**
   * Purchase random modification from deck
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, message: string, modification?: Object}
   */
  purchaseRandomModification(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (this.gameState.modificationDeck.length === 0) {
      return { success: false, message: 'Modification deck is empty' };
    }

    // Calculate cost (9 pips, reduced by Market Manipulation if player has it)
    const baseCost = 9;
    const actualCost = getActualModificationCost(player, 'dummy_mod'); // Uses Market Manipulation check

    if (player.freePips < actualCost) {
      return { success: false, message: 'Not enough pips' };
    }

    // Draw from top of deck
    const { drawnCards, remainingDeck } = drawFromDeck(this.gameState.modificationDeck, 1);
    const modificationId = drawnCards[0];
    const modification = getModificationById(modificationId);

    if (!modification) {
      return { success: false, message: 'Invalid modification drawn' };
    }

    // Check if player already has this modification and it's not stackable
    if (!modification.stackable && player.modifications?.includes(modificationId)) {
      // Put the card back and shuffle
      this.gameState.modificationDeck = [modificationId, ...remainingDeck];
      return { success: false, message: 'Drew a modification you already own (not stackable)' };
    }

    // Purchase successful
    this.gameState.modificationDeck = remainingDeck;
    player.freePips -= actualCost;
    player.modifications.push(modificationId);

    // Apply modification immediately
    this.applyModification(playerId, modificationId);

    // Log purchase
    this.gameState.gameLog = logFactoryPurchase(
      this.gameState.gameLog,
      player.name,
      'random modification',
      modification.name,
      actualCost,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Purchased ${modification.name} from deck`,
      modification: modification
    };
  }

  /**
   * Resolve auctions at end of turn
   * @returns {Object} - {success: boolean, auctions: Array}
   */
  resolveModificationAuctions() {
    const auctions = [];
    
    for (const modCard of this.gameState.currentTurnModifications) {
      if (modCard.bids.length === 0) {
        // No bids - card is discarded
        continue;
      } else if (modCard.bids.length === 1) {
        // Single bid - automatic win
        const winningBid = modCard.bids[0];
        const winner = this.gameState.players.find(p => p.id === winningBid.playerId);
        
        if (winner) {
          const actualCost = getActualModificationCost(winner, modCard.id);
          
          if (winner.freePips >= winningBid.amount) {
            winner.freePips -= winningBid.amount;
            winner.modifications.push(modCard.id);
            modCard.winner = winningBid.playerId;
            
            // Apply modification
            this.applyModification(winningBid.playerId, modCard.id);
            
            this.gameState.gameLog = logFactoryPurchase(
              this.gameState.gameLog,
              winner.name,
              'modification',
              modCard.modification.name,
              winningBid.amount,
              this.gameState.round
            );
          }
        }
      } else {
        // Multiple bids - needs auction resolution
        auctions.push({
          modificationId: modCard.id,
          modification: modCard.modification,
          bidders: modCard.bids
        });
      }
    }
    
    return { success: true, auctions };
  }

  /**
   * Resolve a specific auction with blind bids
   * @param {string} modificationId - Modification being auctioned
   * @param {Object} blindBids - {playerId: bidAmount}
   * @returns {Object} - {success: boolean, winner?: Object}
   */
  resolveBlindAuction(modificationId, blindBids) {
    const modCard = this.gameState.currentTurnModifications.find(card => card.id === modificationId);
    if (!modCard) {
      return { success: false, message: 'Modification not found in current turn' };
    }

    // Find highest bid
    let highestBid = -1;
    let winners = [];
    
    Object.entries(blindBids).forEach(([playerId, bidAmount]) => {
      if (bidAmount > highestBid) {
        highestBid = bidAmount;
        winners = [playerId];
      } else if (bidAmount === highestBid) {
        winners.push(playerId);
      }
    });

    if (winners.length === 0 || highestBid === 0) {
      // No valid bids
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        'SYSTEM',
        `No valid bids for ${modCard.modification.name} - card discarded`,
        this.gameState.round
      );
      return { success: true, winner: null };
    }

    if (winners.length > 1) {
      // Tie - nobody gets it
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        'SYSTEM',
        `Tied bids for ${modCard.modification.name} - card discarded`,
        this.gameState.round
      );
      return { success: true, winner: null };
    }

    // Single winner
    const winnerId = winners[0];
    const winner = this.gameState.players.find(p => p.id === winnerId);
    
    if (!winner) {
      return { success: false, message: 'Winner not found' };
    }

    // Validate winner can still afford the bid
    if (winner.freePips < highestBid) {
      this.gameState.gameLog = logAction(
        this.gameState.gameLog,
        'SYSTEM',
        `${winner.name} cannot afford winning bid for ${modCard.modification.name} - card discarded`,
        this.gameState.round
      );
      return { success: true, winner: null };
    }

    // Award modification to winner
    winner.freePips -= highestBid;
    winner.modifications.push(modificationId);
    modCard.winner = winnerId;

    // Apply modification
    this.applyModification(winnerId, modificationId);

    this.gameState.gameLog = logFactoryPurchase(
      this.gameState.gameLog,
      winner.name,
      'modification (auction)',
      modCard.modification.name,
      highestBid,
      this.gameState.round
    );

    return { 
      success: true, 
      winner: {
        playerId: winnerId,
        playerName: winner.name,
        bidAmount: highestBid,
        modification: modCard.modification
      }
    };
  }

  /**
   * Start new turn - draw new modifications
   */
  startNewTurn() {
    // Clear previous turn's bidding data
    this.gameState.currentTurnModifications = [];
    this.gameState.pendingAuctions = [];
    
    // Reset player bids
    for (const player of this.gameState.players) {
      player.modificationBids = {};
    }
    
    // Draw new modifications for this turn
    this.drawTurnModifications();
  }

  // ===== EXISTING EFFECT METHODS (unchanged) =====

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
   * Purchase a factory modification (legacy method - 9 pips direct)
   * @param {string} playerId - Player ID
   * @param {string} modificationId - Modification ID to purchase
   * @returns {Object} - {success: boolean, message: string}
   */
  purchaseModification(playerId, modificationId) {
    // This is now deprecated in favor of the bidding system
    // Kept for compatibility
    return { success: false, message: 'Direct purchase disabled - use bidding system' };
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
    const result = applyEffect(this.gameState, playerId, effectId);
    
    if (result.newState) {
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
    const result = applyModification(this.gameState, playerId, modificationId);
    
    if (result.newState) {
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
   * Get current turn modification bidding status
   * @returns {Object} - Current turn modifications with bid info
   */
  getCurrentTurnModifications() {
    return this.gameState.currentTurnModifications || [];
  }

  /**
   * Get modification deck status
   * @returns {Object} - {cardsRemaining: number, totalCards: number}
   */
  getDeckStatus() {
    return {
      cardsRemaining: this.gameState.modificationDeck?.length || 0,
      totalCards: 44 // Total cards in full deck
    };
  }

  /**
   * Reset factory items for new game
   */
  resetFactory() {
    this.gameState.availableEffects = [];
    this.gameState.modificationDeck = createModificationDeck();
    this.gameState.currentTurnModifications = [];
    this.gameState.modificationBids = {};
    this.gameState.pendingAuctions = [];
    
    for (const player of this.gameState.players) {
      player.effects = [];
      player.modifications = [];
      player.factoryHand = [];
      player.modificationBids = {};
    }
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

    return triggeredEffects;
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
      deckCardsRemaining: this.gameState.modificationDeck?.length || 0,
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