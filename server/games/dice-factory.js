// Dice Factory Game Server Logic

class DiceFactoryGame {
  constructor(players) {
    this.state = {
      type: 'dice-factory',
      phase: 'rolling', // 'rolling', 'playing', 'revealing', 'complete'
      round: 1,
      turnCounter: 1,
      currentPlayerIndex: 0,
      collapseStarted: false,
      collapseDice: [4, 6, 8],
      activeEffects: this.generateFactoryEffects(),
      firstRecruits: new Set(),
      firstStraight: false,
      firstSet: false,
      winner: null,
      players: players.map((p, index) => ({
        id: p.id,
        name: p.name,
        dicePool: [
          { sides: 4, value: null, shiny: false, rainbow: false, id: this.generateDieId() },
          { sides: 4, value: null, shiny: false, rainbow: false, id: this.generateDieId() },
          { sides: 4, value: null, shiny: false, rainbow: false, id: this.generateDieId() },
          { sides: 4, value: null, shiny: false, rainbow: false, id: this.generateDieId() }
        ],
        diceFloor: 4,
        freePips: 0,
        score: 0,
        hasFled: false,
        hasActed: false
      }))
    };
  }

  // Generate random die ID
  generateDieId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Generate 3 random factory effects
  generateFactoryEffects() {
    const allEffects = [
      { name: "Job Fair", description: "Spend 2 free pips to recruit a d4" },
      { name: "Sales Strategy", description: "Tricks need 1 fewer die. One die returns when scoring" },
      { name: "Synergy", description: "All tricks count as having 1 additional die" },
      { name: "Corporate Debt", description: "Can go negative pips to -20. Lose points equal to debt" },
      { name: "Shiny Dice", description: "Pay 4 pips when recruiting/promoting for double points" },
      { name: "Rainbow Die", description: "Pay 3 pips for flexible dice in tricks" },
      { name: "Variable Dice Pool", description: "Pay 7 pips to increase minimum dice pool" },
      { name: "Corporate Recruiter", description: "Promote d8/d10/d12 for 1 less pip" }
    ];
    
    const shuffled = [...allEffects].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  // Start new round
  startRound() {
    // Check collapse at start of round
    this.checkCollapse();
    
    if (this.state.collapseStarted && this.state.collapseDice.length === 0) {
      // No collapse dice left, game over
      this.endGame();
      return;
    }

    // Reset player actions
    this.state.players.forEach(player => {
      player.hasActed = false;
      // Roll all dice with null values
      player.dicePool.forEach(die => {
        if (die.value === null) {
          die.value = Math.floor(Math.random() * die.sides) + 1;
        }
      });
    });

    this.state.phase = 'playing';
    this.state.currentPlayerIndex = 0;
  }

  // Check for factory collapse
  checkCollapse() {
    if (!this.state.collapseStarted) {
      const collapseRoll = this.state.collapseDice.reduce((sum, sides) => {
        return sum + (Math.floor(Math.random() * sides) + 1);
      }, 0);
      
      if (collapseRoll < this.state.turnCounter) {
        this.state.collapseStarted = true;
        console.log(`Factory collapse started! Roll: ${collapseRoll}, Turn: ${this.state.turnCounter}`);
      }
    }
  }

  // Player action: roll dice manually
  rollDice(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot roll dice now' };
    }

    player.dicePool.forEach(die => {
      die.value = Math.floor(Math.random() * die.sides) + 1;
    });

    return { success: true, gameState: this.getGameState() };
  }

  // Player action: promote dice
  promoteDice(playerId, data) {
    const { targetDieId, helperDieIds } = data;
    const player = this.getPlayer(playerId);
    
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot promote now' };
    }

    const targetDie = player.dicePool.find(d => d.id === targetDieId);
    if (!targetDie) {
      return { success: false, error: 'Target die not found' };
    }

    const promotionMap = { 4: 6, 6: 8, 8: 10, 10: 12 };
    const newSize = promotionMap[targetDie.sides];
    if (!newSize) {
      return { success: false, error: 'Cannot promote d12' };
    }

    // Calculate required pips
    let requiredPips = targetDie.sides;
    if (this.hasEffect("Corporate Recruiter") && targetDie.sides >= 8) {
      requiredPips -= 1;
    }

    // Calculate total pips from selected dice (including target)
    const allSelectedIds = [targetDieId, ...helperDieIds];
    const selectedDice = player.dicePool.filter(d => allSelectedIds.includes(d.id));
    const totalPips = selectedDice.reduce((sum, die) => sum + (die.value || 0), 0);

    if (totalPips < requiredPips) {
      return { success: false, error: `Need ${requiredPips} pips, have ${totalPips}` };
    }

    // Remove all selected dice
    player.dicePool = player.dicePool.filter(d => !allSelectedIds.includes(d.id));

    // Add promoted die
    const newDie = {
      sides: newSize,
      value: null,
      shiny: false,
      rainbow: false,
      id: this.generateDieId()
    };
    player.dicePool.push(newDie);

    // Replenish to minimum if needed
    this.replenishDicePool(player);

    return { success: true, gameState: this.getGameState() };
  }

  // Player action: recruit dice
  recruitDice(playerId, recruitingDieId) {
    const player = this.getPlayer(playerId);
    
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot recruit now' };
    }

    const recruitingDie = player.dicePool.find(d => d.id === recruitingDieId);
    if (!recruitingDie || recruitingDie.value === null) {
      return { success: false, error: 'Invalid recruiting die' };
    }

    // Recruitment table
    const recruitTable = {
      4: { 1: 4 },
      6: { 1: 6, 2: 4 },
      8: { 1: 8, 2: 6, 3: 4 },
      10: { 1: 10, 2: 8, 3: 6, 4: 4 },
      12: { 1: 12, 2: 10, 3: 8, 4: 6, 5: 4 }
    };

    const recruitSize = recruitTable[recruitingDie.sides]?.[recruitingDie.value];
    if (!recruitSize) {
      return { success: false, error: 'Cannot recruit with this roll' };
    }

    // Add new die
    const newDie = {
      sides: recruitSize,
      value: null,
      shiny: false,
      rainbow: false,
      id: this.generateDieId()
    };
    player.dicePool.push(newDie);

    // Mark recruiting die as used
    recruitingDie.value = null;

    // First Mover bonus
    if (this.hasEffect("First Mover") && !this.state.firstRecruits.has(recruitSize)) {
      this.state.firstRecruits.add(recruitSize);
      player.score += recruitSize;
    }

    return { success: true, gameState: this.getGameState() };
  }

  // Player action: score straight
  scoreStright(playerId, diceIds) {
    const player = this.getPlayer(playerId);
    
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot score now' };
    }

    const minDice = this.hasEffect("Sales Strategy") ? 2 : 3;
    if (diceIds.length < minDice) {
      return { success: false, error: `Need at least ${minDice} dice` };
    }

    const selectedDice = player.dicePool.filter(d => diceIds.includes(d.id));
    const values = selectedDice.map(d => d.value).sort((a, b) => a - b);

    // Validate straight
    if (!this.isValidStraight(values, selectedDice)) {
      return { success: false, error: 'Not a valid straight' };
    }

    // Calculate points
    let points = Math.max(...values) * selectedDice.length;
    
    if (this.hasEffect("Synergy")) {
      points = Math.max(...values) * (selectedDice.length + 1);
    }
    
    if (selectedDice.some(d => d.shiny)) {
      points *= 2;
    }
    
    if (this.hasEffect("First Mover") && !this.state.firstStraight) {
      this.state.firstStraight = true;
      points *= 2;
    }

    player.score += points;

    // Remove used dice
    player.dicePool = player.dicePool.filter(d => !diceIds.includes(d.id));

    // Sales Strategy return
    if (this.hasEffect("Sales Strategy") && selectedDice.length > 0) {
      const returnedDie = {
        sides: selectedDice[0].sides,
        value: null,
        shiny: false,
        rainbow: false,
        id: this.generateDieId()
      };
      player.dicePool.push(returnedDie);
    }

    this.replenishDicePool(player);
    return { success: true, points, gameState: this.getGameState() };
  }

  // Player action: score set
  scoreSet(playerId, diceIds) {
    const player = this.getPlayer(playerId);
    
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot score now' };
    }

    const minDice = this.hasEffect("Sales Strategy") ? 3 : 4;
    if (diceIds.length < minDice) {
      return { success: false, error: `Need at least ${minDice} dice` };
    }

    const selectedDice = player.dicePool.filter(d => diceIds.includes(d.id));
    
    if (!this.isValidSet(selectedDice)) {
      return { success: false, error: 'Not a valid set' };
    }

    const setValue = this.getSetValue(selectedDice);
    let points = setValue * (selectedDice.length + 1);
    
    if (this.hasEffect("Synergy")) {
      points = setValue * (selectedDice.length + 2);
    }
    
    if (selectedDice.some(d => d.shiny)) {
      points *= 2;
    }
    
    if (this.hasEffect("First Mover") && !this.state.firstSet) {
      this.state.firstSet = true;
      points *= 2;
    }

    player.score += points;

    // Remove used dice
    player.dicePool = player.dicePool.filter(d => !diceIds.includes(d.id));

    // Sales Strategy return
    if (this.hasEffect("Sales Strategy") && selectedDice.length > 0) {
      const returnedDie = {
        sides: selectedDice[0].sides,
        value: null,
        shiny: false,
        rainbow: false,
        id: this.generateDieId()
      };
      player.dicePool.push(returnedDie);
    }

    this.replenishDicePool(player);
    return { success: true, points, gameState: this.getGameState() };
  }

  // End player turn
  endTurn(playerId) {
    const player = this.getPlayer(playerId);
    
    if (!player || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot end turn now' };
    }

    // Convert unused dice to free pips
    const pipsGained = player.dicePool.reduce((sum, die) => {
      return sum + (die.value || 0);
    }, 0);
    
    player.freePips += pipsGained;
    player.hasActed = true;

    // Clear dice values
    player.dicePool.forEach(die => {
      die.value = null;
    });

    this.replenishDicePool(player);

    // Check if all players have acted
    const activePlayers = this.state.players.filter(p => !p.hasFled);
    const allActed = activePlayers.every(p => p.hasActed);

    if (allActed) {
      this.endRound();
    }

    return { success: true, gameState: this.getGameState() };
  }

  // Helper methods
  getPlayer(playerId) {
    return this.state.players.find(p => p.id === playerId);
  }

  hasEffect(effectName) {
    return this.state.activeEffects.some(e => e.name === effectName);
  }

  isValidStraight(values, dice) {
    for (let i = 1; i < values.length; i++) {
      const diff = values[i] - values[i-1];
      if (diff === 1) continue;
      if (diff === 2 && dice.some(d => d.rainbow)) continue;
      return false;
    }
    return true;
  }

  isValidSet(dice) {
    const values = dice.map(d => d.value);
    const baseValue = Math.max(...values);
    
    return dice.every(die => {
      return die.value === baseValue || 
             (die.rainbow && Math.abs(die.value - baseValue) === 1);
    });
  }

  getSetValue(dice) {
    return Math.max(...dice.map(d => d.value));
  }

  replenishDicePool(player) {
    while (player.dicePool.length < player.diceFloor) {
      player.dicePool.push({
        sides: 4,
        value: null,
        shiny: false,
        rainbow: false,
        id: this.generateDieId()
      });
    }
  }

  endRound() {
    // Apply debt penalty
    if (this.hasEffect("Corporate Debt")) {
      this.state.players.forEach(player => {
        if (player.freePips < 0) {
          player.score += player.freePips; // Subtract debt
        }
      });
    }

    this.state.round++;
    this.state.turnCounter++;
    this.startRound();
  }

  endGame() {
    this.state.phase = 'complete';
    // Crush remaining players if needed
    this.state.players.forEach(player => {
      if (!player.hasFled) {
        player.score = 0;
      }
    });
  }

  // Get game state for specific player
  getPlayerView(playerId) {
    const baseState = this.getGameState();
    const currentPlayer = baseState.players.find(p => p.id === playerId);
    
    return {
      ...baseState,
      currentPlayer: currentPlayer
    };
  }

  // Get full game state
  getGameState() {
    return {
      type: this.state.type,
      phase: this.state.phase,
      round: this.state.round,
      turnCounter: this.state.turnCounter,
      currentPlayerIndex: this.state.currentPlayerIndex,
      collapseStarted: this.state.collapseStarted,
      collapseDice: this.state.collapseDice,
      activeEffects: this.state.activeEffects,
      winner: this.state.winner,
      players: this.state.players.map(p => ({...p}))
    };
  }

  isGameComplete() {
    return this.state.phase === 'complete';
  }
}

module.exports = DiceFactoryGame;