// server/socket/helpers/gameInitHelpers.js
// Helper functions for game initialization

const WarGame = require('../../games/war');
const { DiceFactoryGame: DiceFactoryGameV015 } = require('../../games/dice-factory-v0.1.5');
const { DiceFactoryGame: DiceFactoryGameV021 } = require('../../games/dice-factory-v0.2.1');
const { KillTeamDraftGame } = require('../../games/kill-team-draft');

/**
 * Initialize a War game
 */
function initializeWarGame(connectedPlayers) {
  const game = new WarGame(connectedPlayers);
  game.dealCards();
  return game;
}

/**
 * Initialize a Dice Factory game (version-aware)
 */
function initializeDiceFactoryGame(connectedPlayers, clientVersion, lobby, botSystem) {
  const version = clientVersion || lobby.gameOptions?.version || 'v0.1.5';
  let game;

  // Create game instance based on version
  if (version === 'v0.2.1') {
    game = new DiceFactoryGameV021(connectedPlayers);
  } else {
    // Default to v0.1.5 (full game)
    game = new DiceFactoryGameV015(connectedPlayers);
  }

  // Store version in lobby options
  if (!lobby.gameOptions) {
    lobby.gameOptions = {};
  }
  lobby.gameOptions.version = version;

  game.state.phase = 'playing';

  // Save initial turn state for all players (v0.1.5 only)
  if (version === 'v0.1.5' && game.savePlayerTurnState) {
    connectedPlayers.forEach(player => {
      game.savePlayerTurnState(player.id);
    });
  }

  // Preserve bot flags in game state (v0.1.5 only - v0.2.1 is solo)
  if (version === 'v0.1.5') {
    console.log(`🔧 PRESERVING BOT FLAGS IN DICE FACTORY ${version}:`);
    connectedPlayers.forEach((lobbyPlayer, index) => {
      const gamePlayer = game.state.players[index];
      if (gamePlayer && botSystem.isBot(lobbyPlayer.id)) {
        console.log(`  Setting isBot=true for ${gamePlayer.name} (${gamePlayer.id})`);
        gamePlayer.isBot = true;
        gamePlayer.botStyle = lobbyPlayer.botStyle;
      }
    });
  }

  return game;
}

/**
 * Initialize a HenHur game
 */
function initializeHenHurGame(connectedPlayers, clientVariant, lobby) {
  // Use enhanced HenHur game with full turn system
  const HenHurGameEnhanced = require('../../games/henhur/HenHurGameEnhanced');
  const henhurVariant = clientVariant || lobby.gameOptions?.henhurVariant || 'standard';

  const game = new HenHurGameEnhanced({
    players: connectedPlayers,
    variant: henhurVariant,
    selectedCards: lobby.gameOptions?.selectedCards || []
  });

  game.start();

  return game;
}

/**
 * Initialize a Kill Team Draft game
 */
function initializeKillTeamDraftGame(connectedPlayers, lobby) {
  const packSize = lobby.gameOptions?.packSize || 15;
  const totalPacks = lobby.gameOptions?.totalPacks || 3;

  const game = new KillTeamDraftGame({
    players: connectedPlayers,
    packSize,
    totalPacks
  });

  game.initialize();
  game.start();

  return game;
}

/**
 * Create game based on lobby type
 */
function createGame(lobby, connectedPlayers, clientVariantOrVersion, botSystem) {
  switch (lobby.gameType) {
    case 'war':
      return initializeWarGame(connectedPlayers);

    case 'dice-factory':
      return initializeDiceFactoryGame(connectedPlayers, clientVariantOrVersion, lobby, botSystem);

    case 'henhur':
      return initializeHenHurGame(connectedPlayers, clientVariantOrVersion, lobby);

    case 'kill-team-draft':
      return initializeKillTeamDraftGame(connectedPlayers, lobby);

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
  initializeHenHurGame,
  initializeKillTeamDraftGame
};
