// 1001 Game Nights - Dice Factory Socket Events
// Version: 2.1.0 - Added modification bidding/auction events
// Updated: December 2024

const { botSystem } = require('../games/bots');

/**
 * Helper function to broadcast dice factory game updates
 * @param {Object} io - Socket.io instance
 * @param {string} lobbySlug - Lobby identifier
 * @param {Object} game - Game instance
 * @param {Map} lobbies - Lobbies storage
 */
function broadcastDiceFactoryUpdate(io, lobbySlug, game, lobbies) {
  const lobby = lobbies.get(lobbySlug);
  if (!lobby) return;

  console.log('📡 Broadcasting dice factory update to', lobby.players.length, 'players');
  lobby.players.forEach(player => {
    if (player.isConnected && !botSystem.isBot(player.id)) {
      const playerView = game.getPlayerView(player.id);
      io.to(player.id).emit('game-state-updated', playerView);
    }
  });
}

/**
 * Broadcast factory item updates to a specific player
 * @param {Object} io - Socket.io instance
 * @param {string} playerId - Player ID to send update to
 * @param {Object} game - Game instance
 */
function broadcastPlayerFactoryItems(io, playerId, game) {
  const factoryItems = game.factorySystem.getPlayerFactoryItems(playerId);
  
  const response = {
    modifications: factoryItems.modifications || [],
    effects: (factoryItems.effects || []).map(effectId => {
      const effect = game.state.availableEffects?.find(e => e.id === effectId);
      return effect || { id: effectId, name: effectId, description: 'Unknown effect', cost: 0 };
    }),
    hand: (factoryItems.hand || []).map(effectId => {
      const effect = game.state.availableEffects?.find(e => e.id === effectId);
      return effect || { id: effectId, name: effectId, description: 'Unknown effect', cost: 0 };
    })
  };

  io.to(playerId).emit('player-factory-items-update', response);
}

/**
 * Helper function to handle auction phase
 * @param {Object} io - Socket.io instance
 * @param {string} lobbySlug - Lobby identifier
 * @param {Object} game - Game instance
 * @param {Map} lobbies - Lobbies storage
 * @param {Array} auctions - Auctions needing resolution
 */
function handleAuctionPhase(io, lobbySlug, game, lobbies, auctions) {
  const lobby = lobbies.get(lobbySlug);
  if (!lobby) return;

  console.log(`🔨 Starting auction phase for ${auctions.length} modifications`);

  // Initialize auction state
  game.state.currentAuctions = auctions;
  game.state.auctionBids = {};

  // Send auction details to all human players
  lobby.players.forEach(player => {
    if (player.isConnected && !botSystem.isBot(player.id)) {
      // Check if this player is involved in any auctions
      const playerAuctions = auctions.filter(auction => 
        auction.bidders.some(bid => bid.playerId === player.id)
      );
      
      if (playerAuctions.length > 0) {
        io.to(player.id).emit('auction-phase-start', {
          auctions: playerAuctions
        });
      }
    }
  });

  // Auto-bid for bots (they bid their original amount)
  auctions.forEach(auction => {
    auction.bidders.forEach(bid => {
      if (botSystem.isBot(bid.playerId)) {
        if (!game.state.auctionBids[auction.modificationId]) {
          game.state.auctionBids[auction.modificationId] = {};
        }
        game.state.auctionBids[auction.modificationId][bid.playerId] = bid.amount;
      }
    });
  });

  // Check if all bids are from bots (auto-resolve)
  const allBidsFromBots = auctions.every(auction =>
    auction.bidders.every(bid => botSystem.isBot(bid.playerId))
  );

  if (allBidsFromBots) {
    console.log('🤖 All auction bids are from bots, auto-resolving...');
    resolveAllAuctions(io, lobbySlug, game, lobbies);
  }
}

/**
 * Complete the auction phase after all bids are resolved
 * @param {Object} io - Socket.io instance
 * @param {string} lobbySlug - Lobby slug
 * @param {Object} game - Game instance
 * @param {Map} lobbies - Lobbies map
 */
function completeAuctionPhase(io, lobbySlug, game, lobbies) {
  console.log('🔨 Completing auction phase...');

  // Clear auction state
  game.state.currentAuctions = [];
  game.state.auctionBids = {};

  // Complete end of turn processing
  game.turnSystem.completeEndOfTurn(game.factorySystem);

  // Broadcast updated game state
  broadcastDiceFactoryUpdate(io, lobbySlug, game, lobbies);

  // Schedule bots for new turn
  scheduleDiceFactoryBotsIfNeeded(io, lobbySlug, game, lobbies);
}

/**
 * Resolve all pending auctions
 * @param {Object} io - Socket.io instance
 * @param {string} lobbySlug - Lobby slug
 * @param {Object} game - Game instance
 * @param {Map} lobbies - Lobbies map
 */
function resolveAllAuctions(io, lobbySlug, game, lobbies) {
  console.log('🔨 Resolving all auctions');
  
  const results = [];
  
  game.state.currentAuctions.forEach(auction => {
    const blindBids = game.state.auctionBids[auction.modificationId] || {};
    
    console.log(`🔨 Resolving auction for ${auction.modification.name}:`, blindBids);
    
    const result = game.factorySystem.resolveBlindAuction(auction.modificationId, blindBids);
    
    if (result.success && result.winner) {
      console.log(`🏆 Auction winner: ${result.winner.playerName} for ${auction.modification.name}`);
      
      // ADD THIS LINE:
      broadcastPlayerFactoryItems(io, result.winner.playerId, game);
    }
    
    results.push({
      modification: auction.modification,
      winner: result.winner,
      allBids: blindBids
    });
  });
  
  // Broadcast auction results to all players
  const lobby = lobbies.get(lobbySlug);
  if (lobby) {
    lobby.players.forEach(player => {
      if (player.isConnected && !botSystem.isBot(player.id)) {
        io.to(player.id).emit('auction-results', {
          results: results
        });
      }
    });
  }
  
  // Complete auction phase after a delay (to show results)
  setTimeout(() => {
    completeAuctionPhase(io, lobbySlug, game, lobbies);
  }, 1000);
}

/**
 * Schedule bot actions if needed with detailed debugging
 * @param {Object} io - Socket.io instance
 * @param {string} lobbySlug - Lobby slug
 * @param {Object} game - Game instance
 * @param {Map} lobbies - Lobbies map
 */
function scheduleDiceFactoryBotsIfNeeded(io, lobbySlug, game, lobbies) {
  if (game.state.phase !== 'playing') {
    return;
  }
  
  const pendingBots = game.getPendingBotPlayers ? 
    game.getPendingBotPlayers().filter(p => botSystem.isBot(p.id)) : 
    [];
  
  if (pendingBots.length > 0) {
    pendingBots.forEach((botPlayer, index) => {
      setTimeout(() => {
        if (!botPlayer.isReady && !botPlayer.hasFled) {
          botSystem.executeBotTurn(io, lobbySlug, game, lobbies, botPlayer.id);
        }
      }, index * 1000);
    });
  }
}

/**
 * Register Dice Factory game-related socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerDiceFactoryEvents(io, socket, lobbies, games) {
  // Helper to check if game is v0.1.5 (has factory system)
  const isV015Game = (game) => {
    return game && game.state.version !== 'v0.2.1' && game.factorySystem;
  };

  // Handle discarding a modification to add a new one (v0.1.5 only)
  socket.on('dice-factory-discard-modification', (data) => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    const player = game.state.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('dice-factory-error', { error: 'Player not found' });
      return;
    }
    // Remove the selected modification
    player.modifications = (player.modifications || []).filter(modId => modId !== data.discardId);
    // Add the new modification
    if (data.newModificationId) {
      player.modifications.push(data.newModificationId);
      game.factorySystem.applyModification(player.id, data.newModificationId);
    }
    broadcastPlayerFactoryItems(io, player.id, game);
    broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    // Always include requireDiscard if player still has >3 mods after discard
    const requireDiscard = (player.modifications?.length || 0) > 3;
    socket.emit('modification-purchased', {
      modification: data.newModificationId,
      source: 'discard',
      requireDiscard
    });
  });

  // ===== EXISTING DICE EVENTS =====

  // Roll dice (legacy - may be removed if auto-roll is implemented) - v0.1.5 only
  socket.on('dice-factory-roll', () => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    
    const result = game.rollDice(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Promote dice - v0.1.5 only
  socket.on('dice-factory-promote', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    
    const result = game.promoteDice(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Recruit dice - v0.1.5 only
  socket.on('dice-factory-recruit', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const result = game.recruitDice(socket.id, data.diceIds); // <-- CORRECT: data.diceIds
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Get player's owned factory items (modifications, effects, hand) - v0.1.5 only
  socket.on('dice-factory-get-player-factory-items', (data) => {
    const { playerId } = data;
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }

    // Only available in v0.1.5
    if (game.state.version === 'v0.2.1' || !game.factorySystem) {
      socket.emit('dice-factory-error', { error: 'Factory items not available in this version' });
      return;
    }

    const targetPlayerId = playerId || socket.id;
    const factoryItems = game.factorySystem.getPlayerFactoryItems(targetPlayerId);

    console.log(`📦 Getting factory items for player ${targetPlayerId}:`, factoryItems);

    // The factoryItems should already contain full objects from getPlayerModifications()
    // and we need to convert effect IDs to full objects
    const response = {
      modifications: factoryItems.modifications || [], // Already full objects
      effects: (factoryItems.effects || []).map(effectId => {
        const effect = game.state.availableEffects?.find(e => e.id === effectId);
        return effect || { id: effectId, name: effectId, description: 'Unknown effect', cost: 0 };
      }),
      hand: (factoryItems.hand || []).map(effectId => {
        const effect = game.state.availableEffects?.find(e => e.id === effectId);
        return effect || { id: effectId, name: effectId, description: 'Unknown effect', cost: 0 };
      })
    };

    console.log(`📦 Sending factory items response:`, response);
    socket.emit('player-factory-items-update', response);
  });

  // Play effect from hand
  socket.on('dice-factory-play-effect', (data) => {
    const { effectId } = data;
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    console.log(`🎴 Player ${socket.playerName} playing effect: ${effectId}`);

    const result = game.playFactoryEffect(socket.id, effectId);
    if (result.success) {
      console.log(`✅ Effect ${effectId} played successfully`);

      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);

      // Send updated factory items to the player who played the effect
      broadcastPlayerFactoryItems(io, socket.id, game);

      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      console.log(`❌ Failed to play effect ${effectId}:`, result.error);
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Score straight - v0.1.5 only
  socket.on('dice-factory-score-straight', (data) => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    const result = game.scoreStraight(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Score set - v0.1.5 only
  socket.on('dice-factory-score-set', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const result = game.scoreSet(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Calculate score preview - v0.1.5 only
  socket.on('dice-factory-calculate-score-preview', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const player = game.state.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('dice-factory-error', { error: 'Player not found' });
      return;
    }
    
    // Log dice values for preview
    if (game && game.state && Array.isArray(data.diceIds)) {
      const player = game.state.players.find(p => p.id === socket.id);
      if (player) {
        const dice = player.dicePool.filter(die => data.diceIds.includes(die.id));
        console.log('[Socket] dice-factory-calculate-score-preview dice values:', dice.map(d => `d${d.sides}:${d.value}`));
      }
    }
    const result = game.calculateScorePreview(socket.id, data.diceIds);
    if (result.success) {
      socket.emit('score-preview-calculated', result.preview);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Process dice - v0.1.5 only
  socket.on('dice-factory-process', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const result = game.processDice(socket.id, data.diceIds, data.arbitrageChoice);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Pip action (reroll, increase) - v0.1.5 only
  socket.on('dice-factory-pip-action', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const result = game.pipAction(socket.id, data.action, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Factory action (purchase effect/modification) - v0.1.5 only
  socket.on('dice-factory-factory-action', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    console.log(`🏭 Player ${socket.playerName} factory action:`, data);
    
    const result = game.factoryAction(socket.id, data.actionType, data.targetId);
    if (result.success) {
      console.log(`✅ Factory action successful: ${data.actionType} ${data.targetId}`);
      
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      // Send updated factory items to the player who made the purchase
      broadcastPlayerFactoryItems(io, socket.id, game);
      
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

      // Get modified pip costs for player - v0.1.5 only
    socket.on('dice-factory-get-modified-costs', () => {
      const game = games.get(socket.lobbySlug);

      if (!game || game.state.type !== 'dice-factory') {
        socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
        return;
      }
      if (!isV015Game(game)) {
        return; // Silently ignore for v0.2.1
      }

      const player = game.state.players.find(p => p.id === socket.id);
      if (!player) {
        socket.emit('dice-factory-error', { error: 'Player not found' });
        return;
      }

      // Get modified costs using the DiceSystem
      let rerollCost = game.diceSystem.getModifiedPipCost(player, 'reroll');
      
      // Check if Quality Control is available for this turn
      const hasQualityControl = player.modifications?.includes('quality_control');
      const qualityControlAvailable = hasQualityControl && !player._qualityControlUsedThisTurn;
      
      // If Quality Control is available, first reroll is free
      if (qualityControlAvailable) {
        rerollCost = 0;
      }
      
      const costs = {
        increase: game.diceSystem.getModifiedPipCost(player, 'increase'),
        decrease: game.diceSystem.getModifiedPipCost(player, 'decrease'),
        reroll: rerollCost
      };
      
      socket.emit('modified-costs-update', costs);
    });

  // ===== NEW MODIFICATION BIDDING EVENTS =====

  // Place bid on modification - v0.1.5 only
  socket.on('dice-factory-bid-modification', (data) => {
    const { modificationId, bidAmount } = data;
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const result = game.factorySystem.placeBid(socket.id, modificationId, bidAmount);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      // Log the bid for all players to see
      socket.to(socket.lobbySlug).emit('modification-bid-placed', {
        playerId: socket.id,
        modificationId: modificationId,
        // Don't reveal bid amount until auction
      });
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Reserve modification
  socket.on('dice-factory-reserve-modification', (data) => {
    const { modificationId } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    const result = game.factorySystem.reserveModification(socket.id, modificationId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      // Emit turn-modifications-update to all players in the lobby
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const turnModifications = game.factorySystem.getCurrentTurnModifications();
        const deckStatus = game.factorySystem.getDeckStatus();
        lobby.players.forEach(player => {
          if (player.isConnected && !botSystem.isBot(player.id)) {
            io.to(player.id).emit('turn-modifications-update', {
              modifications: turnModifications,
              deckStatus: deckStatus
            });
          }
        });
      }
    } else {
      socket.emit('dice-factory-error', { error: result.message });
    }
  });

  // Purchase random modification from deck
  socket.on('dice-factory-buy-random-modification', () => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }

    console.log(`🎲 Player ${socket.playerName} buying random modification`);

    const result = game.factorySystem.purchaseRandomModification(socket.id);
    if (result.success) {
      console.log(`✅ Random modification purchased: ${result.modification.name}`);

      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);

      // ADD THIS LINE:
      broadcastPlayerFactoryItems(io, socket.id, game);

      socket.emit('modification-purchased', {
        modification: result.modification,
        source: 'deck',
        requireDiscard: result.requireDiscard || false
      });

      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      console.log(`❌ Failed to buy random modification:`, result.error);
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Submit auction bid
  socket.on('dice-factory-auction-bid', (data) => {
    const { modificationId, bidAmount } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory' || !game.state.currentAuctions) {
      socket.emit('dice-factory-error', { error: 'No active auctions' });
      return;
    }

    // Store the player's auction bid
    if (!game.state.auctionBids[modificationId]) {
      game.state.auctionBids[modificationId] = {};
    }
    game.state.auctionBids[modificationId][socket.id] = bidAmount;

    console.log(`🔨 Auction bid received: ${socket.playerName} bids ${bidAmount} on ${modificationId}`);

    // Check if all human players have submitted their auction bids
    const lobby = lobbies.get(socket.lobbySlug);
    if (lobby) {
      const allAuctionBidsReceived = game.state.currentAuctions.every(auction => {
        return auction.bidders.every(bid => {
          // Bot bids are auto-submitted, human bids need to be checked
          return botSystem.isBot(bid.playerId) || 
                 (game.state.auctionBids[auction.modificationId] && 
                  game.state.auctionBids[auction.modificationId][bid.playerId] !== undefined);
        });
      });

      if (allAuctionBidsReceived) {
        // Resolve all auctions
        resolveAllAuctions(io, socket.lobbySlug, game, lobbies);
      }
    }

    socket.emit('auction-bid-submitted', { modificationId });
  });

  // Get current turn modifications (for UI) - v0.1.5 only
  socket.on('dice-factory-get-turn-modifications', () => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }

    const turnModifications = game.factorySystem.getCurrentTurnModifications();
    const deckStatus = game.factorySystem.getDeckStatus();
    
    socket.emit('turn-modifications-update', {
      modifications: turnModifications,
      deckStatus: deckStatus
    });
  });

  // ===== EXISTING EVENTS (unchanged) =====

  // Generic dice factory action handler (supports bot actions)
  socket.on('dice-factory-action', (data) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    
    const result = game.processAction(socket.id, data);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // End turn - v0.1.5 only
  socket.on('dice-factory-end-turn', (data = {}) => {
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    if (!isV015Game(game)) {
      return; // Silently ignore for v0.2.1
    }
    
    const result = game.setPlayerReady(socket.id, data.dividendChoice);
    
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      // Check if we need auction resolution
      const auctionResult = game.turnSystem.processEndOfTurnAuctions(game.factorySystem);
      
      if (auctionResult.needsAuction) {
        // Start auction phase
        handleAuctionPhase(io, socket.lobbySlug, game, lobbies, auctionResult.auctions);
      } else {
        // No auctions needed, continue with bot scheduling
        scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
      }
      
      if (game.isGameComplete()) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          lobby.currentGame = null;
          lobby.gameType = 'dice-factory';
        }
      }
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Undo action
  socket.on('dice-factory-undo', () => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    const result = game.undoLastAction(socket.id);
    if (result.success) {
      const turnModifications = game.factorySystem.getCurrentTurnModifications();
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      // Emit turn-modifications-update to all players in the lobby
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        const turnModifications = game.factorySystem.getCurrentTurnModifications();
        const deckStatus = game.factorySystem.getDeckStatus();
        lobby.players.forEach(player => {
          if (player.isConnected && !botSystem.isBot(player.id)) {
            io.to(player.id).emit('turn-modifications-update', {
              modifications: turnModifications,
              deckStatus: deckStatus
            });
          }
        });
      }
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Flee game
  socket.on('dice-factory-flee', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.fleeGame(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Initialize new game with fixed bot scheduling
  socket.on('dice-factory-initialize', (data) => {
    const lobby = lobbies.get(socket.lobbySlug);
    if (!lobby) {
      socket.emit('dice-factory-error', { error: 'Lobby not found' });
      return;
    }

    const GameClass = require('../games/dice-factory');
    const game = new GameClass();
    
    const players = lobby.players.map(p => ({
      id: p.id,
      name: p.name,
      isBot: botSystem.isBot(p.id)
    }));
    
    const result = game.initializeGame(players, data.options || {});
    
    if (result.success) {
      games.set(socket.lobbySlug, game);
      lobby.currentGame = game;
      lobby.gameType = 'dice-factory';
      
      // Save initial turn state for all players (for undo)
      lobby.players.forEach(player => {
        game.savePlayerTurnState(player.id);
      });
      
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Dice Tower: Reroll all dice
  socket.on('dice-factory-reroll-all', () => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') return;
    const player = game.state.players.find(p => p.id === socket.id);
    if (!player || !player.modifications?.includes('dice_tower')) {
      socket.emit('dice-factory-error', { error: 'You do not have the Dice Tower modification.' });
      return;
    }
    // Only allow if it's the player's turn and not ready
    if (player.isReady || game.state.phase !== 'playing') {
      socket.emit('dice-factory-error', { error: 'You cannot reroll all dice right now.' });
      return;
    }
    // Only allow once per turn
    if (player._diceTowerUsedThisTurn) {
      socket.emit('dice-factory-error', { error: 'You can only use Dice Tower once per turn.' });
      return;
    }
    player._diceTowerUsedThisTurn = true;
    // Reroll all dice
    for (const die of player.dicePool) {
      die.value = Math.floor(Math.random() * die.sides) + 1;
    }
    game.state.gameLog = require('../games/dice-factory/utils/GameLogger').logAction(
      game.state.gameLog,
      player.name,
      'used Dice Tower to reroll all dice',
      game.state.round
    );
    broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
  });

  // Variable Dice Pool: Spend 10 pips to increase dice pool size
  socket.on('dice-factory-increase-dice-pool', () => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') return;
    const player = game.state.players.find(p => p.id === socket.id);
    if (!player || !player.modifications?.includes('variable_dice_pool')) {
      socket.emit('dice-factory-error', { error: 'You do not have the Variable Dice Pool modification.' });
      return;
    }
    if (player.freePips < 10) {
      socket.emit('dice-factory-error', { error: 'Not enough free pips (need 10).' });
      return;
    }
    player.freePips -= 10;
    player.diceFloor += 1;
    game.state.gameLog = require('../games/dice-factory/utils/GameLogger').logAction(
      game.state.gameLog,
      player.name,
      'used Variable Dice Pool to increase dice pool size by 1',
      game.state.round
    );
    broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
  });

  // Reset Dice Tower usage at the start of each turn
  // (Find the start-of-turn logic and add: player._diceTowerUsedThisTurn = false;)

  // Calculate score preview for selected dice
  socket.on('dice-factory-calculate-score', (data) => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
    }
    const player = game.state.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('dice-factory-error', { error: 'Player not found' });
      return;
    }
    const diceIds = data.diceIds;
    if (!Array.isArray(diceIds) || diceIds.length === 0) {
      socket.emit('score-preview', { type: 'invalid', formula: '', points: 0, notes: 'No dice selected.' });
      return;
    }
    const DiceHelpers = require('../games/dice-factory/utils/DiceHelpers');
    const ScoringSystem = require('../games/dice-factory/systems/ScoringSystem');
    const ValidationRules = require('../games/dice-factory/data/ValidationRules');
    // Create a fake game state for preview
    const fakeGameState = { ...game.state, gameLog: [], round: game.state.round };
    const scoring = new ScoringSystem(fakeGameState);
    const selectedDice = DiceHelpers.findDiceByIds(player.dicePool, diceIds);
    let result = { type: 'invalid', formula: '', points: 0, notes: '' };
    // Try straight
    const hasVerticalIntegration = player.modifications?.includes('vertical_integration');
    const straightValidation = ValidationRules.validateStraight(selectedDice, hasVerticalIntegration);
    if (straightValidation.isValid) {
      const basePoints = straightValidation.points;
      const synergy = player.modifications?.includes('synergy');
      let formula = `highest × dice count`;
      let notes = '';
      let points = basePoints;
      if (synergy) {
        formula = `highest × (dice count + 1)`;
        notes = 'Synergy: +1 die';
        points = Math.max(...selectedDice.map(d => d.value)) * (selectedDice.length + 1);
      }
      result = {
        type: 'straight',
        formula,
        points,
        notes
      };
    } else {
      // Try set
      const hasJointVenture = player.modifications?.includes('joint_venture');
      const setValidation = ValidationRules.validateSet(selectedDice, hasJointVenture);
      if (setValidation.isValid) {
        const basePoints = setValidation.points;
        const synergy = player.modifications?.includes('synergy');
        let formula = 'value × (dice count + 1)';
        let notes = '';
        let points = basePoints;
        if (synergy) {
          formula = 'value × (dice count + 2)';
          notes = 'Synergy: +1 die';
          points = selectedDice[0].value * (selectedDice.length + 2);
        }
        result = {
          type: 'set',
          formula,
          points,
          notes
        };
      } else {
        result = {
          type: 'invalid',
          formula: '',
          points: 0,
          notes: straightValidation.reason || setValidation.reason || 'Not a valid set or straight.'
        };
      }
    }
    socket.emit('score-preview', result);
  });

  // ===== V0.2.1 SLOT-BASED EVENTS =====

  // Assign ability to slot (v0.2.1)
  socket.on('dice-factory:assign-slot', (data) => {
    const { slotNumber, abilityId } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.assignSlot(socket.id, slotNumber, abilityId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Execute ability (v0.2.1)
  socket.on('dice-factory:execute-ability', (data) => {
    const { abilityId, slotNumber, costDiceIds, costCardIds, targetDieId, targetValue, bumpDirection, bumpAmount } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.executeAbility(socket.id, abilityId, slotNumber, costDiceIds, costCardIds || [], targetDieId, targetValue, bumpDirection, bumpAmount);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);

      // If this was an attack, notify other players
      if (result.pendingAttack) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          result.pendingAttack.waitingFor.forEach(playerId => {
            io.to(playerId).emit('dice-factory:attack-request', {
              attackId: result.attackId,
              attackerName: result.pendingAttack.attackerName,
              diceCount: result.pendingAttack.diceCount,
              type: result.pendingAttack.type
            });
          });
        }
      }
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Respond to attack (v0.2.1)
  socket.on('dice-factory:respond-to-attack', (data) => {
    const { attackId, diceIds } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.respondToAttack(socket.id, attackId, diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Buy card (v0.2.1)
  socket.on('dice-factory:buy-card', (data) => {
    const { cardId, costDiceIds } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.buyCard(socket.id, cardId, costDiceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Swap slots (v0.2.1)
  socket.on('dice-factory:swap-slots', (data) => {
    const { slot1, slot2 } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.swapSlots(socket.id, slot1, slot2);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Clear slot (v0.2.1)
  socket.on('dice-factory:clear-slot', (data) => {
    const { slotNumber } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.clearSlot(socket.id, slotNumber);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Card unexhaust (v0.2.1)
  socket.on('dice-factory:card-unexhaust', (data) => {
    const { cardId } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.cardUnexhaustAbility(socket.id, cardId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Card cost reduction (v0.2.1)
  socket.on('dice-factory:card-cost-reduction', (data) => {
    const { cardId } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.cardCostReductionAbility(socket.id, cardId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Swap Plus (v0.2.1)
  socket.on('dice-factory:swap-plus', (data) => {
    const { slot1, slot2 } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.swapPlusAbility(socket.id, slot1, slot2);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Mass unexhaust (v0.2.1)
  socket.on('dice-factory:mass-unexhaust', (data) => {
    const { cardIds } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.massUnexhaustAbility(socket.id, cardIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Use card dice number (v0.2.1)
  socket.on('dice-factory:use-card-dice', (data) => {
    const { cardId } = data;
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.useCardDiceNumber(socket.id, cardId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      // Also send back the dice numbers that can be used
      socket.emit('dice-factory:card-dice-ready', {
        diceNumbers: result.diceNumbers,
        cardId: cardId
      });
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Pass turn (v0.2.1) - player passes, play advances
  socket.on('dice-factory:pass-turn', (data) => {
    const game = games.get(socket.lobbySlug);
    if (!game || game.state.type !== 'dice-factory' || game.state.version !== 'v0.2.1') {
      return;
    }
    const result = game.passTurn(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory:error', { error: result.error });
    }
  });

  // Cleanup when player disconnects
  socket.on('disconnect', () => {
    if (socket.lobbySlug) {
      botSystem.cleanupGame(socket.lobbySlug);
    }
  });
}

module.exports = { registerDiceFactoryEvents };