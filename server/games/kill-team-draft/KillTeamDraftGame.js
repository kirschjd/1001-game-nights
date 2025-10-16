// Kill Team Draft Game Logic
// A card drafting game where players select cards from packs
// Packs pass independently - you only wait for the player passing TO you

class KillTeamDraftGame {
  constructor(options = {}) {
    this.options = options;
    this.state = {
      type: 'kill-team-draft',
      started: false,
      phase: 'drafting', // 'drafting' or 'finished'
      players: [],

      // Configuration
      packSize: options.packSize || 15,
      totalPacks: options.totalPacks || 3,

      // Draft state
      currentPackNumber: 1,
      passingDirection: 'right', // 'right' or 'left'

      // Player data
      playerDecks: {}, // { playerId: [cardIds...] }
      packQueues: {}, // { playerId: [pack1, pack2, ...] } - queued packs waiting to be drafted
      packOrigins: {}, // { playerId: packNumber } - tracks which pack number each queued pack is from

      // Card pool
      cardPool: this.generateCardPool(),

      // Track remaining cards (for ensuring no duplicates across packs)
      remainingCards: [],

      // Track total packs distributed for this round
      packsDistributedThisRound: 0
    };
  }

  // Generate placeholder card pool (A-E, 1-20)
  generateCardPool() {
    const pool = [];
    const letters = ['A', 'B', 'C', 'D', 'E'];

    for (const letter of letters) {
      for (let num = 1; num <= 20; num++) {
        pool.push({
          id: `${letter}${num}`,
          name: `${letter}${num}`,
          letter,
          number: num
        });
      }
    }

    return pool;
  }

  // Initialize game state
  initialize() {
    const players = this.options.players || [];

    // Set up player order
    this.state.players = players.map((p, index) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot || false,
      isConnected: p.isConnected,
      tablePosition: index // Used for passing direction
    }));

    // Initialize empty decks and pack queues
    players.forEach(player => {
      this.state.playerDecks[player.id] = [];
      this.state.packQueues[player.id] = [];
      this.state.packOrigins[player.id] = [];
    });

    console.log('Kill Team Draft: Initialized with', players.length, 'players');
  }

  // Start the game and distribute first packs
  start() {
    this.state.started = true;
    this.state.currentPackNumber = 1;
    this.state.passingDirection = 'right';

    // Initialize remaining cards pool with full card pool
    this.state.remainingCards = [...this.state.cardPool];
    this.shuffleArray(this.state.remainingCards);

    this.distributePacks();

    console.log('Kill Team Draft: Game started, first packs distributed');
  }

  // Distribute new packs to all players
  distributePacks() {
    const { players, packSize } = this.state;
    const totalCardsNeeded = players.length * packSize;

    // Check if we have enough remaining cards
    if (totalCardsNeeded > this.state.remainingCards.length) {
      console.error(`Kill Team Draft: Not enough cards remaining (need ${totalCardsNeeded}, have ${this.state.remainingCards.length})`);
      return;
    }

    // Distribute packs to each player's queue by drawing from remaining cards
    players.forEach((player, index) => {
      // Take the next packSize cards from the remaining pool
      const pack = this.state.remainingCards.splice(0, packSize);
      this.state.packQueues[player.id].push(pack);
      this.state.packOrigins[player.id].push(this.state.currentPackNumber);
    });

    this.state.packsDistributedThisRound = players.length;

    console.log(`Kill Team Draft: Distributed pack ${this.state.currentPackNumber}/${this.state.totalPacks} (${this.state.remainingCards.length} cards remaining in pool)`);
  }

  // Fisher-Yates shuffle
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Get the next player in passing order
  getNextPlayer(currentPlayerIndex) {
    const { players, passingDirection } = this.state;
    let nextIndex;

    if (passingDirection === 'right') {
      nextIndex = (currentPlayerIndex + 1) % players.length;
    } else {
      nextIndex = (currentPlayerIndex - 1 + players.length) % players.length;
    }

    return players[nextIndex];
  }

  // Player selects a card from their current pack
  selectCard(playerId, cardId) {
    const packQueue = this.state.packQueues[playerId];

    if (!packQueue || packQueue.length === 0) {
      return { success: false, error: 'No pack available' };
    }

    // Get the first pack in the queue (the one they're currently drafting from)
    const currentPack = packQueue[0];
    const currentPackOrigin = this.state.packOrigins[playerId][0];

    const card = currentPack.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not in pack' };
    }

    // Add card to player's deck
    this.state.playerDecks[playerId].push(card);

    // Remove card from pack
    const updatedPack = currentPack.filter(c => c.id !== cardId);

    console.log(`Kill Team Draft: Player ${playerId} selected ${cardId} from pack (${updatedPack.length} cards remaining)`);

    // If pack is empty, remove it from queue
    if (updatedPack.length === 0) {
      this.state.packQueues[playerId].shift();
      this.state.packOrigins[playerId].shift();

      this.state.packsDistributedThisRound--;
      console.log(`Kill Team Draft: Pack completed and removed from queue. ${this.state.packsDistributedThisRound} packs remaining this round.`);

      // Check if this round is complete
      if (this.state.packsDistributedThisRound === 0) {
        this.advanceDraft();
      }
    } else {
      // Pack still has cards, pass it to the next player
      this.passSinglePack(playerId, updatedPack, currentPackOrigin);
    }

    return { success: true, packPassed: updatedPack.length > 0 };
  }

  // Pass a single pack from one player to the next
  passSinglePack(fromPlayerId, pack, packOrigin) {
    const playerIndex = this.state.players.findIndex(p => p.id === fromPlayerId);
    const nextPlayer = this.getNextPlayer(playerIndex);

    // Remove the pack from current player's queue
    this.state.packQueues[fromPlayerId].shift();
    this.state.packOrigins[fromPlayerId].shift();

    // Add the pack to the next player's queue
    this.state.packQueues[nextPlayer.id].push(pack);
    this.state.packOrigins[nextPlayer.id].push(packOrigin);

    console.log(`Kill Team Draft: Pack passed from ${fromPlayerId} to ${nextPlayer.id} (${pack.length} cards, queue size: ${this.state.packQueues[nextPlayer.id].length})`);
  }

  // Advance to next pack or end draft
  advanceDraft() {
    this.state.currentPackNumber++;

    if (this.state.currentPackNumber > this.state.totalPacks) {
      // Draft is complete
      this.state.phase = 'finished';
      console.log('Kill Team Draft: Draft complete!');
      return;
    }

    // Switch passing direction
    this.state.passingDirection = this.state.passingDirection === 'right' ? 'left' : 'right';

    console.log(`Kill Team Draft: Starting pack ${this.state.currentPackNumber}, passing ${this.state.passingDirection}`);

    // Distribute next packs
    this.distributePacks();
  }

  // Reset draft (for "draft again" feature)
  resetDraft() {
    // Keep players and configuration, reset draft state
    this.state.currentPackNumber = 1;
    this.state.passingDirection = 'right';
    this.state.phase = 'drafting';
    this.state.packsDistributedThisRound = 0;

    // Reset remaining cards pool
    this.state.remainingCards = [...this.state.cardPool];
    this.shuffleArray(this.state.remainingCards);

    // Clear player decks and queues
    this.state.players.forEach(player => {
      this.state.playerDecks[player.id] = [];
      this.state.packQueues[player.id] = [];
      this.state.packOrigins[player.id] = [];
    });

    // Redistribute packs
    this.distributePacks();

    console.log('Kill Team Draft: Draft reset and restarted');
  }

  // Reorder cards in player's deck
  reorderDeck(playerId, newOrder) {
    // newOrder is array of card IDs in desired order
    const currentDeck = this.state.playerDecks[playerId];

    if (!currentDeck) {
      return { success: false, error: 'No deck found' };
    }

    // Validate that newOrder contains same cards
    if (newOrder.length !== currentDeck.length) {
      return { success: false, error: 'Invalid reorder' };
    }

    // Rebuild deck in new order
    const reorderedDeck = newOrder.map(cardId =>
      currentDeck.find(card => card.id === cardId)
    ).filter(card => card !== undefined);

    if (reorderedDeck.length !== currentDeck.length) {
      return { success: false, error: 'Invalid card IDs in reorder' };
    }

    this.state.playerDecks[playerId] = reorderedDeck;

    return { success: true };
  }

  // Update player ID when they reconnect
  updatePlayerSocketId(oldSocketId, newSocketId) {
    const player = this.state.players.find(p => p.id === oldSocketId);
    if (player) {
      player.id = newSocketId;
    }

    // Update deck mapping
    if (this.state.playerDecks[oldSocketId]) {
      this.state.playerDecks[newSocketId] = this.state.playerDecks[oldSocketId];
      delete this.state.playerDecks[oldSocketId];
    }

    // Update pack queue mapping
    if (this.state.packQueues[oldSocketId]) {
      this.state.packQueues[newSocketId] = this.state.packQueues[oldSocketId];
      delete this.state.packQueues[oldSocketId];
    }

    // Update pack origins mapping
    if (this.state.packOrigins[oldSocketId]) {
      this.state.packOrigins[newSocketId] = this.state.packOrigins[oldSocketId];
      delete this.state.packOrigins[oldSocketId];
    }

    console.log(`Kill Team Draft: Updated player ID: ${oldSocketId} → ${newSocketId}`);
  }

  // Get player-specific view
  getPlayerView(playerId) {
    const myDeck = this.state.playerDecks[playerId] || [];
    const myPackQueue = this.state.packQueues[playerId] || [];
    const myPack = myPackQueue.length > 0 ? myPackQueue[0] : [];
    const packsWaiting = myPackQueue.length - 1; // Number of packs in queue after current

    // Other players' info (hidden)
    const otherPlayers = this.state.players
      .filter(p => p.id !== playerId)
      .map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        deckSize: (this.state.playerDecks[p.id] || []).length,
        packsInQueue: (this.state.packQueues[p.id] || []).length
      }));

    return {
      type: 'kill-team-draft',
      started: this.state.started,
      phase: this.state.phase,
      currentPackNumber: this.state.currentPackNumber,
      totalPacks: this.state.totalPacks,
      passingDirection: this.state.passingDirection,

      myDeck,
      myPack,
      packsWaiting,

      players: this.state.players.map(p => ({
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        tablePosition: p.tablePosition
      })),
      otherPlayers
    };
  }

  // Get full game state (for debugging)
  getGameState() {
    return {
      ...this.state
    };
  }
}

module.exports = KillTeamDraftGame;
