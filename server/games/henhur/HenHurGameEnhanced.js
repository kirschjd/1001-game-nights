// Enhanced HenHur Game Implementation
// Complete game state with rounds, turns, tokens, positions, etc.

const { BASE_CARDS } = require('./cardData');
const { initializePlayerDeck, drawCards, playCard, getDeckStats, shuffleDeck, discardCard } = require('./cardUtils');
const config = require('./gameConfig');
const {
  rollPriority,
  executeEffects,
  calculatePriorityBonus,
  calculateRaceBonus,
  calculateAuctionBonus,
  generateAuctionPool
} = require('./gameUtils');

/**
 * Enhanced HenHur Game Class
 * Manages complete game state including turns, positions, tokens, burn slots
 */
class HenHurGameEnhanced {
  constructor(options = {}) {
    this.options = options;
    this.state = this.initializeState(options);
    this.onStateChange = null; // Callback for broadcasting state changes
  }

  /**
   * Set callback for state changes (called by socket layer)
   */
  setStateChangeCallback(callback) {
    this.onStateChange = callback;
  }

  /**
   * Notify listeners of state change
   */
  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange();
    }
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

      // Track configuration (from gameConfig.js)
      track: {
        trackLength: config.track.spacesPerLap,
        lapsToWin: config.track.lapsToWin
      },

      // Turn management
      turn: {
        roundNumber: 0,
        turnNumber: 0,
        turnType: 'race',  // Start with race turn
        phase: 'waiting',
        raceSelections: new Map(),
        auctionBids: new Map(),
        auctionPool: [],        // Currently visible cards for drafting
        auctionOrder: [],
        currentDrafter: null,
        sharedAuctionDeck: []   // Persistent deck that all players draft from
      },

      // Players
      players: players.map(p => this.initializePlayer(p)),

      // Game configuration (pull from gameConfig.js)
      config: {
        turnsPerRound: config.turns.perRound,
        handSize: config.hand.size,
        trackLength: config.track.spacesPerLap,
        lapsToWin: config.track.lapsToWin,
        maxTokens: config.tokens.maxPerPlayer,
        burnSlots: config.burn.slotsPerPlayer,
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

      // Resources - Use starting tokens from config
      tokens: { ...config.starting.tokens },
      maxTokens: config.tokens.maxPerPlayer,

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

    // Deal initial cards (8 per player)
    this.state.players.forEach(player => {
      const result = drawCards(player.deck, this.state.config.handSize);
      player.deck = result.updatedDeck;
      console.log(`  Dealt ${result.drawnCards.length} cards to ${player.playerName}`);
    });

    // Initialize shared auction deck from Lap 1 cards
    this.initializeSharedAuctionDeck();

    // Reveal first auction pool (so players can see what's coming during race turns)
    this.revealAuctionPool();

    // Start first turn
    this.state.started = true;
    this.state.turn.roundNumber = 1;
    this.state.turn.turnNumber = 1;
    this.state.turn.turnType = 'race';
    this.state.turn.phase = 'race_selection';

    console.log('✅ Game started - Turn 1 (Race)');
  }

  /**
   * Initialize the shared auction deck from available cards
   */
  initializeSharedAuctionDeck() {
    const { LAP1_CARDS } = require('./cardData');
    const { shuffleArray } = require('./gameUtils');

    // Get selected cards (from lobby) or use all Lap 1 cards
    const selectedCardIds = this.state.config.selectedCards || [];

    // Filter to Lap 1 cards that are selected (or all if none selected)
    let eligibleCards = LAP1_CARDS;
    if (selectedCardIds.length > 0) {
      eligibleCards = LAP1_CARDS.filter(c => selectedCardIds.includes(c.id));
    }

    // Expand by copies and create instances
    let deck = [];
    eligibleCards.forEach(card => {
      const copies = card.copies || 2;
      for (let i = 0; i < copies; i++) {
        deck.push({ ...card, instanceId: `${card.id}_${i}_${Date.now()}` });
      }
    });

    // Shuffle the deck
    shuffleArray(deck);

    this.state.turn.sharedAuctionDeck = deck;
    console.log(`  Initialized shared auction deck with ${deck.length} cards`);
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
        this.notifyStateChange(); // Show reveal phase to clients
        setTimeout(() => {
          this.resolveRaceTurn();
          this.notifyStateChange(); // Broadcast after resolution
        }, 2000);
        break;

      case 'race_reveal':
        this.state.turn.phase = 'race_resolution';
        this.resolveRaceTurn();
        this.notifyStateChange();
        break;

      case 'auction_selection':
        this.state.turn.phase = 'auction_reveal';
        this.notifyStateChange(); // Show reveal phase to clients
        setTimeout(() => {
          this.resolveAuctionBids();
          // Transition to drafting phase
          this.state.turn.phase = 'auction_drafting';
          this.startAuctionDrafting();
          this.notifyStateChange(); // Broadcast after resolution
        }, 2000);
        break;

      case 'auction_reveal':
        this.state.turn.phase = 'auction_drafting';
        this.startAuctionDrafting();
        this.notifyStateChange();
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

    // Calculate priorities (roll dice + modifiers + tokens)
    const withPriorities = selections.map(([playerId, selection]) => {
      const player = this.getPlayer(playerId);
      // Roll dice for priority (e.g., { base: 2, dice: 'd8' } becomes 2 + roll)
      const rolledPriority = rollPriority(selection.card.priority);
      const tokenBonus = calculatePriorityBonus(selection.tokensUsed);
      const totalPriority = rolledPriority + player.priorityModifier + tokenBonus;

      console.log(`    ${player.playerName}: priority ${rolledPriority} + ${tokenBonus} tokens = ${totalPriority}`);
      return { playerId, player, selection, totalPriority, rolledPriority };
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
    const tokenBonus = calculateRaceBonus(tokensUsed);
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

        // Execute burn effects
        if (card.burnEffect && card.burnEffect.length > 0) {
          const context = { player, gameState: this.state, isBurn: true };
          const results = executeEffects(card.burnEffect, context);
          results.forEach(r => console.log(`      Effect: ${r.message}`));
        }
      }
    } else {
      player.deck.discard.push(card);
      console.log(`    Discarded`);

      // Execute normal card effects
      if (card.effect && card.effect.length > 0) {
        const context = { player, gameState: this.state, isBurn: false };
        const results = executeEffects(card.effect, context);
        results.forEach(r => console.log(`      Effect: ${r.message}`));
      }
    }

    // Use tokens
    tokensUsed.forEach(token => {
      if (player.tokens[token] > 0) {
        player.tokens[token]--;
      }
    });

    // Only refill hand when completely empty
    if (player.deck.hand.length === 0) {
      const result = drawCards(player.deck, this.state.config.handSize);
      player.deck = result.updatedDeck;
      console.log(`    Hand empty - drew ${result.drawnCards.length} new cards`);
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
      const tokenBonus = calculateAuctionBonus(bid.tokensUsed);
      const totalValue = baseTrick + tokenBonus;
      // Roll priority for tie-breaking
      const rolledPriority = rollPriority(bid.card.priority);

      console.log(`    ${player.playerName}: trick ${baseTrick} + ${tokenBonus} = ${totalValue} (priority: ${rolledPriority})`);
      return { playerId, player, bid, totalValue, rolledPriority };
    });

    // Sort by trick value (highest first), use rolled priority to break ties
    withValues.sort((a, b) => {
      if (b.totalValue !== a.totalValue) {
        return b.totalValue - a.totalValue;
      }
      return b.rolledPriority - a.rolledPriority;
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

      // Check for hand refill (if hand is empty after bidding)
      if (player.deck.hand.length === 0) {
        const result = drawCards(player.deck, this.state.config.handSize);
        player.deck = result.updatedDeck;
        console.log(`    ${player.playerName} hand empty - drew ${result.drawnCards.length} new cards`);
      }

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
    // Cards are already revealed in auctionPool (done at start of auction turn)
    // Just set the first drafter
    this.state.turn.currentDrafter = this.state.turn.auctionOrder[0];

    console.log(`🎪 Auction drafting started - ${this.state.turn.auctionPool.length} cards available`);
    console.log(`    First drafter: ${this.getPlayer(this.state.turn.currentDrafter).playerName}`);
  }

  /**
   * Refill the shared auction deck when it runs low
   */
  refillSharedAuctionDeck() {
    const { LAP1_CARDS, LAP2_CARDS, LAP3_CARDS } = require('./cardData');
    const { shuffleArray } = require('./gameUtils');

    // Determine current lap (highest lap any player is on)
    const highestLap = Math.max(...this.state.players.map(p => p.position.lap));
    const availableDecks = config.auction.getAvailableDecks(highestLap);

    // Collect cards from available decks
    let newCards = [];
    if (availableDecks.includes('lap1')) {
      newCards = newCards.concat(LAP1_CARDS);
    }
    if (availableDecks.includes('lap2')) {
      newCards = newCards.concat(LAP2_CARDS);
    }
    if (availableDecks.includes('lap3')) {
      newCards = newCards.concat(LAP3_CARDS);
    }

    // Expand by copies
    let expandedCards = [];
    newCards.forEach(card => {
      const copies = card.copies || 2;
      for (let i = 0; i < copies; i++) {
        expandedCards.push({ ...card, instanceId: `${card.id}_refill_${i}_${Date.now()}` });
      }
    });

    // Shuffle and add to deck
    shuffleArray(expandedCards);
    this.state.turn.sharedAuctionDeck = this.state.turn.sharedAuctionDeck.concat(expandedCards);
    console.log(`  Refilled shared deck with ${expandedCards.length} cards (total: ${this.state.turn.sharedAuctionDeck.length})`);
  }

  /**
   * Advance to next drafter
   */
  advanceAuctionDrafter() {
    const currentIndex = this.state.turn.auctionOrder.indexOf(this.state.turn.currentDrafter);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= this.state.turn.auctionOrder.length) {
      // All players have drafted - discard remaining card(s) and end auction turn
      if (this.state.turn.auctionPool.length > 0) {
        console.log(`  Discarding ${this.state.turn.auctionPool.length} undrafted card(s):`);
        this.state.turn.auctionPool.forEach(card => {
          console.log(`    - ${card.title} (discarded)`);
        });
        this.state.turn.auctionPool = []; // Discard, don't return to deck
      }
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
    this.state.turn.auctionOrder = [];
    this.state.turn.currentDrafter = null;
    // Note: auctionPool is NOT cleared here - it stays visible until next auction

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

    // If auction turn, reveal the next cards for drafting
    if (this.state.turn.turnType === 'auction') {
      this.revealAuctionPool();
    }

    console.log(`\n📍 Turn ${this.state.turn.turnNumber} - ${this.state.turn.turnType.toUpperCase()}\n`);
  }

  /**
   * Reveal cards for the upcoming auction (so players can plan during race turn)
   */
  revealAuctionPool() {
    const numCards = this.state.players.length + 1;

    // Check if we have enough cards in the shared deck
    if (this.state.turn.sharedAuctionDeck.length < numCards) {
      console.log(`⚠️ Shared auction deck low (${this.state.turn.sharedAuctionDeck.length} cards) - refilling`);
      this.refillSharedAuctionDeck();
    }

    // Draw cards from the top of the shared deck
    this.state.turn.auctionPool = this.state.turn.sharedAuctionDeck.splice(0, numCards);

    console.log(`👁️ Revealed ${this.state.turn.auctionPool.length} cards for auction:`);
    this.state.turn.auctionPool.forEach(card => {
      console.log(`    - ${card.title} (T:${card.trickNumber}, R:${card.raceNumber})`);
    });
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

  // Token bonus calculations now imported from gameUtils.js

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