// 1001 Game Nights - Dice Factory Game Logic
// Version: 0.2.1 - Minimal version with slot-based abilities
// Updated: October 2025

const fs = require('fs');
const path = require('path');

// Load factory cards
const cardDataPath = path.join(__dirname, 'factoryCards.json');
const FACTORY_CARDS = JSON.parse(fs.readFileSync(cardDataPath, 'utf8'));

// Load ability decks
const abilityDecksPath = path.join(__dirname, 'abilityDecks.json');
const ABILITY_DECKS = JSON.parse(fs.readFileSync(abilityDecksPath, 'utf8'));

class DiceFactoryGame {
  constructor(players) {
    // Shuffle players and determine turn order
    const shuffledPlayers = this.shuffleArray([...players]);
    const turnOrder = shuffledPlayers.map(p => p.id);

    this.state = {
      type: 'dice-factory',
      version: 'v0.2.1',
      phase: 'playing',
      round: 1,
      gameLog: [],

      // Multiplayer state
      players: shuffledPlayers.map(p => ({
        id: p.id,
        name: p.name,
        dicePool: this.createInitialDicePool(),
        exhaustedDice: [],
        slots: {
          1: 'recruit', 2: 'reroll', 3: 'bump', 4: 'promote',
          5: null, 6: null, 7: null, 8: null,
          9: null, 10: null, 11: null, 12: null
        },
        cards: [],
        exhaustedCards: [],
        victoryPoints: 0,
        hasPassed: false
      })),

      // Turn order and tracking
      turnOrder: turnOrder, // Array of player IDs in turn order
      currentPlayerIndex: 0, // Index into turnOrder
      startingPlayerIndex: 0, // Starting player for this round
      actionsRemaining: 2, // Actions left for current player's move

      // Shared tier 0 abilities (always available to all)
      tier0Abilities: [
        { id: 'recruit', name: 'Recruit', tier: 0, costCount: 1, needsTarget: false, exhaustTarget: false, effect: 'recruit' },
        { id: 'reroll', name: 'Reroll', tier: 0, costCount: 1, needsTarget: true, exhaustTarget: false, effect: 'reroll' },
        { id: 'bump', name: 'Bump', tier: 0, costCount: 1, needsTarget: true, exhaustTarget: false, needsDirection: true, effect: 'bump' },
        { id: 'promote', name: 'Promote', tier: 0, costCount: 1, needsTarget: true, exhaustTarget: true, effect: 'promote' }
      ],

      // Available abilities from tier 1-4 (3 drawn from each tier, shared)
      availableTier1Abilities: [],
      availableTier2Abilities: [],
      availableTier3Abilities: [],
      availableTier4Abilities: [],

      // Factory Decks system (shared)
      deck1: [],
      deck2: [],
      deck3: [],
      availableCards: [] // 4 cards from each deck (12 total)
    };

    // Initialize decks and deal cards
    this.initializeDecks();
    this.dealInitialCards();

    // Initialize ability tiers
    this.initializeAbilityTiers();

    // Roll initial dice for all players
    this.rollAllPlayerDice();

    const startingPlayer = this.getCurrentPlayer();
    this.addLog('=== DICE FACTORY v0.2.1 (Multiplayer + Action System) ===');
    this.addLog(`Turn order: ${this.state.players.map(p => p.name).join(' → ')}`);
    this.addLog(`${startingPlayer.name} is the starting player!`);
    this.addLog('Each move: take 2 actions, then play passes to next player.');
  }

  // ===== HELPER METHODS =====

  createInitialDicePool() {
    return [
      { id: this.generateId(), size: 4, value: 1 },
      { id: this.generateId(), size: 4, value: 1 },
      { id: this.generateId(), size: 4, value: 1 },
      { id: this.generateId(), size: 4, value: 1 },
    ];
  }

  generateId() {
    return `die_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  rollDie(size) {
    return Math.floor(Math.random() * size) + 1;
  }

  rollAllDice(player) {
    for (const die of player.dicePool) {
      die.value = this.rollDie(die.size);
    }
  }

  rollAllPlayerDice() {
    for (const player of this.state.players) {
      this.rollAllDice(player);
    }
  }

  // ===== PLAYER MANAGEMENT =====

  getPlayer(playerId) {
    return this.state.players.find(p => p.id === playerId);
  }

  getCurrentPlayer() {
    const currentPlayerId = this.state.turnOrder[this.state.currentPlayerIndex];
    return this.getPlayer(currentPlayerId);
  }

  getStartingPlayer() {
    const startingPlayerId = this.state.turnOrder[this.state.startingPlayerIndex];
    return this.getPlayer(startingPlayerId);
  }

  // Update player socket ID (called when player reconnects with new socket ID)
  updatePlayerSocketId(oldSocketId, newSocketId) {
    // Update in players array
    const player = this.state.players.find(p => p.id === oldSocketId);
    if (player) {
      player.id = newSocketId;
    }

    // Update in turnOrder array
    const turnIndex = this.state.turnOrder.indexOf(oldSocketId);
    if (turnIndex !== -1) {
      this.state.turnOrder[turnIndex] = newSocketId;
    }

    console.log(`🎲 Updated DiceFactory player socket ID: ${oldSocketId} → ${newSocketId}`);
  }

  // Get next non-passed player index
  getNextPlayerIndex() {
    let nextIndex = (this.state.currentPlayerIndex + 1) % this.state.turnOrder.length;
    let checked = 0;

    while (checked < this.state.turnOrder.length) {
      const playerId = this.state.turnOrder[nextIndex];
      const player = this.getPlayer(playerId);

      if (!player.hasPassed) {
        return nextIndex;
      }

      nextIndex = (nextIndex + 1) % this.state.turnOrder.length;
      checked++;
    }

    return null; // All players have passed
  }

  advanceToNextPlayer() {
    const nextIndex = this.getNextPlayerIndex();

    if (nextIndex === null) {
      // All players have passed - end the round
      this.endRound();
      return { roundEnded: true };
    }

    this.state.currentPlayerIndex = nextIndex;
    this.state.actionsRemaining = 2;

    const nextPlayer = this.getCurrentPlayer();
    this.addLog(`--- ${nextPlayer.name}'s move (2 actions) ---`);

    return { roundEnded: false, currentPlayer: nextPlayer };
  }

  consumeAction() {
    this.state.actionsRemaining--;

    if (this.state.actionsRemaining <= 0) {
      // Move is over, advance to next player
      return this.advanceToNextPlayer();
    }

    return { roundEnded: false, actionsRemaining: this.state.actionsRemaining };
  }

  passTurn(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (player.hasPassed) {
      return { success: false, error: 'You have already passed' };
    }

    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    player.hasPassed = true;
    this.addLog(`${player.name} has passed`);

    // Advance to next player
    const result = this.advanceToNextPlayer();

    return { success: true, state: this.getGameState(), ...result };
  }

  endRound() {
    this.addLog(`=== END OF ROUND ${this.state.round} ===`);

    // Refresh all players
    for (const player of this.state.players) {
      this.rollAllDice(player);
      player.exhaustedDice = [];
      player.exhaustedCards = [];
      player.hasPassed = false;
    }

    // Advance round and rotate starting player
    this.state.round++;
    this.state.startingPlayerIndex = (this.state.startingPlayerIndex + 1) % this.state.turnOrder.length;
    this.state.currentPlayerIndex = this.state.startingPlayerIndex;
    this.state.actionsRemaining = 2;

    const newStartingPlayer = this.getStartingPlayer();
    this.addLog(`=== ROUND ${this.state.round} ===`);
    this.addLog(`${newStartingPlayer.name} is the starting player`);
    this.addLog(`--- ${newStartingPlayer.name}'s move (2 actions) ---`);
  }

  addLog(message) {
    this.state.gameLog.push({
      round: this.state.round,
      message: message,
      timestamp: Date.now()
    });
  }

  getDie(dieId, player) {
    return player.dicePool.find(d => d.id === dieId);
  }

  isDieExhausted(dieId, player) {
    return player.exhaustedDice.includes(dieId);
  }

  exhaustDie(dieId, player) {
    if (!player.exhaustedDice.includes(dieId)) {
      player.exhaustedDice.push(dieId);
    }
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // ===== FACTORY DECK METHODS =====

  initializeDecks() {
    // Load and shuffle each deck
    this.state.deck1 = this.shuffleArray([...FACTORY_CARDS.deck1]);
    this.state.deck2 = this.shuffleArray([...FACTORY_CARDS.deck2]);
    this.state.deck3 = this.shuffleArray([...FACTORY_CARDS.deck3]);
  }

  dealInitialCards() {
    // Deal 4 cards from each deck to the center
    for (let i = 0; i < 4; i++) {
      if (this.state.deck1.length > 0) {
        this.state.availableCards.push({ ...this.state.deck1.shift(), deckSource: 1 });
      }
      if (this.state.deck2.length > 0) {
        this.state.availableCards.push({ ...this.state.deck2.shift(), deckSource: 2 });
      }
      if (this.state.deck3.length > 0) {
        this.state.availableCards.push({ ...this.state.deck3.shift(), deckSource: 3 });
      }
    }
  }

  initializeAbilityTiers() {
    // Draw 3 abilities from each tier deck
    const tier1Shuffled = this.shuffleArray([...ABILITY_DECKS.tier1]);
    const tier2Shuffled = this.shuffleArray([...ABILITY_DECKS.tier2]);
    const tier3Shuffled = this.shuffleArray([...ABILITY_DECKS.tier3]);
    const tier4Shuffled = this.shuffleArray([...ABILITY_DECKS.tier4]);

    this.state.availableTier1Abilities = tier1Shuffled.slice(0, 3);
    this.state.availableTier2Abilities = tier2Shuffled.slice(0, 3);
    this.state.availableTier3Abilities = tier3Shuffled.slice(0, 3);
    this.state.availableTier4Abilities = tier4Shuffled.slice(0, 3);
  }

  replaceCard(cardId) {
    // Find which deck this card came from
    const cardIndex = this.state.availableCards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return;

    const card = this.state.availableCards[cardIndex];
    const deckSource = card.deckSource;

    // Remove the card from available
    this.state.availableCards.splice(cardIndex, 1);

    // Replace with a new card from the same deck
    let newCard = null;
    if (deckSource === 1 && this.state.deck1.length > 0) {
      newCard = { ...this.state.deck1.shift(), deckSource: 1 };
    } else if (deckSource === 2 && this.state.deck2.length > 0) {
      newCard = { ...this.state.deck2.shift(), deckSource: 2 };
    } else if (deckSource === 3 && this.state.deck3.length > 0) {
      newCard = { ...this.state.deck3.shift(), deckSource: 3 };
    }

    if (newCard) {
      this.state.availableCards.push(newCard);
    }
  }

  getCard(cardId, player) {
    return this.state.availableCards.find(c => c.id === cardId) ||
           (player ? player.cards.find(c => c.id === cardId) : null);
  }

  isCardExhausted(cardId, player) {
    return player.exhaustedCards.includes(cardId);
  }

  exhaustCard(cardId, player) {
    if (!player.exhaustedCards.includes(cardId)) {
      player.exhaustedCards.push(cardId);
    }
  }

  // ===== SLOT MANAGEMENT =====

  /**
   * Calculate dynamic cost for recruit ability
   * Base cost: 1 die
   * Additional cost: +1 die for each die in pool over 5
   * Examples: 5 dice = cost 1, 6 dice = cost 2, 7 dice = cost 3, etc.
   */
  getRecruitCost(player) {
    return 1 + Math.max(0, player.dicePool.length - 5);
  }

  /**
   * Calculate cost for Targeted Recruit (recruit limit + 1)
   */
  getTargetedRecruitCost(player) {
    return 1 + Math.max(0, player.dicePool.length - 6);
  }

  /**
   * Calculate cost for Recruit + (recruit limit + 2)
   */
  getRecruitPlusCost(player) {
    return 1 + Math.max(0, player.dicePool.length - 7);
  }

  /**
   * Get the tier of a slot
   * Tier 0: slots 1-4
   * Tier 1: slots 5-6
   * Tier 2: slots 7-8
   * Tier 3: slots 9-10
   * Tier 4: slots 11-12
   */
  getSlotTier(slotNumber) {
    if (slotNumber >= 1 && slotNumber <= 4) return 0;
    if (slotNumber >= 5 && slotNumber <= 6) return 1;
    if (slotNumber >= 7 && slotNumber <= 8) return 2;
    if (slotNumber >= 9 && slotNumber <= 10) return 3;
    if (slotNumber >= 11 && slotNumber <= 12) return 4;
    return null;
  }

  /**
   * Get all available abilities (from all tiers)
   */
  getAllAvailableAbilities() {
    return [
      ...this.state.tier0Abilities,
      ...this.state.availableTier1Abilities,
      ...this.state.availableTier2Abilities,
      ...this.state.availableTier3Abilities,
      ...this.state.availableTier4Abilities
    ];
  }

  /**
   * Find an ability by its ID
   */
  getAbilityById(abilityId) {
    const allAbilities = this.getAllAvailableAbilities();
    return allAbilities.find(a => a.id === abilityId);
  }

  /**
   * Assign an ability to a slot
   */
  assignSlot(playerId, slotNumber, abilityId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (slotNumber < 1 || slotNumber > 12) {
      return { success: false, error: 'Slot must be between 1 and 12' };
    }

    // Allow clearing a slot
    if (!abilityId) {
      player.slots[slotNumber] = null;
      this.addLog(`${player.name} cleared slot ${slotNumber}`);
      return { success: true, state: this.getGameState() };
    }

    // Find the ability
    const ability = this.getAbilityById(abilityId);
    if (!ability) {
      return { success: false, error: 'Ability not found' };
    }

    // Check tier restrictions
    const slotTier = this.getSlotTier(slotNumber);
    if (ability.tier > slotTier) {
      return { success: false, error: `Tier ${ability.tier} abilities can only be assigned to tier ${ability.tier}+ slots` };
    }

    player.slots[slotNumber] = abilityId;
    this.addLog(`${player.name} assigned ${ability.name} to slot ${slotNumber}`);

    return { success: true, state: this.getGameState() };
  }

  /**
   * Find which slot has an ability (returns first match)
   */
  findSlotForAbility(player, abilityName) {
    for (let slot = 1; slot <= 12; slot++) {
      if (player.slots[slot] === abilityName) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Validate that cost dice match the required slot values
   */
  validateCostDice(costDiceIds, requiredSlot, player, totalCostRequired = 1) {
    for (const dieId of costDiceIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { valid: false, error: `Die ${dieId} not found` };
      }
      if (this.isDieExhausted(dieId, player)) {
        return { valid: false, error: `Die is already exhausted this turn` };
      }
      if (die.value !== requiredSlot) {
        return { valid: false, error: `Cost die must have value ${requiredSlot}` };
      }
    }
    return { valid: true };
  }

  // ===== GAME ACTIONS (New slot-based system) =====

  /**
   * Execute an ability using cost and target dice
   * @param {string} playerId - ID of player executing the ability
   * @param {string} abilityId - ID of ability to execute
   * @param {number} slotNumber - Slot number that was clicked
   * @param {string[]} costDiceIds - Array of dice IDs used as cost
   * @param {string[]} costCardIds - Array of card IDs used as virtual dice cost
   * @param {string|string[]} targetDieId - ID(s) of target die/dice (optional, can be single or array)
   * @param {number} targetValue - Target value for setValue (optional)
   * @param {string} bumpDirection - 'up' or 'down' for bump ability (optional)
   * @param {number} bumpAmount - Amount to bump for bumpUp/bumpDown (1-3, optional)
   */
  executeAbility(playerId, abilityId, slotNumber, costDiceIds, costCardIds = [], targetDieId = null, targetValue = null, bumpDirection = 'up', bumpAmount = 1) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Normalize targetDieId to always be an array for multi-target abilities
    const targetDieIds = Array.isArray(targetDieId) ? targetDieId : (targetDieId ? [targetDieId] : []);

    // Validate slot number is provided
    if (slotNumber === null || slotNumber === undefined || typeof slotNumber !== 'number') {
      return { success: false, error: 'Slot number is required' };
    }

    // Validate the ability is in the specified slot
    const abilityInSlot = player.slots[slotNumber];
    if (!abilityInSlot || abilityInSlot !== abilityId) {
      return { success: false, error: `${abilityId} is not assigned to slot ${slotNumber}` };
    }

    // Use the provided slot number
    const slot = slotNumber;

    // Get ability definition
    const ability = this.getAbilityById(abilityId);
    if (!ability) {
      return { success: false, error: `Unknown ability: ${abilityId}` };
    }

    // Define ability requirements for tier 0 abilities
    const tier0AbilityDefs = {
      recruit: { costCount: 1, needsTarget: false, exhaustTarget: false, effect: 'recruit' },
      promote: { costCount: 1, needsTarget: true, exhaustTarget: true, effect: 'promote' },
      reroll: { costCount: 1, needsTarget: true, exhaustTarget: false, effect: 'reroll' },
      bump: { costCount: 1, needsTarget: true, exhaustTarget: false, effect: 'bump' },
      bumpUp: { costCount: 2, needsTarget: true, exhaustTarget: false, effect: 'bumpUp' },
      bumpDown: { costCount: 1, needsTarget: true, exhaustTarget: false, effect: 'bumpDown' },
      setValue: { costCount: 1, needsTarget: true, exhaustTarget: false, needsValue: true, effect: 'setValue' }
    };

    // Use tier 0 def if it exists, otherwise use the ability's config
    let def;
    if (tier0AbilityDefs[abilityId]) {
      def = tier0AbilityDefs[abilityId];
    } else {
      // For tier 1-4 abilities, use their configuration from the JSON
      def = {
        costCount: ability.costCount,
        needsTarget: ability.needsTarget,
        exhaustTarget: ability.exhaustTarget,
        multiTarget: ability.multiTarget,
        maxTargets: ability.maxTargets,
        effect: ability.effect
      };
    }

    // Calculate dynamic cost for recruit and variants
    let requiredCost = def.costCount;
    if (abilityId === 'recruit') {
      requiredCost = this.getRecruitCost(player);
    } else if (ability.effect === 'targetedRecruit') {
      requiredCost = this.getTargetedRecruitCost(player);
    } else if (ability.effect === 'recruitPlus') {
      requiredCost = this.getRecruitPlusCost(player);
    }

    // Validate total cost count (dice + cards)
    const totalCost = costDiceIds.length + costCardIds.length;
    if (totalCost !== requiredCost) {
      return { success: false, error: `${ability.name} requires ${requiredCost} cost items` };
    }

    // Validate cost dice values match slot
    // For abilities requiring multiple dice, only one needs to match the slot
    const costValidation = this.validateCostDice(costDiceIds, slot, player, requiredCost);
    if (!costValidation.valid) {
      return { success: false, error: costValidation.error };
    }

    // Validate cost cards - must have slot value in their diceNumbers
    for (const cardId of costCardIds) {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        return { success: false, error: 'Card not found in your cards' };
      }
      if (this.isCardExhausted(cardId, player)) {
        return { success: false, error: 'Card is already exhausted' };
      }
      if (!card.effects.diceNumbers || !card.effects.diceNumbers.includes(slot)) {
        return { success: false, error: `Card must have dice number ${slot}` };
      }
    }

    // Validate target die(s) if needed
    if (def.needsTarget) {
      if (targetDieIds.length === 0) {
        return { success: false, error: `${ability.name} requires a target die` };
      }

      // Check if this is a multi-target ability
      if (def.multiTarget && def.maxTargets) {
        if (targetDieIds.length > def.maxTargets) {
          return { success: false, error: `${ability.name} can only target up to ${def.maxTargets} dice` };
        }
      }

      // Validate all target dice exist
      for (const dieId of targetDieIds) {
        const die = this.getDie(dieId, player);
        if (!die) {
          return { success: false, error: 'Target die not found' };
        }
      }
    }

    // Validate target value if needed
    if (def.needsValue && (targetValue === null || targetValue === undefined)) {
      return { success: false, error: `${ability.name} requires a target value` };
    }

    // Execute the ability based on its effect
    let result;
    switch (def.effect) {
      case 'recruit':
        result = this.recruitDie(player);
        break;
      case 'promote':
        result = this.promoteDie(targetDieIds[0], player);
        break;
      case 'reroll':
        result = this.rerollDie(targetDieIds[0], player);
        break;
      case 'bump':
        result = this.bumpDie(targetDieIds[0], bumpDirection, player);
        break;
      case 'bumpUp':
        result = this.bumpUpDie(targetDieIds[0], bumpAmount, player);
        break;
      case 'bumpDown':
        result = this.bumpDownDie(targetDieIds[0], bumpAmount, player);
        break;
      case 'setValue':
        result = this.setDieValue(targetDieIds[0], targetValue, player);
        break;
      // Tier 1 abilities
      case 'massReroll':
        result = this.massReroll(targetDieIds, player);
        break;
      case 'attack':
        result = this.attack(player);
        break;
      case 'massBump':
        result = this.massBump(targetDieIds, bumpDirection, player);
        break;
      case 'twosReroll':
        result = this.twosReroll(player);
        break;
      // Tier 2 abilities
      case 'score':
        result = this.score(player);
        break;
      case 'targetedRecruit':
        result = this.targetedRecruit(targetDieIds[0], player);
        break;
      case 'recruitPlus':
        result = this.recruitPlusAbility(player);
        break;
      case 'attackPlus':
        result = this.attackPlus(player);
        break;
      case 'unexhaust':
        result = this.unexhaustDie(targetDieIds[0], player);
        break;
      case 'swapSlots':
        // For swapSlots, we need slot numbers not die IDs - handled separately
        return { success: false, error: 'Swap Slots must be handled via separate endpoint' };
      // Tier 3 abilities
      case 'scorePlus':
        result = this.scorePlus(player);
        break;
      case 'massBumpPlus':
        result = this.massBumpPlus(targetDieIds, bumpDirection, bumpAmount, player);
        break;
      case 'massRerollPlus':
        result = this.massRerollPlus(targetDieIds, player);
        break;
      case 'clearSlot':
        // For clearSlot, we need slot number - handled separately
        return { success: false, error: 'Clear Slot must be handled via separate endpoint' };
      case 'cardUnexhaust':
        // For cardUnexhaust, we need card ID - handled separately
        return { success: false, error: 'Card Unexhaust must be handled via separate endpoint' };
      case 'selectValue':
        result = this.setDieValue(targetDieIds[0], targetValue, player);
        break;
      // Tier 4 abilities
      case 'scorePlusPlus':
        result = this.scorePlusPlus(player);
        break;
      case 'cardCostReduction':
        // For cardCostReduction, we need card ID - handled separately
        return { success: false, error: 'Card Cost Reduction must be handled via separate endpoint' };
      case 'swapPlus':
        // For swapPlus, we need slot numbers - handled separately
        return { success: false, error: 'Swap+ must be handled via separate endpoint' };
      case 'massUnexhaust':
        // For massUnexhaust, we need card IDs - handled separately
        return { success: false, error: 'Mass Unexhaust must be handled via separate endpoint' };
      case 'targetAttack':
        result = this.targetAttack(targetDieIds[0], player);
        break;
      case 'targetedUnexhaust':
        result = this.targetedUnexhaust(targetDieIds[0], player);
        break;
      default:
        return { success: false, error: 'Unknown ability effect' };
    }

    // If ability succeeded, exhaust cost dice and cards (always)
    if (result.success) {
      costDiceIds.forEach(id => this.exhaustDie(id, player));
      costCardIds.forEach(id => this.exhaustCard(id, player));

      // Exhaust target die(s) if required
      if (def.exhaustTarget && targetDieIds.length > 0) {
        targetDieIds.forEach(id => this.exhaustDie(id, player));
      }

      // Consume an action and check if move/round ends
      const advanceResult = this.consumeAction();
      return {
        success: true,
        state: this.getGameState(),
        ...advanceResult,
        // Pass through attack-related properties if they exist
        ...(result.attackId && { attackId: result.attackId }),
        ...(result.pendingAttack && { pendingAttack: result.pendingAttack })
      };
    }

    return result;
  }

  // ===== BASIC DIE OPERATIONS (Called by executeAbility) =====

  recruitDie(player) {
    const newDie = {
      id: this.generateId(),
      size: 4,
      value: this.rollDie(4)
    };
    player.dicePool.push(newDie);
    // Newly recruited dice start exhausted
    this.exhaustDie(newDie.id, player);
    this.addLog(`${player.name} recruited d4 (rolled ${newDie.value}) - starts exhausted`);
    return { success: true };
  }

  promoteDie(dieId, player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    const sizeMap = { 4: 6, 6: 8, 8: 10, 10: 12 };
    const nextSize = sizeMap[die.size];

    if (!nextSize) {
      return { success: false, error: 'Die already at maximum size' };
    }

    const oldSize = die.size;
    die.size = nextSize;
    die.value = this.rollDie(nextSize);

    this.addLog(`${player.name} promoted d${oldSize} to d${nextSize} (rolled ${die.value})`);
    return { success: true };
  }

  rerollDie(dieId, player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    const oldValue = die.value;
    die.value = this.rollDie(die.size);

    this.addLog(`${player.name} rerolled d${die.size} from ${oldValue} to ${die.value}`);
    return { success: true };
  }

  bumpDie(dieId, direction = 'up', player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (direction === 'up') {
      if (die.value >= die.size) {
        return { success: false, error: 'Die already at maximum value' };
      }
      die.value += 1;
      this.addLog(`${player.name} bumped d${die.size} up to ${die.value}`);
    } else {
      if (die.value <= 1) {
        return { success: false, error: 'Die already at minimum value' };
      }
      die.value -= 1;
      this.addLog(`${player.name} bumped d${die.size} down to ${die.value}`);
    }

    return { success: true };
  }

  bumpUpDie(dieId, amount = 1, player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (amount < 1 || amount > 3) {
      return { success: false, error: 'Bump amount must be 1-3' };
    }

    if (die.value + amount > die.size) {
      return { success: false, error: `Cannot bump up by ${amount}: would exceed maximum` };
    }

    die.value += amount;
    this.addLog(`${player.name} bumped up d${die.size} by ${amount} to ${die.value}`);
    return { success: true };
  }

  bumpDownDie(dieId, amount = 1, player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (amount < 1 || amount > 3) {
      return { success: false, error: 'Bump amount must be 1-3' };
    }

    if (die.value - amount < 1) {
      return { success: false, error: `Cannot bump down by ${amount}: would go below minimum` };
    }

    die.value -= amount;
    this.addLog(`${player.name} bumped down d${die.size} by ${amount} to ${die.value}`);
    return { success: true };
  }

  setDieValue(dieId, value, player) {
    const die = this.getDie(dieId, player);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (value < 1 || value > die.size) {
      return { success: false, error: `Value must be between 1 and ${die.size}` };
    }

    die.value = value;
    this.addLog(`${player.name} set d${die.size} to ${die.value}`);
    return { success: true };
  }

  // ===== TIER 1 ABILITY EFFECTS =====

  massReroll(targetDieIds, player) {
    if (!targetDieIds || targetDieIds.length === 0) {
      return { success: false, error: 'Must select at least one die to reroll' };
    }

    if (targetDieIds.length > 3) {
      return { success: false, error: 'Can only reroll up to 3 dice' };
    }

    const results = [];
    for (const dieId of targetDieIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { success: false, error: 'Die not found' };
      }
      const oldValue = die.value;
      die.value = this.rollDie(die.size);
      results.push(`d${die.size}: ${oldValue}→${die.value}`);
    }

    this.addLog(`${player.name} used Mass Reroll: ${results.join(', ')}`);
    return { success: true };
  }

  attack(player) {
    // For multiplayer: each other player must exhaust a die
    const otherPlayers = this.state.players.filter(p => p.id !== player.id);

    if (otherPlayers.length === 0) {
      this.addLog(`${player.name} used Attack (no opponents)`);
      return { success: true };
    }

    // Initialize pending attacks if not exists
    if (!this.state.pendingAttacks) {
      this.state.pendingAttacks = [];
    }

    // Create attack request
    const attackId = this.generateId();
    const pendingAttack = {
      id: attackId,
      attackerId: player.id,
      attackerName: player.name,
      type: 'attack', // attack or attackPlus
      diceCount: 1, // number of dice each player must exhaust
      responses: {}, // playerId -> [dieIds]
      waitingFor: otherPlayers.map(p => p.id)
    };

    this.state.pendingAttacks.push(pendingAttack);
    this.addLog(`${player.name} used Attack`);

    return {
      success: true,
      attackId: attackId,
      pendingAttack: pendingAttack
    };
  }

  massBump(targetDieIds, direction = 'up', player) {
    if (!targetDieIds || targetDieIds.length === 0) {
      return { success: false, error: 'Must select at least one die to bump' };
    }

    if (targetDieIds.length > 2) {
      return { success: false, error: 'Can only bump up to 2 dice' };
    }

    const results = [];
    for (const dieId of targetDieIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { success: false, error: 'Die not found' };
      }

      const oldValue = die.value;
      if (direction === 'up') {
        if (die.value >= die.size) {
          return { success: false, error: `Cannot bump d${die.size} up from ${die.value}` };
        }
        die.value += 1;
      } else {
        if (die.value <= 1) {
          return { success: false, error: `Cannot bump d${die.size} down from ${die.value}` };
        }
        die.value -= 1;
      }
      results.push(`d${die.size}: ${oldValue}→${die.value}`);
    }

    this.addLog(`${player.name} used Mass Bump ${direction}: ${results.join(', ')}`);
    return { success: true };
  }

  twosReroll(player) {
    const twoDice = player.dicePool.filter(die => die.value === 2);

    if (twoDice.length === 0) {
      this.addLog(`${player.name} used 2s Reroll: No dice with value 2`);
      return { success: true };
    }

    const results = [];
    for (const die of twoDice) {
      const oldValue = die.value;
      die.value = this.rollDie(die.size);
      results.push(`d${die.size}: ${oldValue}→${die.value}`);
    }

    this.addLog(`${player.name} used 2s Reroll (${twoDice.length} dice): ${results.join(', ')}`);
    return { success: true };
  }

  // ===== TIER 2 ABILITY EFFECTS =====

  score(player) {
    player.victoryPoints += 1;
    this.addLog(`${player.name} used Score: +1 VP (total: ${player.victoryPoints})`);

    // Check for victory
    if (player.victoryPoints >= 10) {
      this.state.phase = 'ended';
      this.addLog(`🎉 ${player.name} WINS! Reached ${player.victoryPoints} VP!`);
    }

    return { success: true };
  }

  targetedRecruit(targetDieId, player) {
    const targetDie = this.getDie(targetDieId, player);
    if (!targetDie) {
      return { success: false, error: 'Target die not found' };
    }

    const newDie = {
      id: this.generateId(),
      size: targetDie.size,
      value: this.rollDie(targetDie.size)
    };
    player.dicePool.push(newDie);
    // Newly recruited dice start exhausted
    this.exhaustDie(newDie.id, player);
    this.addLog(`${player.name} used Targeted Recruit: d${newDie.size} (rolled ${newDie.value}) - starts exhausted`);
    return { success: true };
  }

  recruitPlusAbility(player) {
    const newDie = {
      id: this.generateId(),
      size: 4,
      value: this.rollDie(4)
    };
    player.dicePool.push(newDie);
    // Newly recruited dice start exhausted
    this.exhaustDie(newDie.id, player);
    this.addLog(`${player.name} used Recruit+: d4 (rolled ${newDie.value}) - starts exhausted`);
    return { success: true };
  }

  attackPlus(player) {
    // Each other player must exhaust 2 dice of their choice
    const otherPlayers = this.state.players.filter(p => p.id !== player.id);

    if (otherPlayers.length === 0) {
      this.addLog(`${player.name} used Attack+ (no opponents)`);
      return { success: true };
    }

    // Initialize pending attacks if not exists
    if (!this.state.pendingAttacks) {
      this.state.pendingAttacks = [];
    }

    // Create attack request
    const attackId = this.generateId();
    const pendingAttack = {
      id: attackId,
      attackerId: player.id,
      attackerName: player.name,
      type: 'attackPlus',
      diceCount: 2, // number of dice each player must exhaust
      responses: {}, // playerId -> [dieIds]
      waitingFor: otherPlayers.map(p => p.id)
    };

    this.state.pendingAttacks.push(pendingAttack);
    this.addLog(`${player.name} used Attack+`);

    return {
      success: true,
      attackId: attackId,
      pendingAttack: pendingAttack
    };
  }

  /**
   * Respond to an attack by selecting dice to exhaust
   */
  respondToAttack(playerId, attackId, diceIds) {
    if (!this.state.pendingAttacks) {
      return { success: false, error: 'No pending attacks' };
    }

    const attack = this.state.pendingAttacks.find(a => a.id === attackId);
    if (!attack) {
      return { success: false, error: 'Attack not found' };
    }

    if (!attack.waitingFor.includes(playerId)) {
      return { success: false, error: 'You are not required to respond to this attack' };
    }

    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Validate dice selection
    if (!diceIds || diceIds.length === 0) {
      return { success: false, error: 'Must select at least one die' };
    }

    const maxDice = Math.min(attack.diceCount, player.dicePool.filter(d => !this.isDieExhausted(d.id, player)).length);
    if (diceIds.length > maxDice) {
      return { success: false, error: `Can only exhaust up to ${maxDice} dice` };
    }

    // Validate all dice exist and are not exhausted
    for (const dieId of diceIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { success: false, error: 'Die not found' };
      }
      if (this.isDieExhausted(dieId, player)) {
        return { success: false, error: 'Die is already exhausted' };
      }
    }

    // Record response
    attack.responses[playerId] = diceIds;
    attack.waitingFor = attack.waitingFor.filter(id => id !== playerId);

    // If all players have responded, execute the attack
    if (attack.waitingFor.length === 0) {
      this.executeAttack(attackId);
    }

    return { success: true, allResponded: attack.waitingFor.length === 0 };
  }

  /**
   * Execute an attack after all players have responded
   */
  executeAttack(attackId) {
    if (!this.state.pendingAttacks) return;

    const attackIndex = this.state.pendingAttacks.findIndex(a => a.id === attackId);
    if (attackIndex === -1) return;

    const attack = this.state.pendingAttacks[attackIndex];

    // Exhaust all selected dice
    for (const [playerId, diceIds] of Object.entries(attack.responses)) {
      const player = this.getPlayer(playerId);
      if (!player) continue;

      for (const dieId of diceIds) {
        this.exhaustDie(dieId, player);
      }

      if (diceIds.length > 0) {
        this.addLog(`${player.name} exhausted ${diceIds.length} dice from ${attack.type === 'attackPlus' ? 'Attack+' : 'Attack'}`);
      }
    }

    // Remove attack from pending list
    this.state.pendingAttacks.splice(attackIndex, 1);
  }

  unexhaustDie(dieId, player) {
    if (!this.isDieExhausted(dieId, player)) {
      return { success: false, error: 'Die is not exhausted' };
    }

    // Remove from exhausted list
    const index = player.exhaustedDice.indexOf(dieId);
    if (index > -1) {
      player.exhaustedDice.splice(index, 1);
    }

    const die = this.getDie(dieId, player);
    this.addLog(`${player.name} unexhausted d${die?.size || '?'}`);
    return { success: true };
  }

  /**
   * Swap two abilities between slots
   * @param {string} playerId - Player performing the swap
   * @param {number} slot1 - First slot number
   * @param {number} slot2 - Second slot number
   */
  swapSlots(playerId, slot1, slot2) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Validate slot numbers
    if (slot1 < 1 || slot1 > 12 || slot2 < 1 || slot2 > 12) {
      return { success: false, error: 'Slots must be between 1 and 12' };
    }

    if (slot1 === slot2) {
      return { success: false, error: 'Cannot swap a slot with itself' };
    }

    const ability1Id = player.slots[slot1];
    const ability2Id = player.slots[slot2];

    if (!ability1Id && !ability2Id) {
      return { success: false, error: 'Both slots are empty' };
    }

    // Validate tier restrictions for the swap
    const slot1Tier = this.getSlotTier(slot1);
    const slot2Tier = this.getSlotTier(slot2);

    if (ability1Id) {
      const ability1 = this.getAbilityById(ability1Id);
      if (ability1 && ability1.tier > slot2Tier) {
        return { success: false, error: `${ability1.name} (Tier ${ability1.tier}) cannot be placed in slot ${slot2} (Tier ${slot2Tier})` };
      }
    }

    if (ability2Id) {
      const ability2 = this.getAbilityById(ability2Id);
      if (ability2 && ability2.tier > slot1Tier) {
        return { success: false, error: `${ability2.name} (Tier ${ability2.tier}) cannot be placed in slot ${slot1} (Tier ${slot1Tier})` };
      }
    }

    // Perform the swap
    player.slots[slot1] = ability2Id;
    player.slots[slot2] = ability1Id;

    const ability1Name = ability1Id ? this.getAbilityById(ability1Id)?.name : 'Empty';
    const ability2Name = ability2Id ? this.getAbilityById(ability2Id)?.name : 'Empty';
    this.addLog(`${player.name} swapped slots ${slot1} (${ability1Name}) ↔ ${slot2} (${ability2Name})`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  // ===== TIER 3 ABILITY EFFECTS =====

  scorePlus(player) {
    player.victoryPoints += 2;
    this.addLog(`${player.name} used Score+: +2 VP (total: ${player.victoryPoints})`);

    // Check for victory
    if (player.victoryPoints >= 10) {
      this.state.phase = 'ended';
      this.addLog(`🎉 ${player.name} WINS! Reached ${player.victoryPoints} VP!`);
    }

    return { success: true };
  }

  massBumpPlus(targetDieIds, direction = 'up', amount = 1, player) {
    if (!targetDieIds || targetDieIds.length === 0) {
      return { success: false, error: 'Must select at least one die to bump' };
    }

    if (targetDieIds.length > 3) {
      return { success: false, error: 'Can only bump up to 3 dice' };
    }

    if (amount < 1 || amount > 3) {
      return { success: false, error: 'Bump amount must be between 1 and 3' };
    }

    // First validate all dice can be bumped by the amount
    for (const dieId of targetDieIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { success: false, error: 'Die not found' };
      }

      if (direction === 'up') {
        if (die.value + amount > die.size) {
          return { success: false, error: `Cannot bump d${die.size} up by ${amount} from ${die.value}` };
        }
      } else {
        if (die.value - amount < 1) {
          return { success: false, error: `Cannot bump d${die.size} down by ${amount} from ${die.value}` };
        }
      }
    }

    // All valid, now apply the bumps
    const results = [];
    for (const dieId of targetDieIds) {
      const die = this.getDie(dieId, player);
      const oldValue = die.value;

      if (direction === 'up') {
        die.value += amount;
      } else {
        die.value -= amount;
      }

      results.push(`d${die.size}: ${oldValue}→${die.value}`);
    }

    this.addLog(`${player.name} used Mass Bump+ ${direction} by ${amount}: ${results.join(', ')}`);
    return { success: true };
  }

  massRerollPlus(targetDieIds, player) {
    if (!targetDieIds || targetDieIds.length === 0) {
      return { success: false, error: 'Must select at least one die to reroll' };
    }

    const results = [];
    for (const dieId of targetDieIds) {
      const die = this.getDie(dieId, player);
      if (!die) {
        return { success: false, error: 'Die not found' };
      }

      const oldValue = die.value;
      die.value = this.rollDie(die.size);
      results.push(`d${die.size}: ${oldValue}→${die.value}`);
    }

    this.addLog(`${player.name} used Mass Reroll+ (${targetDieIds.length} dice): ${results.join(', ')}`);
    return { success: true };
  }

  /**
   * Clear a slot
   * @param {string} playerId - Player performing the action
   * @param {number} slotNumber - Slot to clear
   */
  clearSlot(playerId, slotNumber) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Validate slot number
    if (slotNumber < 1 || slotNumber > 12) {
      return { success: false, error: 'Slot must be between 1 and 12' };
    }

    const abilityId = player.slots[slotNumber];
    if (!abilityId) {
      return { success: false, error: 'Slot is already empty' };
    }

    const ability = this.getAbilityById(abilityId);
    const abilityName = ability?.name || abilityId;

    // Clear the slot
    player.slots[slotNumber] = null;

    this.addLog(`${player.name} cleared slot ${slotNumber} (${abilityName})`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  /**
   * Unexhaust a card
   * @param {string} playerId - Player performing the action
   * @param {string} cardId - Card to unexhaust
   */
  cardUnexhaustAbility(playerId, cardId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Check if card exists in player's cards
    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in your cards' };
    }

    // Check if card is exhausted
    if (!this.isCardExhausted(cardId, player)) {
      return { success: false, error: 'Card is not exhausted' };
    }

    // Remove from exhausted list
    const index = player.exhaustedCards.indexOf(cardId);
    if (index > -1) {
      player.exhaustedCards.splice(index, 1);
    }

    this.addLog(`${player.name} unexhausted card: ${card.name}`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  // ===== TIER 4 ABILITY EFFECTS =====

  scorePlusPlus(player) {
    player.victoryPoints += 3;
    this.addLog(`${player.name} used Score++: +3 VP (total: ${player.victoryPoints})`);

    // Check for victory
    if (player.victoryPoints >= 10) {
      this.state.phase = 'ended';
      this.addLog(`🎉 ${player.name} WINS! Reached ${player.victoryPoints} VP!`);
    }

    return { success: true };
  }

  /**
   * Reduce a card's cost by 1 die
   * @param {string} playerId - Player performing the action
   * @param {string} cardId - Card to reduce cost for
   */
  cardCostReductionAbility(playerId, cardId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Check if card exists in available cards
    const card = this.state.availableCards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in available cards' };
    }

    // Initialize cost reduction tracking if not exists
    if (!this.state.cardCostReductions) {
      this.state.cardCostReductions = {};
    }

    // Initialize reduction for this card if not exists
    if (!this.state.cardCostReductions[cardId]) {
      this.state.cardCostReductions[cardId] = 0;
    }

    // Check if cost is already 0
    const currentCost = Math.max(0, card.cost - this.state.cardCostReductions[cardId]);
    if (currentCost === 0) {
      return { success: false, error: 'Card cost is already 0' };
    }

    // Reduce cost by 1
    this.state.cardCostReductions[cardId] += 1;
    const newCost = Math.max(0, card.cost - this.state.cardCostReductions[cardId]);

    this.addLog(`${player.name} reduced ${card.name} cost: ${currentCost}→${newCost} dice`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  /**
   * Swap two abilities between slots (no tier restrictions)
   * @param {string} playerId - Player performing the swap
   * @param {number} slot1 - First slot number
   * @param {number} slot2 - Second slot number
   */
  swapPlusAbility(playerId, slot1, slot2) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    // Validate slot numbers
    if (slot1 < 1 || slot1 > 12 || slot2 < 1 || slot2 > 12) {
      return { success: false, error: 'Slots must be between 1 and 12' };
    }

    if (slot1 === slot2) {
      return { success: false, error: 'Cannot swap a slot with itself' };
    }

    const ability1Id = player.slots[slot1];
    const ability2Id = player.slots[slot2];

    if (!ability1Id && !ability2Id) {
      return { success: false, error: 'Both slots are empty' };
    }

    // Perform the swap (no tier restriction check for Swap+)
    player.slots[slot1] = ability2Id;
    player.slots[slot2] = ability1Id;

    const ability1Name = ability1Id ? this.getAbilityById(ability1Id)?.name : 'Empty';
    const ability2Name = ability2Id ? this.getAbilityById(ability2Id)?.name : 'Empty';
    this.addLog(`${player.name} used Swap+ on slots ${slot1} (${ability1Name}) ↔ ${slot2} (${ability2Name})`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  /**
   * Unexhaust up to 2 cards
   * @param {string} playerId - Player performing the action
   * @param {string[]} cardIds - Cards to unexhaust (max 2)
   */
  massUnexhaustAbility(playerId, cardIds) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    if (!cardIds || cardIds.length === 0) {
      return { success: false, error: 'Must select at least one card' };
    }

    if (cardIds.length > 2) {
      return { success: false, error: 'Can only unexhaust up to 2 cards' };
    }

    const cardNames = [];
    for (const cardId of cardIds) {
      const card = player.cards.find(c => c.id === cardId);
      if (!card) {
        return { success: false, error: 'Card not found in your cards' };
      }

      if (!this.isCardExhausted(cardId, player)) {
        return { success: false, error: `${card.name} is not exhausted` };
      }

      // Remove from exhausted list
      const index = player.exhaustedCards.indexOf(cardId);
      if (index > -1) {
        player.exhaustedCards.splice(index, 1);
      }

      cardNames.push(card.name);
    }

    this.addLog(`${player.name} unexhausted ${cardIds.length} card(s): ${cardNames.join(', ')}`);

    // Consume an action
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  targetAttack(targetDieId, player) {
    const targetDie = this.getDie(targetDieId, player);
    if (!targetDie) {
      return { success: false, error: 'Target die not found' };
    }

    const targetValue = targetDie.value;

    // For all players (including self), exhaust all dice with this value
    for (const p of this.state.players) {
      const matchingDice = p.dicePool.filter(die => die.value === targetValue);

      for (const die of matchingDice) {
        this.exhaustDie(die.id, p);
      }

      if (matchingDice.length > 0) {
        this.addLog(`${p.name} exhausted ${matchingDice.length} dice showing ${targetValue} from Target Attack`);
      }
    }

    this.addLog(`${player.name} used Target Attack on value ${targetValue}`);
    return { success: true };
  }

  targetedUnexhaust(targetDieId, player) {
    const targetDie = this.getDie(targetDieId, player);
    if (!targetDie) {
      return { success: false, error: 'Target die not found' };
    }

    const targetValue = targetDie.value;

    // Unexhaust all of the player's dice with this value
    const matchingDice = player.dicePool.filter(die => die.value === targetValue);

    let unexhaustedCount = 0;
    for (const die of matchingDice) {
      if (this.isDieExhausted(die.id, player)) {
        const index = player.exhaustedDice.indexOf(die.id);
        if (index > -1) {
          player.exhaustedDice.splice(index, 1);
          unexhaustedCount++;
        }
      }
    }

    this.addLog(`${player.name} used Targeted Unexhaust: unexhausted ${unexhaustedCount} dice showing ${targetValue}`);
    return { success: true };
  }

  // ===== CARD ACTIONS =====

  /**
   * Buy a card from the center using dice
   */
  buyCard(playerId, cardId, costDiceIds) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Check if it's player's turn
    const currentPlayer = this.getCurrentPlayer();
    if (currentPlayer.id !== playerId) {
      return { success: false, error: 'Not your turn' };
    }

    // Check if player has actions remaining
    if (this.state.actionsRemaining <= 0) {
      return { success: false, error: 'No actions remaining this move' };
    }

    const card = this.state.availableCards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in available cards' };
    }

    // Validate cost - need exact dice values matching card cost
    const requiredCost = [...card.cost].sort((a, b) => a - b);
    const providedValues = costDiceIds.map(id => {
      const die = this.getDie(id, player);
      if (!die) return null;
      if (this.isDieExhausted(id, player)) return null;
      return die.value;
    }).filter(v => v !== null).sort((a, b) => a - b);

    // Check if provided dice match required cost
    if (requiredCost.length !== providedValues.length) {
      return { success: false, error: `Card costs ${requiredCost.join(', ')}` };
    }

    for (let i = 0; i < requiredCost.length; i++) {
      if (requiredCost[i] !== providedValues[i]) {
        return { success: false, error: `Card costs ${requiredCost.join(', ')}` };
      }
    }

    // Exhaust the dice used to pay
    costDiceIds.forEach(id => this.exhaustDie(id, player));

    // Remove card from available and add to player cards
    player.cards.push(card);

    // Add VP if card has VP
    if (card.effects.vp) {
      player.victoryPoints += card.effects.vp;
      this.addLog(`${player.name} bought "${card.title}" for ${card.cost.join(', ')} (+${card.effects.vp} VP)`);
    } else {
      this.addLog(`${player.name} bought "${card.title}" for ${card.cost.join(', ')}`);
    }

    // Replace the card from the deck
    this.replaceCard(cardId);

    // Check for victory
    if (player.victoryPoints >= 10) {
      this.state.phase = 'ended';
      this.addLog(`🎉 ${player.name} WINS! Reached ${player.victoryPoints} VP!`);
    }

    // Consume an action and check if move/round ends
    const advanceResult = this.consumeAction();
    return {
      success: true,
      state: this.getGameState(),
      ...advanceResult
    };
  }

  /**
   * Use a card's dice numbers to pay for an ability cost
   */
  useCardDiceNumber(playerId, cardId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    const card = player.cards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in your cards' };
    }

    if (!card.effects.diceNumbers || card.effects.diceNumbers.length === 0) {
      return { success: false, error: 'Card does not have any dice numbers' };
    }

    if (this.isCardExhausted(cardId, player)) {
      return { success: false, error: 'Card is already exhausted this turn' };
    }

    // Exhaust the card
    this.exhaustCard(cardId, player);

    return {
      success: true,
      diceNumbers: card.effects.diceNumbers,
      state: this.getGameState()
    };
  }

  // ===== STATE METHODS =====

  getGameState() {
    return { ...this.state };
  }

  getPlayerView(playerId) {
    const player = this.getPlayer(playerId);
    if (!player) {
      return this.getGameState(); // Fallback for spectators
    }

    // Return a view with the player's data plus shared game data
    return {
      ...this.state,
      // Add convenience properties for the viewing player
      playerId: player.id,
      playerName: player.name,
      dicePool: player.dicePool,
      exhaustedDice: player.exhaustedDice,
      slots: player.slots,
      playerCards: player.cards,
      exhaustedCards: player.exhaustedCards,
      victoryPoints: player.victoryPoints,
      recruitCost: this.getRecruitCost(player), // Dynamic cost for recruit ability
      targetedRecruitCost: this.getTargetedRecruitCost(player), // Dynamic cost for targeted recruit
      recruitPlusCost: this.getRecruitPlusCost(player) // Dynamic cost for recruit+
    };
  }
}

module.exports = DiceFactoryGame;
