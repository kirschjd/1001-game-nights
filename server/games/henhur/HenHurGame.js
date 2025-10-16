// HenHur Game Framework
// Created: August 2025

const { BASE_CARDS } = require('./cardData');
const { initializePlayerDeck, drawCards, playCard, getDeckStats } = require('./cardUtils');

class HenHurGame {
  constructor(options = {}) {
    this.options = options;
    this.state = {
      started: false,
      players: [],
      playerDecks: {}, // { playerId: PlayerDeck }
      variant: options.variant || 'standard',
      selectedCards: options.selectedCards || [] // Cards selected in lobby
    };
  }

  // Initialize game state
  initialize() {
    const players = this.options.players || [];

    // Initialize player state
    this.state.players = players.map(p => ({
      id: p.id,
      name: p.name,
      isConnected: p.isConnected
    }));

    // Initialize each player's deck with base cards
    players.forEach(player => {
      const deck = initializePlayerDeck(player.id, BASE_CARDS);
      this.state.playerDecks[player.id] = deck;
    });

    console.log('HenHur: Initialized decks for', players.length, 'players');
  }

  // Start the game
  start() {
    this.state.started = true;

    // Draw initial cards for each player (3 cards)
    Object.keys(this.state.playerDecks).forEach(playerId => {
      const result = drawCards(this.state.playerDecks[playerId], 3);
      this.state.playerDecks[playerId] = result.updatedDeck;
      console.log(`HenHur: Player ${playerId} drew ${result.drawnCards.length} cards`);
    });

    console.log('HenHur: Game started, initial cards dealt');
  }

  // Update player ID when they reconnect (called by lobby system)
  updatePlayerSocketId(oldSocketId, newSocketId) {
    // Update player in players array
    const player = this.state.players.find(p => p.id === oldSocketId);
    if (player) {
      player.id = newSocketId;
      console.log(`HenHur: Updated player ID in players array: ${oldSocketId} → ${newSocketId}`);
    }

    // Update player deck mapping
    if (this.state.playerDecks[oldSocketId]) {
      this.state.playerDecks[newSocketId] = this.state.playerDecks[oldSocketId];
      this.state.playerDecks[newSocketId].playerId = newSocketId;
      delete this.state.playerDecks[oldSocketId];
      console.log(`HenHur: Migrated player deck: ${oldSocketId} → ${newSocketId}`);
    } else {
      console.warn(`HenHur: Could not find deck for old socket ID ${oldSocketId}`);
    }
  }

  // Returns player-specific view for frontend display
  getPlayerView(playerId) {
    console.log('HenHur getPlayerView called for player:', playerId);
    console.log('Available player decks:', Object.keys(this.state.playerDecks));

    const playerDeck = this.state.playerDecks[playerId];
    const deckStats = playerDeck ? getDeckStats(playerDeck) : null;

    if (!playerDeck) {
      console.warn('HenHur: No deck found for player', playerId);
    } else {
      console.log('HenHur: Player deck stats:', deckStats);
    }

    const view = {
      type: 'henhur',
      started: this.state.started,
      players: this.state.players,
      variant: this.state.variant,
      // Player's own deck info (full hand visible)
      myDeck: playerDeck ? {
        hand: playerDeck.hand,
        deckCount: playerDeck.deck.length,
        discardCount: playerDeck.discard.length,
        stats: deckStats
      } : null,
      // Other players' deck info (hand count only, not cards)
      otherDecks: Object.keys(this.state.playerDecks)
        .filter(pid => pid !== playerId)
        .reduce((acc, pid) => {
          const deck = this.state.playerDecks[pid];
          const stats = getDeckStats(deck);
          acc[pid] = {
            handCount: stats.handCount,
            deckCount: stats.deckCount,
            discardCount: stats.discardCount
          };
          return acc;
        }, {}),
      message: 'HenHur game started'
    };

    console.log('HenHur: Returning player view with myDeck:', view.myDeck ? 'present' : 'null');
    return view;
  }

  // Handle player actions
  handleAction(playerId, action, payload) {
    switch (action) {
      case 'draw-card':
        return this.handleDrawCard(playerId, payload.count || 1);
      case 'play-card':
        return this.handlePlayCard(playerId, payload.cardId);
      default:
        return { success: false, message: `Unknown action: ${action}` };
    }
  }

  // Handle drawing cards
  handleDrawCard(playerId, count) {
    const playerDeck = this.state.playerDecks[playerId];
    if (!playerDeck) {
      return { success: false, message: 'Player deck not found' };
    }

    const result = drawCards(playerDeck, count);
    this.state.playerDecks[playerId] = result.updatedDeck;

    return {
      success: true,
      message: `Drew ${result.drawnCards.length} card(s)`,
      drawnCards: result.drawnCards
    };
  }

  // Handle playing a card
  handlePlayCard(playerId, cardId) {
    const playerDeck = this.state.playerDecks[playerId];
    if (!playerDeck) {
      return { success: false, message: 'Player deck not found' };
    }

    const result = playCard(playerDeck, cardId);
    if (!result.playedCard) {
      return { success: false, message: 'Card not found in hand' };
    }

    this.state.playerDecks[playerId] = result.updatedDeck;

    return {
      success: true,
      message: `Played ${result.playedCard.title}`,
      playedCard: result.playedCard
    };
  }
}

module.exports = HenHurGame;
