// 1001 Game Nights - Dice Factory Game Logic
// Version: 1.2.0 - Enhanced undo system and socket reconnection fixes
// Updated: December 2024

class DiceFactoryGame {
  constructor(players) {
    this.state = {
      type: 'dice-factory',
      phase: 'rolling', // 'rolling', 'playing', 'revealing', 'complete'
      round: 1,
      turnCounter: 1,
      collapseStarted: false,
      collapseDice: [4, 6, 8],
      activeEffects: this.generateFactoryEffects(),
      firstRecruits: new Set(),
      firstStraight: false,
      firstSet: false,
      winner: null,
      lastCollapseRoll: null,
      gameLog: [],
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
        isReady: false,
        turnStartState: null, // Store state at start of turn for undo
        currentTurnActions: [], // Track actions this turn for incremental undo
        actionHistory: [] // Store incremental state snapshots
      }))
    };
    
    this.addToLog("SYSTEM", "=== DICE FACTORY GAME STARTED ===");
    this.addToLog("SYSTEM", `Active effects: ${this.state.activeEffects.map(e => e.name).join(', ')}`);
  }

  // Generate unique die ID
  generateDieId() {
    return Math.random().toString(36).substr(2, 9);
  }

  // Add message to game log
  addToLog(playerName, message, actionType = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    this.state.gameLog.push({
      timestamp,
      player: playerName,
      message,
      actionType, // 'info', 'action', 'score', 'system', 'error'
      round: this.state.round
    });
    
    // Keep only last 50 messages for performance
    if (this.state.gameLog.length > 50) {
      this.state.gameLog.shift();
    }
  }

  // Deep clone object for undo functionality
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Save player state at start of turn for full undo
  savePlayerTurnState(playerId) {
    const player = this.getPlayer(playerId);
    if (player) {
      player.turnStartState = this.deepClone({
        dicePool: player.dicePool,
        freePips: player.freePips,
        score: player.score,
        diceFloor: player.diceFloor
      });
      player.currentTurnActions = [];
      player.actionHistory = [];
    }
  }

  // Save incremental state before each action
  savePlayerActionState(playerId, actionType, actionData) {
    const player = this.getPlayer(playerId);
    if (player) {
      // Save current state before action
      const preActionState = this.deepClone({
        dicePool: player.dicePool,
        freePips: player.freePips,
        score: player.score,
        diceFloor: player.diceFloor
      });

      // Store action with pre-state
      const actionRecord = {
        type: actionType,
        data: actionData,
        timestamp: Date.now(),
        preActionState: preActionState
      };

      player.currentTurnActions.push(actionRecord);
      player.actionHistory.push(actionRecord);
    }
  }

  // Undo only the last action (incremental undo)
  undoLastAction(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.currentTurnActions.length === 0) {
      return { success: false, error: 'No actions to undo' };
    }

    const lastAction = player.currentTurnActions.pop();
    
    // Restore state from before the last action
    if (lastAction.preActionState) {
      player.dicePool = this.deepClone(lastAction.preActionState.dicePool);
      player.freePips = lastAction.preActionState.freePips;
      player.score = lastAction.preActionState.score;
      player.diceFloor = lastAction.preActionState.diceFloor;
    }

    this.addToLog(player.name, `Undid last action: ${lastAction.type}`, 'action');
    return { success: true, actionUndone: lastAction.type };
  }

  // Undo all actions back to turn start (full undo)
  undoAllActions(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !player.turnStartState) {
      return { success: false, error: 'No actions to undo' };
    }

    // Restore state from turn start
    player.dicePool = this.deepClone(player.turnStartState.dicePool);
    player.freePips = player.turnStartState.freePips;
    player.score = player.turnStartState.score;
    player.diceFloor = player.turnStartState.diceFloor;
    
    // Clear action history
    const actionCount = player.currentTurnActions.length;
    player.currentTurnActions = [];
    
    this.addToLog(player.name, `Undid ${actionCount} actions, returned to turn start`, 'action');
    return { success: true, actionsUndone: actionCount };
  }

  // Generate 3 random factory effects for the game
  generateFactoryEffects() {
    const allEffects = [
      { name: "Job Fair", description: "Spend 2 free pips to recruit a d4" },
      { name: "Sales Strategy", description: "Tricks need 1 fewer die. One die returns when scoring" },
      { name: "Synergy", description: "All tricks count as having 1 additional die" },
      { name: "Corporate Debt", description: "Can go negative pips to -20. Lose points equal to debt" },
      { name: "Shiny Dice", description: "Pay 4 pips when recruiting/promoting for double points" },
      { name: "Rainbow Die", description: "Pay 3 pips for flexible dice in tricks" },
      { name: "Variable Dice Pool", description: "Pay 7 pips to increase minimum dice pool" },
      { name: "Corporate Recruiter", description: "Promote d8/d10/d12 for 1 less pip" },
      { name: "First Mover", description: "Get bonus points for being first" },
      { name: "Auto Balancer", description: "Player with fewest dice may take from player with most" }
    ];
    
    const shuffled = [...allEffects].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  // Check if a specific effect is active
  hasEffect(effectName) {
    return this.state.activeEffects.some(effect => effect.name === effectName);
  }

  // Get player by ID
  getPlayer(playerId) {
    return this.state.players.find(p => p.id === playerId);
  }

  // Get player view with private information
  getPlayerView(playerId) {
    const baseState = this.getGameState();
    
    // Try to find player by exact socket ID
    let currentPlayer = baseState.players.find(p => p.id === playerId);
    
    // Fallback for socket ID mismatch (reconnection scenarios)
    if (!currentPlayer && baseState.players.length <= 2) {
      currentPlayer = baseState.players[0];
    }
    
    return {
      ...baseState,
      currentPlayer: currentPlayer,
      exhaustedDice: currentPlayer ? this.getExhaustedDice(currentPlayer) : []
    };
  }

  // Determine which dice are exhausted/unusable
  getExhaustedDice(player) {
    return player.dicePool
      .filter(die => die.value === null || this.isDieExhausted(die, player))
      .map(die => die.id);
  }

  // Check if a die is exhausted
  isDieExhausted(die, player) {
    if (die.value === null) return true;
    
    // Check if die was used in any action this turn
    const wasUsedThisTurn = player.currentTurnActions.some(action => {
      if (action.data && action.data.diceIds) {
        return action.data.diceIds.includes(die.id);
      }
      if (action.data && action.data.recruitingDieId) {
        return action.data.recruitingDieId === die.id;
      }
      return false;
    });

    return wasUsedThisTurn;
  }

  // Roll dice for a player
  rollDice(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot roll dice now' };
    }

    // Save state before rolling
    this.savePlayerActionState(playerId, 'roll-dice', {});

    player.dicePool.forEach(die => {
      die.value = Math.floor(Math.random() * die.sides) + 1;
    });

    this.addToLog(player.name, `Rolled dice: ${player.dicePool.map(d => `d${d.sides}(${d.value})`).join(', ')}`, 'action');
    return { success: true };
  }

  // Free pip actions
  modifyDieValue(playerId, dieId, change) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot modify dice now' };
    }

    const cost = change > 0 ? 4 : -3; // Increase costs 4, decrease gives 3
    
    // Check if player has enough pips (allow negative with Corporate Debt)
    const maxDebt = this.hasEffect("Corporate Debt") ? -20 : 0;
    if (player.freePips - cost < maxDebt) {
      return { success: false, error: 'Not enough free pips' };
    }

    const die = player.dicePool.find(d => d.id === dieId);
    if (!die || die.value === null) {
      return { success: false, error: 'Cannot modify this die' };
    }

    // Save state before modification
    this.savePlayerActionState(playerId, 'modify-die', { dieId, change, cost });

    const oldValue = die.value;
    die.value = Math.max(1, Math.min(die.sides, die.value + change));
    player.freePips -= cost;

    this.addToLog(player.name, `Modified d${die.sides} from ${oldValue} to ${die.value}`, 'action');
    return { success: true };
  }

  // Reroll a die
  rerollDie(playerId, dieId) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot reroll dice now' };
    }

    if (player.freePips < 2) {
      return { success: false, error: 'Need 2 free pips to reroll' };
    }

    const die = player.dicePool.find(d => d.id === dieId);
    if (!die) {
      return { success: false, error: 'Die not found' };
    }

    // Save state before reroll
    this.savePlayerActionState(playerId, 'reroll-die', { dieId });

    const oldValue = die.value;
    die.value = Math.floor(Math.random() * die.sides) + 1;
    player.freePips -= 2;

    this.addToLog(player.name, `Rerolled d${die.sides} from ${oldValue} to ${die.value}`, 'action');
    return { success: true };
  }

  // Promote dice
  promoteDice(playerId, data) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot promote dice now' };
    }

    const { targetDieId, helperDieIds = [] } = data;
    const targetDie = player.dicePool.find(d => d.id === targetDieId);
    
    if (!targetDie || targetDie.value === null) {
      return { success: false, error: 'Invalid target die' };
    }

    // Save state before promotion
    this.savePlayerActionState(playerId, 'promote', { targetDieId, helperDieIds });

    // Calculate promotion cost and new size
    const sizeUpgrades = { 4: 6, 6: 8, 8: 10, 10: 12 };
    const newSize = sizeUpgrades[targetDie.sides];
    
    if (!newSize) {
      return { success: false, error: 'Cannot promote this die further' };
    }

    let baseCost = targetDie.sides;
    
    // Corporate Recruiter effect
    if (this.hasEffect("Corporate Recruiter") && targetDie.sides >= 8) {
      baseCost -= 1;
    }

    // Calculate total pips available
    let availablePips = targetDie.value;
    helperDieIds.forEach(id => {
      const helper = player.dicePool.find(d => d.id === id);
      if (helper && helper.value !== null) {
        availablePips += helper.value;
      }
    });

    if (availablePips < baseCost) {
      return { success: false, error: `Need ${baseCost} pips to promote d${targetDie.sides} to d${newSize}` };
    }

    // Perform promotion
    targetDie.sides = newSize;
    targetDie.value = null; // Used up in promotion
    
    // Use up helper dice
    helperDieIds.forEach(id => {
      const helper = player.dicePool.find(d => d.id === id);
      if (helper) {
        helper.value = null;
      }
    });

    // Add remaining pips as free pips
    player.freePips += (availablePips - baseCost);

    this.addToLog(player.name, `Promoted die to d${newSize}`, 'action');
    return { success: true };
  }

  // Recruit dice
  recruitDice(playerId, recruitingDieId) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot recruit dice now' };
    }

    const die = player.dicePool.find(d => d.id === recruitingDieId);
    if (!die || die.value === null) {
      return { success: false, error: 'Invalid recruiting die' };
    }

    // Save state before recruitment
    this.savePlayerActionState(playerId, 'recruit', { recruitingDieId });

    // Recruitment table
    const recruitTable = {
      4: { 1: 4 },
      6: { 1: 6, 2: 4 },
      8: { 1: 8, 2: 6, 3: 4 },
      10: { 1: 10, 2: 8, 3: 6, 4: 4 },
      12: { 1: 12, 2: 10, 3: 8, 4: 6, 5: 4 }
    };

    const recruitSize = recruitTable[die.sides]?.[die.value];
    if (!recruitSize) {
      return { success: false, error: 'This die cannot recruit' };
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

    // First Mover bonus
    if (this.hasEffect("First Mover") && !this.state.firstRecruits.has(recruitSize)) {
      this.state.firstRecruits.add(recruitSize);
      player.score += recruitSize;
      this.addToLog(player.name, `First Mover bonus! +${recruitSize} points`, 'score');
    }

    // Mark recruiting die as used
    die.value = null;

    this.addToLog(player.name, `Recruited d${recruitSize}`, 'action');
    return { success: true };
  }

  // Score straight
  scoreStraight(playerId, diceIds) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot score now' };
    }

    const selectedDice = diceIds.map(id => player.dicePool.find(d => d.id === id)).filter(Boolean);
    
    // Sales Strategy reduces required dice by 1
    const minDice = this.hasEffect("Sales Strategy") ? 2 : 3;
    if (selectedDice.length < minDice) {
      return { success: false, error: `Need at least ${minDice} dice for straight` };
    }

    // Save state before scoring
    this.savePlayerActionState(playerId, 'score-straight', { diceIds });

    // Validate straight
    const values = selectedDice.map(d => d.value).sort((a, b) => a - b);
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== values[i-1] + 1) {
        return { success: false, error: 'Dice must form a consecutive sequence' };
      }
    }

    // Calculate points
    const highestValue = Math.max(...values);
    let diceCount = selectedDice.length;
    
    // Synergy effect
    if (this.hasEffect("Synergy")) {
      diceCount += 1;
    }

    let points = highestValue * diceCount;

    // First Mover bonus
    let bonusMessage = '';
    if (this.hasEffect("First Mover") && !this.state.firstStraight) {
      this.state.firstStraight = true;
      points *= 2;
      bonusMessage = ' (First Mover: doubled!)';
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
      bonusMessage += ' (Sales Strategy: returned one die)';
    }

    this.replenishDicePool(player);
    this.addToLog(player.name, `Scored straight ${values.join('-')} for ${points} points${bonusMessage}`, 'score');
    return { success: true, points };
  }

  // Score set
  scoreSet(playerId, diceIds) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled || this.state.phase !== 'playing') {
      return { success: false, error: 'Cannot score now' };
    }

    const selectedDice = diceIds.map(id => player.dicePool.find(d => d.id === id)).filter(Boolean);
    
    // Sales Strategy reduces required dice by 1
    const minDice = this.hasEffect("Sales Strategy") ? 3 : 4;
    if (selectedDice.length < minDice) {
      return { success: false, error: `Need at least ${minDice} dice for set` };
    }

    // Save state before scoring
    this.savePlayerActionState(playerId, 'score-set', { diceIds });

    // Validate set
    const setValue = selectedDice[0].value;
    if (!selectedDice.every(d => d.value === setValue)) {
      return { success: false, error: 'All dice must show the same value' };
    }

    // Calculate points
    let diceCount = selectedDice.length;
    
    // Synergy effect
    if (this.hasEffect("Synergy")) {
      diceCount += 1;
    }

    let points = setValue * (diceCount + 1);

    // First Mover bonus
    let bonusMessage = '';
    if (this.hasEffect("First Mover") && !this.state.firstSet) {
      this.state.firstSet = true;
      points *= 2;
      bonusMessage = ' (First Mover: doubled!)';
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
      bonusMessage += ' (Sales Strategy: returned one die)';
    }

    this.replenishDicePool(player);
    this.addToLog(player.name, `Scored set of ${setValue}s for ${points} points${bonusMessage}`, 'score');
    return { success: true, points };
  }

  // Replenish dice pool to minimum
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

  // Player flees factory
  fleeFatory(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || !this.state.collapseStarted) {
      return { success: false, error: 'Cannot flee now' };
    }

    player.hasFled = true;
    this.addToLog(player.name, `FLED the factory with ${player.score} points!`, 'action');

    // Remove a collapse die
    if (this.state.collapseDice.length > 0) {
      const removedIndex = Math.floor(Math.random() * this.state.collapseDice.length);
      const removed = this.state.collapseDice.splice(removedIndex, 1)[0];
      this.addToLog("SYSTEM", `Removed d${removed} from collapse dice`, 'system');
    }

    // Check if all players have fled
    const remainingPlayers = this.state.players.filter(p => !p.hasFled);
    if (remainingPlayers.length === 0) {
      this.endGame(false);
      return { success: true };
    }

    return { success: true };
  }

  // Set player ready for simultaneous turns
  setPlayerReady(playerId) {
    const player = this.getPlayer(playerId);
    if (!player || player.hasFled) {
      return { success: false, error: 'Cannot end turn now' };
    }

    player.isReady = true;
    this.addToLog(player.name, 'Ready for next round', 'action');

    // Check if all active players are ready
    const activePlayers = this.state.players.filter(p => !p.hasFled);
    const allReady = activePlayers.every(p => p.isReady);

    if (allReady) {
      this.advanceRound();
    }

    return { success: true, allReady };
  }

  // Advance to next round
  advanceRound() {
    // Reset ready states and convert unused dice to free pips
    this.state.players.forEach(p => {
      p.isReady = false;
      p.dicePool.forEach(die => {
        if (die.value !== null) {
          p.freePips += die.value;
        }
        die.value = null;
      });
      this.savePlayerTurnState(p.id);
    });

    this.state.round++;
    this.state.turnCounter++;
    
    this.checkCollapse();
    this.addToLog("SYSTEM", `Round ${this.state.round} begins`);
  }

  // Check for factory collapse
  checkCollapse() {
    if (this.state.collapseStarted) {
      // Roll collapse dice
      const collapseRoll = this.state.collapseDice.reduce((sum, sides) => {
        return sum + Math.floor(Math.random() * sides) + 1;
      }, 0);
      
      this.state.lastCollapseRoll = `${collapseRoll}`;
      this.state.turnCounter -= collapseRoll;
      
      if (this.state.turnCounter <= 0) {
        this.endGame(true); // Factory collapsed
        return;
      }
    } else {
      // Check if collapse should start
      const collapseRoll = this.state.collapseDice.reduce((sum, sides) => {
        return sum + Math.floor(Math.random() * sides) + 1;
      }, 0);
      
      this.state.lastCollapseRoll = `${collapseRoll}`;
      
      if (collapseRoll < this.state.turnCounter) {
        this.state.collapseStarted = true;
        this.addToLog("SYSTEM", "⚠️ FACTORY COLLAPSE BEGINS!", 'system');
      }
    }
  }

  // End game
  endGame(collapsed) {
    this.state.phase = 'complete';
    
    if (collapsed) {
      // Anyone still in the factory gets 0 points
      this.state.players.forEach(p => {
        if (!p.hasFled) {
          p.score = 0;
          this.addToLog(p.name, "CRUSHED by factory collapse! Score: 0", 'system');
        }
      });
    }

    // Determine winner
    const winner = this.state.players.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    this.state.winner = winner.name;
    this.addToLog("SYSTEM", `🏆 GAME OVER! Winner: ${winner.name} with ${winner.score} points!`, 'system');
  }

  // Check if game is complete
  isGameComplete() {
    return this.state.phase === 'complete';
  }

  // Start a new game with same players
  startNewGame() {
    if (this.state.phase !== 'complete') {
      return { success: false, error: 'Cannot start new game - current game not finished' };
    }

    // Reset game state but keep same players
    const playerIds = this.state.players.map(p => ({ id: p.id, name: p.name }));
    const newGame = new DiceFactoryGame(playerIds);
    
    // Copy the new game state to this instance
    Object.assign(this.state, newGame.state);
    
    return { success: true };
  }

  // Get full game state
  getGameState() {
    return {
      type: this.state.type,
      phase: this.state.phase,
      round: this.state.round,
      turnCounter: this.state.turnCounter,
      collapseStarted: this.state.collapseStarted,
      collapseDice: this.state.collapseDice,
      activeEffects: this.state.activeEffects,
      winner: this.state.winner,
      lastCollapseRoll: this.state.lastCollapseRoll,
      gameLog: this.state.gameLog,
      allPlayersReady: this.state.players.filter(p => !p.hasFled).every(p => p.isReady),
      players: this.state.players.map(p => ({...p}))
    };
  }
}

module.exports = DiceFactoryGame;