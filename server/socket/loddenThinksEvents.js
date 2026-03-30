// Lodden Thinks - Socket Event Handlers

const persistence = require('../utils/persistence');

/**
 * Register Lodden Thinks socket events
 */
function registerLoddenThinksEvents(io, socket, lobbies, games) {

  function getGame(slug) {
    const game = games.get(slug);
    if (!game || game.state.type !== 'lodden-thinks') return null;
    return game;
  }

  function broadcastState(slug, game) {
    const lobby = lobbies.get(slug);
    if (!lobby) return;
    lobby.players.forEach(player => {
      if (player.isConnected) {
        const view = game.getPlayerView(player.id);
        io.to(player.id).emit('game-state-updated', view);
      }
    });
    persistence.saveGame(slug, game);
  }

  /**
   * Leader confirms role assignments → QUESTION phase
   */
  socket.on('lodden:confirm-setup', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const lobby = lobbies.get(slug);
    if (!lobby || lobby.leaderId !== socket.id) {
      socket.emit('error', { message: 'Only the leader can start the round' });
      return;
    }
    const result = game.confirmSetup(socket.id);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Any player submits a question to the round's queue.
   * deckQuestionId is optional — set when the question comes from the deck.
   */
  socket.on('lodden:submit-question', ({ slug, text, deckQuestionId = null }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.submitQuestion(socket.id, text, deckQuestionId);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Any player selects a question from the queue → LOCK_IN phase
   */
  socket.on('lodden:select-question', ({ slug, queueItemId }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.selectQuestion(socket.id, queueItemId);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Return the full question deck to the requesting client.
   * Replaces [Lodden] with the actual Lodden's name.
   */
  socket.on('lodden:get-deck', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const lodden = game.state.players.find(p => p.id === game.state.currentRound.loddenId);
    const loddenName = lodden ? lodden.name : 'Lodden';

    // Deep copy and replace [Lodden] placeholder
    const deck = JSON.parse(JSON.stringify(game.getDeck()));
    for (const cat of deck.categories) {
      for (const q of cat.questions) {
        q.displayText = q.text.replace(/\[Lodden\]/g, loddenName);
      }
    }

    socket.emit('lodden:deck', { deck });
  });

  /**
   * Draw a random question from the deck and add it to the queue.
   */
  socket.on('lodden:draw-random-question', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const lodden = game.state.players.find(p => p.id === game.state.currentRound.loddenId);
    const loddenName = lodden ? lodden.name : 'Lodden';
    const randomQ = game.getRandomDeckQuestion(loddenName);
    const result = game.submitQuestion(socket.id, randomQ.text, randomQ.id);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Lodden locks in their number → BIDDING phase
   */
  socket.on('lodden:lock-in', ({ slug, number }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.lockIn(socket.id, number);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Active bettor places a higher bid
   */
  socket.on('lodden:bid', ({ slug, value }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.bid(socket.id, value);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Active bettor takes the under — ends bidding → REVEAL phase
   */
  socket.on('lodden:take-under', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.takeUnder(socket.id);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Spectator predicts which side will win during BIDDING
   */
  socket.on('lodden:spectator-predict', ({ slug, predictedSide }) => {
    const game = getGame(slug);
    if (!game) return;
    const result = game.spectatorPredict(socket.id, predictedSide);
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Leader advances from REVEAL → ROUND_OVER (scoreboard)
   */
  socket.on('lodden:acknowledge-reveal', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const lobby = lobbies.get(slug);
    if (!lobby || lobby.leaderId !== socket.id) {
      socket.emit('error', { message: 'Only the leader can advance' });
      return;
    }
    const result = game.acknowledgeReveal();
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  /**
   * Leader starts the next round
   */
  socket.on('lodden:next-round', ({ slug }) => {
    const game = getGame(slug);
    if (!game) return;
    const lobby = lobbies.get(slug);
    if (!lobby || lobby.leaderId !== socket.id) {
      socket.emit('error', { message: 'Only the leader can start the next round' });
      return;
    }
    const result = game.nextRound();
    if (result.success) {
      broadcastState(slug, game);
    } else {
      socket.emit('error', { message: result.error });
    }
  });
}

module.exports = { registerLoddenThinksEvents };
