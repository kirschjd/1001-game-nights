// server/socket/helpers/gameInitHelpers.js
// Helper functions for game initialization

const WarGame = require('../../games/war');
const { initializeVersioning } = require('./stateVersioning');
const { DiceFactoryGame: DiceFactoryGameV015 } = require('../../games/dice-factory-v0.1.5');
const { DiceFactoryGame: DiceFactoryGameV021 } = require('../../games/dice-factory-v0.2.1');
const { KillTeamDraftGame } = require('../../games/kill-team-draft');
const { HeistCityGame } = require('../../games/heist-city');
const { BadukAnalysis } = require('../../games/baduk-analysis');

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
    const abilityTiers = lobby.gameOptions?.abilityTiers || [1, 2, 3, 4];
    const selectedAbilities = lobby.gameOptions?.selectedAbilities || null;
    game = new DiceFactoryGameV021(connectedPlayers, abilityTiers, selectedAbilities);
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
 * Initialize a Heist City game
 */
function initializeHeistCityGame(connectedPlayers, lobby) {
  // Get selected map from lobby options
  const mapId = lobby.gameOptions?.mapId || 'bank-job';

  // For now, we'll use a basic game class
  // Map loading happens on client-side using mapLoader.ts
  const game = {
    state: {
      type: 'heist-city',
      phase: 'playing',
      mapId: mapId, // Pass map ID to client
      gridType: 'hex', // Default to hex grid
      players: connectedPlayers.map(p => ({
        id: p.id,
        name: p.name,
        isConnected: p.isConnected
      })),
      mapState: null // Will be managed client-side
    },
    getPlayerView: function(playerId) {
      return this.state;
    }
  };

  return game;
}

/**
 * Initialize a Baduk Analysis game
 */
function initializeBadukAnalysisGame(connectedPlayers, lobby) {
  const komi = lobby.gameOptions?.komi || 6.5;
  const handicap = lobby.gameOptions?.handicap || 0;

  const game = new BadukAnalysis({
    players: connectedPlayers,
    komi,
    handicap
  });

  return game;
}

/**
 * Create game based on lobby type
 */
function createGame(lobby, connectedPlayers, clientVariantOrVersion, botSystem) {
  let game;

  switch (lobby.gameType) {
    case 'war':
      game = initializeWarGame(connectedPlayers);
      break;

    case 'dice-factory':
      game = initializeDiceFactoryGame(connectedPlayers, clientVariantOrVersion, lobby, botSystem);
      break;

    case 'henhur':
      game = initializeHenHurGame(connectedPlayers, clientVariantOrVersion, lobby);
      break;

    case 'kill-team-draft':
      game = initializeKillTeamDraftGame(connectedPlayers, lobby);
      break;

    case 'heist-city':
      game = initializeHeistCityGame(connectedPlayers, lobby);
      break;

    case 'baduk-analysis':
      game = initializeBadukAnalysisGame(connectedPlayers, lobby);
      break;

    default:
      throw new Error('Invalid game type');
  }

  // Initialize version tracking for all games
  if (game && game.state) {
    initializeVersioning(game.state);
    console.log(`📊 Initialized version tracking for ${lobby.gameType} game (version: ${game.state.version})`);
  }

  return game;
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
  initializeKillTeamDraftGame,
  initializeHeistCityGame,
  initializeBadukAnalysisGame
};
