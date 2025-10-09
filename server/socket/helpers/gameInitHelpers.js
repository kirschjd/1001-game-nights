// server/socket/helpers/gameInitHelpers.js
// Helper functions for game initialization

const WarGame = require('../../games/war');
const DiceFactoryGame = require('../../games/dice-factory');

/**
 * Initialize a War game
 */
function initializeWarGame(connectedPlayers) {
  const game = new WarGame(connectedPlayers);
  game.dealCards();
  return game;
}

/**
 * Initialize a Dice Factory game
 */
function initializeDiceFactoryGame(connectedPlayers, clientVariant, lobby, botSystem, experimentalTurnLimit) {
  const variant = clientVariant || lobby.gameVariant || 'standard';
  const game = new DiceFactoryGame(connectedPlayers, variant, experimentalTurnLimit);
  lobby.gameVariant = variant;
  game.state.phase = 'playing';

  // Save initial turn state for all players
  connectedPlayers.forEach(player => {
    game.savePlayerTurnState(player.id);
  });

  // Preserve bot flags in game state
  console.log('🔧 PRESERVING BOT FLAGS IN DICE FACTORY GAME:');
  connectedPlayers.forEach((lobbyPlayer, index) => {
    const gamePlayer = game.state.players[index];
    if (gamePlayer && botSystem.isBot(lobbyPlayer.id)) {
      console.log(`  Setting isBot=true for ${gamePlayer.name} (${gamePlayer.id})`);
      gamePlayer.isBot = true;
      gamePlayer.botStyle = lobbyPlayer.botStyle;
    }
  });

  return game;
}

/**
 * Initialize a HenHur game
 */
function initializeHenHurGame(connectedPlayers, clientVariant, lobby) {
  const HenHurGame = require('../../games/henhur').HenHurGame;
  const henhurVariant = clientVariant || lobby.gameOptions?.henhurVariant || 'standard';
  const game = new HenHurGame({ players: connectedPlayers, variant: henhurVariant });

  game.initialize();
  game.start();

  // Store variant on game state for client views
  if (!game.state) game.state = {};
  game.state.variant = henhurVariant;

  return game;
}

/**
 * Create game based on lobby type
 */
function createGame(lobby, connectedPlayers, clientVariant, botSystem, experimentalTurnLimit) {
  switch (lobby.gameType) {
    case 'war':
      return initializeWarGame(connectedPlayers);

    case 'dice-factory':
      return initializeDiceFactoryGame(connectedPlayers, clientVariant, lobby, botSystem, experimentalTurnLimit);

    case 'henhur':
      return initializeHenHurGame(connectedPlayers, clientVariant, lobby);

    default:
      throw new Error('Invalid game type');
  }
}

/**
 * Broadcast game start to all players
 */
function broadcastGameStart(io, game, connectedPlayers) {
  connectedPlayers.forEach(player => {
    if (player.isConnected) {
      const playerView = game.getPlayerView(player.id);
      io.to(player.id).emit('game-started', playerView);
    }
  });
}

/**
 * Schedule dice factory bots if needed
 */
function scheduleDiceFactoryBotsIfNeeded(io, slug, game, lobbies, botSystem) {
  if (game.state.type !== 'dice-factory' || game.state.phase !== 'playing') {
    return;
  }

  const pendingBots = game.getPendingBotPlayers ? game.getPendingBotPlayers() : [];
  if (pendingBots.length === 0) {
    return;
  }

  console.log(`🤖 Scheduling ${pendingBots.length} dice factory bots`);

  pendingBots.forEach((botPlayer, index) => {
    setTimeout(() => {
      if (!botPlayer.isReady && !botPlayer.hasFled) {
        console.log(`🎮 Executing bot turn for ${botPlayer.name}`);
        botSystem.executeBotTurn(io, slug, game, lobbies, botPlayer.id);
      } else {
        console.log(`⚠️ Bot ${botPlayer.name} no longer needs action`);
      }
    }, index * 1000);
  });
}

module.exports = {
  createGame,
  broadcastGameStart,
  scheduleDiceFactoryBotsIfNeeded,
  initializeWarGame,
  initializeDiceFactoryGame,
  initializeHenHurGame
};
