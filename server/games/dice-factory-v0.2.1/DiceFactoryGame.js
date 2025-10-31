// 1001 Game Nights - Dice Factory Game Logic
// Version: 0.2.1 - Minimal version with slot-based abilities
// Updated: October 2025

const fs = require('fs');
const path = require('path');

// Load factory cards
const cardDataPath = path.join(__dirname, 'factoryCards.json');
const FACTORY_CARDS = JSON.parse(fs.readFileSync(cardDataPath, 'utf8'));

class DiceFactoryGame {
  constructor(players) {
    this.state = {
      type: 'dice-factory',
      version: 'v0.2.1',
      phase: 'playing',
      round: 1,
      gameLog: [],
      // Solo player state (structured for multiplayer expansion later)
      playerId: players[0].id,
      playerName: players[0].name,
      dicePool: this.createInitialDicePool(),
      exhaustedDice: [], // IDs of dice used this turn
      // Slot system: slots 1-12, each can hold one ability name or null
      // Default assignments: 1=recruit, 2=reroll, 3=bump, 4=promote
      slots: {
        1: 'recruit',
        2: 'reroll',
        3: 'bump',
        4: 'promote',
        5: null, 6: null, 7: null, 8: null,
        9: null, 10: null, 11: null, 12: null
      },
      // Available abilities (unlimited for now)
      availableAbilities: ['recruit', 'promote', 'reroll', 'bump', 'bumpUp', 'bumpDown', 'setValue'],

      // Factory Decks system
      deck1: [],
      deck2: [],
      deck3: [],
      availableCards: [], // 4 cards from each deck (12 total)
      playerCards: [], // Cards the player owns
      exhaustedCards: [], // Card IDs that are exhausted this turn
      victoryPoints: 0
    };

    // Initialize decks and deal cards
    this.initializeDecks();
    this.dealInitialCards();

    // Roll initial dice
    this.rollAllDice();
    this.addLog('=== DICE FACTORY v0.2.1 (Slot-Based + Factory Decks) ===');
    this.addLog('Assign abilities to slots 1-12 to use them!');
    this.addLog('Buy cards from the center to gain VP and dice numbers!');
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

  rollAllDice() {
    for (const die of this.state.dicePool) {
      die.value = this.rollDie(die.size);
    }
  }

  addLog(message) {
    this.state.gameLog.push({
      round: this.state.round,
      message: message,
      timestamp: Date.now()
    });
  }

  getDie(dieId) {
    return this.state.dicePool.find(d => d.id === dieId);
  }

  isDieExhausted(dieId) {
    return this.state.exhaustedDice.includes(dieId);
  }

  exhaustDie(dieId) {
    if (!this.state.exhaustedDice.includes(dieId)) {
      this.state.exhaustedDice.push(dieId);
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

  getCard(cardId) {
    return this.state.availableCards.find(c => c.id === cardId) ||
           this.state.playerCards.find(c => c.id === cardId);
  }

  isCardExhausted(cardId) {
    return this.state.exhaustedCards.includes(cardId);
  }

  exhaustCard(cardId) {
    if (!this.state.exhaustedCards.includes(cardId)) {
      this.state.exhaustedCards.push(cardId);
    }
  }

  // ===== SLOT MANAGEMENT =====

  /**
   * Assign an ability to a slot
   */
  assignSlot(slotNumber, abilityName) {
    if (slotNumber < 1 || slotNumber > 12) {
      return { success: false, error: 'Slot must be between 1 and 12' };
    }

    if (abilityName && !this.state.availableAbilities.includes(abilityName)) {
      return { success: false, error: 'Invalid ability' };
    }

    this.state.slots[slotNumber] = abilityName;
    const message = abilityName
      ? `Assigned ${abilityName} to slot ${slotNumber}`
      : `Cleared slot ${slotNumber}`;
    this.addLog(message);

    return { success: true, state: this.getGameState() };
  }

  /**
   * Find which slot has an ability (returns first match)
   */
  findSlotForAbility(abilityName) {
    for (let slot = 1; slot <= 12; slot++) {
      if (this.state.slots[slot] === abilityName) {
        return slot;
      }
    }
    return null;
  }

  /**
   * Validate that cost dice match the required slot values
   */
  validateCostDice(costDiceIds, requiredSlot) {
    for (const dieId of costDiceIds) {
      const die = this.getDie(dieId);
      if (!die) {
        return { valid: false, error: `Die ${dieId} not found` };
      }
      if (this.isDieExhausted(dieId)) {
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
   * @param {string} abilityName - Name of ability to execute
   * @param {string[]} costDiceIds - Array of dice IDs used as cost
   * @param {string[]} costCardIds - Array of card IDs used as virtual dice cost
   * @param {string} targetDieId - ID of target die (optional)
   * @param {number} targetValue - Target value for setValue (optional)
   * @param {string} bumpDirection - 'up' or 'down' for bump ability (optional)
   * @param {number} bumpAmount - Amount to bump for bumpUp/bumpDown (1-3, optional)
   */
  executeAbility(abilityName, costDiceIds, costCardIds = [], targetDieId = null, targetValue = null, bumpDirection = 'up', bumpAmount = 1) {
    // Find slot for this ability
    const slot = this.findSlotForAbility(abilityName);
    if (!slot) {
      return { success: false, error: `${abilityName} not assigned to any slot` };
    }

    // Define ability requirements
    const abilityDefs = {
      recruit: { costCount: 1, needsTarget: false, exhaustTarget: false },
      promote: { costCount: 1, needsTarget: true, exhaustTarget: true },
      reroll: { costCount: 1, needsTarget: true, exhaustTarget: true },
      bump: { costCount: 1, needsTarget: true, exhaustTarget: false },
      bumpUp: { costCount: 2, needsTarget: true, exhaustTarget: false },
      bumpDown: { costCount: 1, needsTarget: true, exhaustTarget: false },
      setValue: { costCount: 1, needsTarget: true, exhaustTarget: false, needsValue: true }
    };

    const def = abilityDefs[abilityName];
    if (!def) {
      return { success: false, error: `Unknown ability: ${abilityName}` };
    }

    // Validate total cost count (dice + cards)
    const totalCost = costDiceIds.length + costCardIds.length;
    if (totalCost !== def.costCount) {
      return { success: false, error: `${abilityName} requires ${def.costCount} cost items` };
    }

    // Validate cost dice values match slot
    const costValidation = this.validateCostDice(costDiceIds, slot);
    if (!costValidation.valid) {
      return { success: false, error: costValidation.error };
    }

    // Validate cost cards - must have slot value in their diceNumbers
    for (const cardId of costCardIds) {
      const card = this.state.playerCards.find(c => c.id === cardId);
      if (!card) {
        return { success: false, error: 'Card not found in your cards' };
      }
      if (this.isCardExhausted(cardId)) {
        return { success: false, error: 'Card is already exhausted' };
      }
      if (!card.effects.diceNumbers || !card.effects.diceNumbers.includes(slot)) {
        return { success: false, error: `Card must have dice number ${slot}` };
      }
    }

    // Validate target die if needed
    if (def.needsTarget) {
      if (!targetDieId) {
        return { success: false, error: `${abilityName} requires a target die` };
      }
      const targetDie = this.getDie(targetDieId);
      if (!targetDie) {
        return { success: false, error: 'Target die not found' };
      }
    }

    // Validate target value if needed
    if (def.needsValue && (targetValue === null || targetValue === undefined)) {
      return { success: false, error: `${abilityName} requires a target value` };
    }

    // Execute the ability
    let result;
    switch (abilityName) {
      case 'recruit':
        result = this.recruitDie();
        break;
      case 'promote':
        result = this.promoteDie(targetDieId);
        break;
      case 'reroll':
        result = this.rerollDie(targetDieId);
        break;
      case 'bump':
        result = this.bumpDie(targetDieId, bumpDirection);
        break;
      case 'bumpUp':
        result = this.bumpUpDie(targetDieId, bumpAmount);
        break;
      case 'bumpDown':
        result = this.bumpDownDie(targetDieId, bumpAmount);
        break;
      case 'setValue':
        result = this.setDieValue(targetDieId, targetValue);
        break;
      default:
        return { success: false, error: 'Unknown ability' };
    }

    // If ability succeeded, exhaust cost dice and cards (always)
    if (result.success) {
      costDiceIds.forEach(id => this.exhaustDie(id));
      costCardIds.forEach(id => this.exhaustCard(id));

      // Exhaust target die if required
      if (def.exhaustTarget && targetDieId) {
        this.exhaustDie(targetDieId);
      }
    }

    return result;
  }

  // ===== BASIC DIE OPERATIONS (Called by executeAbility) =====

  recruitDie() {
    const newDie = {
      id: this.generateId(),
      size: 4,
      value: this.rollDie(4)
    };
    this.state.dicePool.push(newDie);
    this.addLog(`Recruited d4 (rolled ${newDie.value})`);
    return { success: true, state: this.getGameState() };
  }

  promoteDie(dieId) {
    const die = this.getDie(dieId);
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

    this.addLog(`Promoted d${oldSize} to d${nextSize} (rolled ${die.value})`);
    return { success: true, state: this.getGameState() };
  }

  rerollDie(dieId) {
    const die = this.getDie(dieId);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    const oldValue = die.value;
    die.value = this.rollDie(die.size);

    this.addLog(`Rerolled d${die.size} from ${oldValue} to ${die.value}`);
    return { success: true, state: this.getGameState() };
  }

  bumpDie(dieId, direction = 'up') {
    const die = this.getDie(dieId);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (direction === 'up') {
      if (die.value >= die.size) {
        return { success: false, error: 'Die already at maximum value' };
      }
      die.value += 1;
      this.addLog(`Bumped d${die.size} up to ${die.value}`);
    } else {
      if (die.value <= 1) {
        return { success: false, error: 'Die already at minimum value' };
      }
      die.value -= 1;
      this.addLog(`Bumped d${die.size} down to ${die.value}`);
    }

    return { success: true, state: this.getGameState() };
  }

  bumpUpDie(dieId, amount = 1) {
    const die = this.getDie(dieId);
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
    this.addLog(`Bumped up d${die.size} by ${amount} to ${die.value}`);
    return { success: true, state: this.getGameState() };
  }

  bumpDownDie(dieId, amount = 1) {
    const die = this.getDie(dieId);
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
    this.addLog(`Bumped down d${die.size} by ${amount} to ${die.value}`);
    return { success: true, state: this.getGameState() };
  }

  setDieValue(dieId, value) {
    const die = this.getDie(dieId);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    if (value < 1 || value > die.size) {
      return { success: false, error: `Value must be between 1 and ${die.size}` };
    }

    die.value = value;
    this.addLog(`Set d${die.size} to ${die.value}`);
    return { success: true, state: this.getGameState() };
  }

  // ===== CARD ACTIONS =====

  /**
   * Buy a card from the center using dice
   */
  buyCard(cardId, costDiceIds) {
    const card = this.state.availableCards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in available cards' };
    }

    // Validate cost - need exact dice values matching card cost
    const requiredCost = [...card.cost].sort((a, b) => a - b);
    const providedValues = costDiceIds.map(id => {
      const die = this.getDie(id);
      if (!die) return null;
      if (this.isDieExhausted(id)) return null;
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
    costDiceIds.forEach(id => this.exhaustDie(id));

    // Remove card from available and add to player cards
    this.state.playerCards.push(card);

    // Add VP if card has VP
    if (card.effects.vp) {
      this.state.victoryPoints += card.effects.vp;
      this.addLog(`Bought "${card.title}" for ${card.cost.join(', ')} (+${card.effects.vp} VP)`);
    } else {
      this.addLog(`Bought "${card.title}" for ${card.cost.join(', ')}`);
    }

    // Replace the card from the deck
    this.replaceCard(cardId);

    // Check for victory
    if (this.state.victoryPoints >= 10) {
      this.state.phase = 'ended';
      this.addLog(`🎉 VICTORY! Reached ${this.state.victoryPoints} VP!`);
    }

    return { success: true, state: this.getGameState() };
  }

  /**
   * Use a card's dice numbers to pay for an ability cost
   */
  useCardDiceNumber(cardId) {
    const card = this.state.playerCards.find(c => c.id === cardId);
    if (!card) {
      return { success: false, error: 'Card not found in your cards' };
    }

    if (!card.effects.diceNumbers || card.effects.diceNumbers.length === 0) {
      return { success: false, error: 'Card does not have any dice numbers' };
    }

    if (this.isCardExhausted(cardId)) {
      return { success: false, error: 'Card is already exhausted this turn' };
    }

    // Exhaust the card
    this.exhaustCard(cardId);

    return {
      success: true,
      diceNumbers: card.effects.diceNumbers,
      state: this.getGameState()
    };
  }

  /**
   * End turn (reroll all dice, refresh exhaustion)
   */
  endTurn() {
    this.rollAllDice();
    this.state.exhaustedDice = []; // Refresh all dice
    this.state.exhaustedCards = []; // Refresh all cards
    this.state.round += 1;

    this.addLog(`=== END TURN - Starting Round ${this.state.round} ===`);
    return { success: true, state: this.getGameState() };
  }

  // ===== STATE METHODS =====

  getGameState() {
    return { ...this.state };
  }

  getPlayerView(playerId) {
    // For solo mode, just return the full state
    // Structure allows for multiplayer expansion later
    return this.getGameState();
  }
}

module.exports = DiceFactoryGame;
