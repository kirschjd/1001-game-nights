// Enhanced HenHur Game Implementation
// Complete game state with rounds, turns, tokens, positions, etc.

const { BASE_CARDS } = require('./cardData');
const { initializePlayerDeck, drawCards, playCard, getDeckStats, shuffleDeck, discardCard } = require('./cardUtils');

/**
 * Enhanced HenHur Game Class
 * Manages complete game state including turns, positions, tokens, burn slots
 */
class HenHurGameEnhanced {
  constructor(options = {}) {
    this.options = options;
    this.state = this.initializeState(options);
  }

  /**
   * Initialize complete game state
   */
  initializeState(options) {
    const players = options.players || [];

    return {
      // Game info
      gameType: 'henhur',
      started: false,
      variant: options.variant || 'standard',

      // Track configuration
      track: {
        trackLength: 30,  // 30 spaces per lap
        lapsToWin: 3
      },

      // Turn management
      turn: {
        roundNumber: 0,
        turnNumber: 0,
        turnType: 'race',  // Start with race turn
        phase: 'waiting',
        raceSelections: new Map(),
        auctionBids: new Map(),
        auctionPool: [],
        auctionOrder: [],
        currentDrafter: null
      },

      // Players
      players: players.map(p => this.initializePlayer(p)),

      // Game configuration
      config: {
        turnsPerRound: 8,
        handSize: 3,
        trackLength: 30,
        lapsToWin: 3,
        maxTokens: 10,
        burnSlots: 3,
        selectedCards: options.selectedCards || []
      },

      // Winner
      winner: null,

      // History
      turnHistory: []
    };
  }

  /**
   * Initialize a player's game state
   */
  initializePlayer(player) {
    return {
      playerId: player.id,
      playerName: player.name,
      isConnected: player.isConnected !== false,

      // Card management
      deck: initializePlayerDeck(player.id, BASE_CARDS),

      // Position on track
      position: {
        playerId: player.id,
        lane: 'middle',  // Start in middle lane
        space: 0,        // Start at space 0
        lap: 1           // Start on lap 1
      },

      // Resources
      tokens: {
        'P+': 0,
        'R+': 0,
        'A+': 0,
        'W+': 0,
        'P+3': 0,
        'D': 0
      },
      maxTokens: 10,

      // Burn slots
      burnSlots: [
        { card: null, slotIndex: 0 },
        { card: null, slotIndex: 1 },
        { card: null, slotIndex: 2 }
      ],

      // Turn state
      selectedCard: null,
      selectedTokens: [],
      willBurn: false,
      isReady: false,

      // Temporary modifiers
      priorityModifier: 0,

      // Stats
      cardsPlayed: 0,
      cardsBurned: 0,
      distanceMoved: 0
    };
  }

  /**
   * Start the game
   */
  start() {
    console.log('🏁 Starting HenHur game...');

    // Deal initial cards (3 per player)
    this.state.players.forEach(player => {
      const result = drawCards(player.deck, this.state.config.handSize);
      player.deck = result.updatedDeck;
      console.log(`  Dealt ${result.drawnCards.length} cards to ${player.playerName}`);
    });

    // Start first turn
    this.state.started = true;
    this.state.turn.roundNumber = 1;
    this.state.turn.turnNumber = 1;
    this.state.turn.turnType = 'race';
    this.state.turn.phase = 'race_selection';

    console.log('✅ Game started - Turn 1 (Race)');
  }

  /**
   * Handle card selection for race turn
   */
  selectCardForRace(playerId, cardId, willBurn, tokensToUse) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (this.state.turn.phase !== 'race_selection') {
      return { success: false, message: 'Not in race selection phase' };
    }

    // Find card in hand
    const card = player.deck.hand.find(c => c.id === cardId);
    if (!card) {
      return { success: false, message: 'Card not in hand' };
    }

    // Validate tokens
    const tokenValidation = this.validateTokenUse(player, tokensToUse);
    if (!tokenValidation.valid) {
      return { success: false, message: tokenValidation.message };
    }

    // Validate burn
    if (willBurn) {
      const availableSlot = player.burnSlots.find(slot => slot.card === null);
      if (!availableSlot) {
        return { success: false, message: 'No burn slots available' };
      }
    }

    // Store selection
    this.state.turn.raceSelections.set(playerId, {
      card,
      willBurn,
      tokensUsed: tokensToUse
    });

    player.selectedCard = card;
    player.selectedTokens = tokensToUse;
    player.willBurn = willBurn;
    player.isReady = true;

    console.log(`✅ ${player.playerName} selected ${card.title} (burn: ${willBurn})`);

    // Check if all players ready
    this.checkAllPlayersReady();

    return { success: true, message: 'Card selected' };
  }

  /**
   * Handle card selection for auction turn
   */
  selectCardForAuction(playerId, cardId, willBurn, tokensToUse) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    if (this.state.turn.phase !== 'auction_selection') {
      return { success: false, message: 'Not in auction selection phase' };
    }

    // Find card in hand
    const card = player.deck.hand.find(c => c.id === cardId);
    if (!card) {
      return { success: false, message: 'Card not in hand' };
    }

    // Validate tokens
    const tokenValidation = this.validateTokenUse(player, tokensToUse);
    if (!tokenValidation.valid) {
      return { success: false, message: tokenValidation.message };
    }

    // Check if card can be burned in auction (needs @ symbol conceptually)
    if (willBurn && card.burnEffect.length === 0) {
      return { success: false, message: 'This card cannot be burned in auctions' };
    }

    // Store bid
    this.state.turn.auctionBids.set(playerId, {
      card,
      willBurn,
      tokensUsed: tokensToUse
    });

    player.selectedCard = card;
    player.selectedTokens = tokensToUse;
    player.willBurn = willBurn;
    player.isReady = true;

    console.log(`✅ ${player.playerName} bid ${card.title} (trick: ${card.trickNumber})`);

    // Check if all players ready
    this.checkAllPlayersReady();

    return { success: true, message: 'Bid placed' };
  }

  /**
   * Draft a card during auction
   */
  draftCard(playerId, cardId) {
    if (this.state.turn.phase !== 'auction_drafting') {
      return { success: false, message: 'Not in auction drafting phase' };
    }

    if (this.state.turn.currentDrafter !== playerId) {
      return { success: false, message: 'Not your turn to draft' };
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    // Find card in auction pool
    const cardIndex = this.state.turn.auctionPool.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
      return { success: false, message: 'Card not in auction pool' };
    }

    const card = this.state.turn.auctionPool[cardIndex];

    // Remove from pool
    this.state.turn.auctionPool.splice(cardIndex, 1);

    // Add to top of player's deck
    player.deck.deck.unshift(card);

    console.log(`✅ ${player.playerName} drafted ${card.title}`);

    // Move to next drafter
    this.advanceAuctionDrafter();

    return { success: true, message: `Drafted ${card.title}` };
  }

  /**
   * Check if all players are ready
   */
  checkAllPlayersReady() {
    const connectedPlayers = this.state.players.filter(p => p.isConnected);
    const readyPlayers = this.state.players.filter(p => p.isReady && p.isConnected);

    if (readyPlayers.length === connectedPlayers.length) {
      console.log('🎯 All players ready - advancing phase');
      this.advancePhase();
    }
  }

  /**
   * Advance to next phase
   */
  advancePhase() {
    const currentPhase = this.state.turn.phase;

    switch (currentPhase) {
      case 'race_selection':
        this.state.turn.phase = 'race_reveal';
        setTimeout(() => this.resolveRaceTurn(), 2000); // 2s reveal delay
        break;

      case 'race_reveal':
        this.state.turn.phase = 'race_resolution';
        this.resolveRaceTurn();
        break;

      case 'auction_selection':
        this.state.turn.phase = 'auction_reveal';
        setTimeout(() => this.resolveAuctionBids(), 2000);
        break;

      case 'auction_reveal':
        this.state.turn.phase = 'auction_drafting';
        this.startAuctionDrafting();
        break;

      case 'auction_drafting':
        // Handled by advanceAuctionDrafter
        break;
    }
  }

  /**
   * Resolve race turn
   */
  resolveRaceTurn() {
    console.log('🏎️  Resolving race turn...');

    // Get all selections
    const selections = Array.from(this.state.turn.raceSelections.entries());

    // Calculate priorities (card priority + modifiers + tokens)
    const withPriorities = selections.map(([playerId, selection]) => {
      const player = this.getPlayer(playerId);
      const basePriority = selection.card.priority;
      const tokenBonus = this.calculatePriorityBonus(selection.tokensUsed);
      const totalPriority = basePriority + player.priorityModifier + tokenBonus;

      return { playerId, player, selection, totalPriority };
    });

    // Sort by priority (highest first)
    withPriorities.sort((a, b) => b.totalPriority - a.totalPriority);

    // Execute in priority order
    withPriorities.forEach(({ playerId, player, selection }) => {
      this.executeRaceCard(player, selection);
    });

    // Check for winner
    this.checkWinCondition();

    // Advance to next turn
    this.advanceToNextTurn();
  }

  /**
   * Execute a race card
   */
  executeRaceCard(player, selection) {
    const { card, willBurn, tokensUsed } = selection;

    console.log(`  ${player.playerName} plays ${card.title}`);

    // Calculate movement
    const baseMovement = card.raceNumber;
    const tokenBonus = this.calculateRaceBonus(tokensUsed);
    const totalMovement = baseMovement + tokenBonus;

    // Move player
    this.movePlayer(player, totalMovement);

    // Remove card from hand
    const cardIndex = player.deck.hand.findIndex(c => c.id === card.id);
    if (cardIndex !== -1) {
      player.deck.hand.splice(cardIndex, 1);
    }

    // Handle burn or discard
    if (willBurn) {
      const slot = player.burnSlots.find(s => s.card === null);
      if (slot) {
        slot.card = card;
        player.cardsBurned++;
        console.log(`    Burned to slot ${slot.slotIndex}`);

        // Execute burn effect
        // TODO: Implement effect execution
      }
    } else {
      player.deck.discard.push(card);
      console.log(`    Discarded`);

      // Execute normal effect
      // TODO: Implement effect execution
    }

    // Use tokens
    tokensUsed.forEach(token => {
      if (player.tokens[token] > 0) {
        player.tokens[token]--;
      }
    });

    // Draw back to hand size
    const cardsToDraw = this.state.config.handSize - player.deck.hand.length;
    if (cardsToDraw > 0) {
      const result = drawCards(player.deck, cardsToDraw);
      player.deck = result.updatedDeck;
    }

    player.cardsPlayed++;
    player.selectedCard = null;
    player.selectedTokens = [];
    player.willBurn = false;
    player.isReady = false;
    player.priorityModifier = 0; // Reset temp modifiers
  }

  /**
   * Move a player on the track
   */
  movePlayer(player, spaces) {
    const oldPosition = { ...player.position };
    const newSpace = player.position.space + spaces;

    // Check lap completion
    if (newSpace >= this.state.track.trackLength) {
      player.position.lap++;
      player.position.space = newSpace - this.state.track.trackLength;
      console.log(`    ${player.playerName} completed lap ${player.position.lap - 1}!`);
    } else {
      player.position.space = newSpace;
    }

    player.distanceMoved += spaces;

    console.log(`    Moved ${spaces} spaces: ${oldPosition.space} → ${player.position.space} (Lap ${player.position.lap})`);
  }

  /**
   * Resolve auction bids and determine draft order
   */
  resolveAuctionBids() {
    console.log('🎪 Resolving auction bids...');

    // Get all bids
    const bids = Array.from(this.state.turn.auctionBids.entries());

    // Calculate trick values (trick number + tokens)
    const withValues = bids.map(([playerId, bid]) => {
      const player = this.getPlayer(playerId);
      const baseTrick = bid.card.trickNumber;
      const tokenBonus = this.calculateAuctionBonus(bid.tokensUsed);
      const totalValue = baseTrick + tokenBonus;

      return { playerId, player, bid, totalValue, basePriority: bid.card.priority };
    });

    // Sort by trick value (highest first), use priority to break ties
    withValues.sort((a, b) => {
      if (b.totalValue !== a.totalValue) {
        return b.totalValue - a.totalValue;
      }
      return b.basePriority - a.basePriority;
    });

    // Set draft order
    this.state.turn.auctionOrder = withValues.map(w => w.playerId);

    console.log('  Draft order:', withValues.map(w => w.player.playerName).join(', '));

    // Discard/burn bid cards and use tokens
    withValues.forEach(({ player, bid }) => {
      const cardIndex = player.deck.hand.findIndex(c => c.id === bid.card.id);
      if (cardIndex !== -1) {
        player.deck.hand.splice(cardIndex, 1);
      }

      if (bid.willBurn) {
        const slot = player.burnSlots.find(s => s.card === null);
        if (slot) {
          slot.card = bid.card;
          player.cardsBurned++;
        }
      } else {
        player.deck.discard.push(bid.card);
      }

      // Use tokens
      bid.tokensUsed.forEach(token => {
        if (player.tokens[token] > 0) {
          player.tokens[token]--;
        }
      });

      player.selectedCard = null;
      player.selectedTokens = [];
      player.willBurn = false;
      player.isReady = false;
    });
  }

  /**
   * Start auction drafting phase
   */
  startAuctionDrafting() {
    // Generate auction pool (# players + 1 cards)
    const numCards = this.state.players.length + 1;

    // Determine current lap (highest lap any player is on)
    const currentLap = Math.max(...this.state.players.map(p => p.position.lap));

    // TODO: Draw from appropriate lap deck
    // For now, just create empty pool
    this.state.turn.auctionPool = [];

    // Set first drafter
    this.state.turn.currentDrafter = this.state.turn.auctionOrder[0];

    console.log(`🎪 Auction drafting started - ${this.state.turn.auctionPool.length} cards available`);
  }

  /**
   * Advance to next drafter
   */
  advanceAuctionDrafter() {
    const currentIndex = this.state.turn.auctionOrder.indexOf(this.state.turn.currentDrafter);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= this.state.turn.auctionOrder.length) {
      // All players have drafted - end auction turn
      console.log('✅ Auction turn complete');
      this.advanceToNextTurn();
    } else {
      this.state.turn.currentDrafter = this.state.turn.auctionOrder[nextIndex];
      console.log(`  Next drafter: ${this.getPlayer(this.state.turn.currentDrafter).playerName}`);
    }
  }

  /**
   * Advance to next turn
   */
  advanceToNextTurn() {
    // Clear turn state
    this.state.turn.raceSelections.clear();
    this.state.turn.auctionBids.clear();
    this.state.turn.auctionPool = [];
    this.state.turn.auctionOrder = [];
    this.state.turn.currentDrafter = null;

    // Increment turn
    this.state.turn.turnNumber++;

    // Check if round is complete
    if (this.state.turn.turnNumber > this.state.config.turnsPerRound) {
      this.state.turn.roundNumber++;
      this.state.turn.turnNumber = 1;
      console.log(`\n🎯 Round ${this.state.turn.roundNumber} starting\n`);
    }

    // Determine turn type (odd = race, even = auction)
    this.state.turn.turnType = (this.state.turn.turnNumber % 2 === 1) ? 'race' : 'auction';
    this.state.turn.phase = this.state.turn.turnType === 'race' ? 'race_selection' : 'auction_selection';

    console.log(`\n📍 Turn ${this.state.turn.turnNumber} - ${this.state.turn.turnType.toUpperCase()}\n`);
  }

  /**
   * Check win condition
   */
  checkWinCondition() {
    const winners = this.state.players.filter(p =>
      p.position.lap > this.state.track.lapsToWin
    );

    if (winners.length > 0) {
      // If multiple players finish same turn, whoever is furthest ahead wins
      winners.sort((a, b) => b.position.space - a.position.space);
      this.state.winner = winners[0].playerId;
      this.state.turn.phase = 'game_over';
      console.log(`\n🏆 ${winners[0].playerName} WINS!\n`);
    }
  }

  /**
   * Validate token use
   */
  validateTokenUse(player, tokens) {
    for (const token of tokens) {
      if (player.tokens[token] <= 0) {
        return { valid: false, message: `Not enough ${token} tokens` };
      }
    }
    return { valid: true };
  }

  /**
   * Calculate priority bonus from tokens
   */
  calculatePriorityBonus(tokens) {
    let bonus = 0;
    tokens.forEach(token => {
      if (token === 'P+') bonus += 1;
      if (token === 'P+3') bonus += 3;
      if (token === 'W+') bonus += 1;
    });
    return bonus;
  }

  /**
   * Calculate race bonus from tokens
   */
  calculateRaceBonus(tokens) {
    let bonus = 0;
    tokens.forEach(token => {
      if (token === 'R+') bonus += 1;
      if (token === 'W+') bonus += 1;
    });
    return bonus;
  }

  /**
   * Calculate auction bonus from tokens
   */
  calculateAuctionBonus(tokens) {
    let bonus = 0;
    tokens.forEach(token => {
      if (token === 'A+') bonus += 1;
      if (token === 'W+') bonus += 1;
    });
    return bonus;
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId) {
    return this.state.players.find(p => p.playerId === playerId);
  }

  /**
   * Update player socket ID (for reconnection)
   */
  updatePlayerSocketId(oldSocketId, newSocketId) {
    const player = this.getPlayer(oldSocketId);
    if (player) {
      player.playerId = newSocketId;
      player.deck.playerId = newSocketId;
      player.position.playerId = newSocketId;
      console.log(`✅ Updated player ID: ${oldSocketId} → ${newSocketId}`);
    }
  }

  /**
   * Get player view for frontend
   */
  getPlayerView(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      console.warn(`Player ${playerId} not found`);
      return null;
    }

    // Get other players' public state
    const otherPlayers = this.state.players
      .filter(p => p.playerId !== playerId)
      .map(p => this.getPlayerPublicState(p));

    // Get ready players
    const readyPlayers = this.state.players
      .filter(p => p.isReady)
      .map(p => p.playerId);

    return {
      type: 'henhur',
      started: this.state.started,
      variant: this.state.variant,

      // Game state
      phase: this.state.turn.phase,
      turnNumber: this.state.turn.turnNumber,
      roundNumber: this.state.turn.roundNumber,
      turnType: this.state.turn.turnType,

      // Track info
      track: this.state.track,

      // My full state
      myState: player,

      // Other players
      otherPlayers,

      // Turn-specific info
      auctionPool: this.state.turn.auctionPool,
      auctionOrder: this.state.turn.auctionOrder,
      currentDrafter: this.state.turn.currentDrafter,

      // Ready status
      readyPlayers,

      // Winner
      winner: this.state.winner
    };
  }

  /**
   * Get public state for a player (what others see)
   */
  getPlayerPublicState(player) {
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      isConnected: player.isConnected,
      position: player.position,
      handCount: player.deck.hand.length,
      deckCount: player.deck.deck.length,
      discardCount: player.deck.discard.length,
      tokens: player.tokens,
      burnSlots: player.burnSlots,
      isReady: player.isReady,
      cardsPlayed: player.cardsPlayed,
      cardsBurned: player.cardsBurned,
      distanceMoved: player.distanceMoved
    };
  }
}

module.exports = HenHurGameEnhanced;