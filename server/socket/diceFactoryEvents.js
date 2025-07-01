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
          results: auctionResults
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
  console.log('🔍 CHECKING FOR PENDING DICE FACTORY BOTS...');
  
  if (game.state.phase !== 'playing') {
    console.log('❌ Game not in playing phase:', game.state.phase);
    return;
  }
  
  const allPlayers = game.state.players;
  console.log('👥 All players in game:');
  allPlayers.forEach(p => {
    console.log(`  ${p.name} (${p.id}): isBot=${botSystem.isBot(p.id)}, isReady=${p.isReady}, hasFled=${p.hasFled}`);
  });
  
  const pendingBots = game.getPendingBotPlayers ? 
    game.getPendingBotPlayers().filter(p => botSystem.isBot(p.id)) : 
    [];
  
  console.log(`🤖 Found ${pendingBots.length} pending bots`);
  
  if (pendingBots.length > 0) {
    pendingBots.forEach((botPlayer, index) => {
      console.log(`⏰ Scheduling bot ${botPlayer.name} (${botPlayer.id}) - ${index * 1000}ms delay`);
      
      setTimeout(() => {
        if (!botPlayer.isReady && !botPlayer.hasFled) {
          console.log(`🎮 Executing bot turn for ${botPlayer.name}`);
          botSystem.executeBotTurn(io, lobbySlug, game, lobbies, botPlayer.id);
        } else {
          console.log(`⚠️ Bot ${botPlayer.name} no longer needs action`);
        }
      }, index * 1000);
    });
  } else {
    console.log('✅ No pending bots found');
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

  // ===== EXISTING DICE EVENTS =====

  // Roll dice (legacy - may be removed if auto-roll is implemented)
  socket.on('dice-factory-roll', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.rollDice(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Promote dice
  socket.on('dice-factory-promote', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.promoteDice(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Recruit dice
  socket.on('dice-factory-recruit', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.recruitDice(socket.id, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Get player's owned factory items (modifications, effects, hand)
  socket.on('dice-factory-get-player-factory-items', (data) => {
    const { playerId } = data;
    const game = games.get(socket.lobbySlug);

    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
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

  // Score straight
  socket.on('dice-factory-score-straight', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.scoreStraight(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Score set
  socket.on('dice-factory-score-set', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.scoreSet(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Process dice
  socket.on('dice-factory-process', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.processDice(socket.id, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Pip action (reroll, increase)
  socket.on('dice-factory-pip-action', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.pipAction(socket.id, data.action, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Factory action (purchase effect/modification)
  socket.on('dice-factory-factory-action', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    console.log(`🏭 Player ${socket.playerName} factory action:`, data);
    
    const result = game.factoryAction(socket.id, data.actionType, data.targetId);
    if (result.success) {
      console.log(`✅ Factory action successful: ${data.actionType} ${data.targetId}`);
      
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      // ADD THIS BLOCK:
      if (data.actionType === 'effect') {
        broadcastPlayerFactoryItems(io, socket.id, game);
      }
      
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      console.log(`❌ Factory action failed:`, result.error);
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // ===== NEW MODIFICATION BIDDING EVENTS =====

  // Place bid on modification
  socket.on('dice-factory-bid-modification', (data) => {
    const { modificationId, bidAmount } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
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
        source: 'deck'
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

  // Get current turn modifications (for UI)
  socket.on('dice-factory-get-turn-modifications', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      socket.emit('dice-factory-error', { error: 'Game not found or wrong type' });
      return;
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
    
    const result = game.processAction(socket.id, data);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // End turn
  socket.on('dice-factory-end-turn', () => {
    console.log('🎲 DICE FACTORY END-TURN:', socket.id);
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      console.log('❌ No game found or wrong type');
      return;
    }
    
    const result = game.setPlayerReady(socket.id);
    console.log('✅ setPlayerReady result:', result);
    
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
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
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
      
      console.log('🎮 NEW GAME STARTED - Scheduling initial bots');
      scheduleDiceFactoryBotsIfNeeded(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
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