// 1001 Game Nights - Dice Factory Socket Events
// Version: 2.0.0 - Extracted from main server file with fixes
// Updated: December 2024

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

  lobby.players.forEach(player => {
    if (player.isConnected) {
      const playerView = game.getPlayerView(player.id);
      io.to(player.id).emit('game-state-updated', playerView);
    }
  });
}

/**
 * Register Dice Factory game-related socket events
 * @param {Object} io - Socket.io instance
 * @param {Object} socket - Individual socket connection
 * @param {Map} lobbies - Lobbies storage
 * @param {Map} games - Games storage
 */
function registerDiceFactoryEvents(io, socket, lobbies, games) {

  // Roll dice (legacy - may be removed if auto-roll is implemented)
  socket.on('dice-factory-roll', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.rollDice(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
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
    
    // FIX: Use data.diceIds instead of data
    const result = game.promoteDice(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
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
    
    // FIX: Use data.diceIds instead of data.recruitingDieId
    const result = game.recruitDice(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
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
      socket.emit('dice-factory-scored', { 
        type: 'straight', 
        points: result.points 
      });
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
      socket.emit('dice-factory-scored', { 
        type: 'set', 
        points: result.points 
      });
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Process dice for pips
  socket.on('dice-factory-process', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.processDice(socket.id, data.diceIds);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Modify die value (increase/decrease)
  socket.on('dice-factory-modify-die', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.modifyDieValue(socket.id, data.dieId, data.change);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Reroll single die
  socket.on('dice-factory-reroll-die', (data) => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.rerollDie(socket.id, data.dieId);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // End turn
  socket.on('dice-factory-end-turn', () => {
    console.log('DEBUG: dice-factory-end-turn received');
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      console.log('DEBUG: No game found or wrong type');
      return;
    }
    
    console.log('DEBUG: Calling setPlayerReady for:', socket.id);
    const result = game.setPlayerReady(socket.id);
    console.log('DEBUG: setPlayerReady result:', result);
    
    if (result.success) {
      console.log('DEBUG: Broadcasting update');
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
      if (game.isGameComplete()) {
        const lobby = lobbies.get(socket.lobbySlug);
        if (lobby) {
          lobby.currentGame = null;
          lobby.gameType = 'dice-factory';
        }
      }
    } else {
      console.log('DEBUG: setPlayerReady failed, sending error');
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Player flees factory
  socket.on('dice-factory-flee', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.fleeFatory(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
      
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

  // Undo last action only
  socket.on('dice-factory-undo', () => {
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'dice-factory') {
      return;
    }
    
    const result = game.undoTurn(socket.id);
    if (result.success) {
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });

  // Start new game with same players (leader only)
  socket.on('dice-factory-new-game', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const result = game.startNewGame();
    if (result.success) {
      lobby.players.forEach(player => {
        game.savePlayerTurnState(player.id);
      });
      
      broadcastDiceFactoryUpdate(io, socket.lobbySlug, game, lobbies);
    } else {
      socket.emit('dice-factory-error', { error: result.error });
    }
  });
}

module.exports = { registerDiceFactoryEvents };