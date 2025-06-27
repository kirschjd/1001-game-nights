// server/games/war/events/basicWarEvents.js
// Basic War game events (legacy support for original war game)

const WarGame = require('../WarGame');

function setupBasicWarEvents(io, socket, lobbies, games) {
  console.log('Setting up basic War events for socket:', socket.id);

  // Basic war player action (for original WarGame class)
  socket.on('war-player-action', (data) => {
    const { action } = data;
    const game = games.get(socket.lobbySlug);
    
    if (!game || game.state.type !== 'war') {
      return;
    }
    
    const result = game.playerAction(socket.id, action);
    if (result.success) {
      const lobby = lobbies.get(socket.lobbySlug);
      if (lobby) {
        lobby.players.forEach(player => {
          if (player.isConnected) {
            const playerView = game.getPlayerView(player.id);
            io.to(player.id).emit('game-state-updated', playerView);
          }
        });
      }
    } else {
      socket.emit('war-error', { error: result.error });
    }
  });

  // Basic war next round (for original WarGame class)
  socket.on('war-next-round', () => {
    const lobby = lobbies.get(socket.lobbySlug);
    const game = games.get(socket.lobbySlug);
    
    if (!game || !lobby || lobby.leaderId !== socket.id) {
      return;
    }
    
    const result = game.nextRound();
    if (result.success) {
      lobby.players.forEach(player => {
        if (player.isConnected) {
          const playerView = game.getPlayerView(player.id);
          io.to(player.id).emit('game-state-updated', playerView);
        }
      });
    } else {
      socket.emit('war-error', { error: result.error });
    }
  });

  // Legacy start basic war game (without variants/bots)
  socket.on('start-basic-war', (data) => {
    const { slug } = data;
    const lobby = lobbies.get(slug);
    
    if (!lobby || lobby.leaderId !== socket.id) {
      return;
    }

    const connectedPlayers = lobby.players.filter(p => p.isConnected);
    if (connectedPlayers.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }

    // Create basic war game (no variants, no bots)
    const game = new WarGame(connectedPlayers);
    game.dealCards();
    
    games.set(slug, game);
    lobby.currentGame = game.state.type;

    console.log(`Started basic War game in lobby ${slug} with ${connectedPlayers.length} players`);

    // Send initial game state to all players
    connectedPlayers.forEach(player => {
      if (player.isConnected) {
        const playerView = game.getPlayerView(player.id);
        io.to(player.id).emit('game-started', playerView);
      }
    });
  });
}

module.exports = setupBasicWarEvents;