// 1001 Game Nights - Dice Factory Game Logic
// Version: 2.0.0 - Modular refactor with system-based architecture
// Updated: December 2024

const { PHASES, GAME_DEFAULTS, PIP_COSTS } = require('./data/GameConstants');
const { createInitialDicePool, generateDieId } = require('./utils/DiceHelpers');
const { logSystem } = require('./utils/GameLogger');

// Import all systems
const DiceSystem = require('./systems/DiceSystem');
const ScoringSystem = require('./systems/ScoringSystem');
const CollapseSystem = require('./systems/CollapseSystem');
const FactorySystem = require('./systems/FactorySystem');
const TurnSystem = require('./systems/TurnSystem');

class DiceFactoryGame {
  constructor(players) {
    // Initialize game state
    this.state = {
      type: 'dice-factory',
      phase: PHASES.PLAYING,
      round: 1,
      turnCounter: 1,
      collapseStarted: false,
      collapseDice: [...GAME_DEFAULTS.COLLAPSE_DICE],
      winner: null,
      lastCollapseRoll: null,
      gameLog: [],
      firstRecruits: new Set(),
      firstStraight: false,
      firstSet: false,
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        dicePool: createInitialDicePool(),
        diceFloor: GAME_DEFAULTS.INITIAL_DICE_FLOOR,
        freePips: GAME_DEFAULTS.INITIAL_FREE_PIPS,
        score: GAME_DEFAULTS.INITIAL_SCORE,
        hasFled: false,
        isReady: false,
        exhaustedDice: [],
        currentTurnActions: [],
        turnStartState: null,
        // Factory system data
        effects: [],
        modifications: [],
        factoryHand: []
      }))
    };

    // Initialize systems
    this.diceSystem = new DiceSystem(this.state);
    this.scoringSystem = new ScoringSystem(this.state);
    this.collapseSystem = new CollapseSystem(this.state);
    this.factorySystem = new FactorySystem(this.state);
    this.turnSystem = new TurnSystem(this.state);

    // Initialize factory items and add to state
    this.factorySystem.initializeFactory();
    
    // Ensure the state has the factory arrays (for frontend compatibility)
    if (!this.state.availableEffects) this.state.availableEffects = [];
    if (!this.state.availableModifications) this.state.availableModifications = [];

    // Auto-roll initial dice for all players
    for (const player of this.state.players) {
      this.turnSystem.autoRollPlayerDice(player);
    }

    // Log game start
    this.state.gameLog = logSystem(
      this.state.gameLog,
      "=== DICE FACTORY GAME STARTED ===",
      this.state.round
    );

    const availableItems = this.factorySystem.getAvailableFactoryItems();
    this.state.gameLog = logSystem(
      this.state.gameLog,
      `Available effects: ${availableItems.effects.map(e => e.name).join(', ')}`,
      this.state.round
    );
    this.state.gameLog = logSystem(
      this.state.gameLog,
      `Available modifications: ${availableItems.modifications.map(m => m.name).join(', ')}`,
      this.state.round
    );
  }

  // ===== DICE OPERATIONS =====

  /**
   * Recruit dice using existing dice
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to use for recruitment
   * @returns {Object} - {success: boolean, error?: string}
   */
  recruitDice(playerId, diceIds) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.diceSystem.recruitDice(playerId, diceIds);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'recruit_dice', { diceIds });
      
      this.saveActionState(playerId, 'recruit', { diceIds });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Promote dice to next size
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to promote
   * @returns {Object} - {success: boolean, error?: string}
   */
  promoteDice(playerId, diceIds) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.diceSystem.promoteDice(playerId, diceIds);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'promote_dice', { diceIds });
      this.saveActionState(playerId, 'recruit', { diceIds });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Process dice for pips
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to process
   * @returns {Object} - {success: boolean, error?: string}
   */
  processDice(playerId, diceIds) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.diceSystem.processDice(playerId, diceIds);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'process_dice', { diceIds });
      this.saveActionState(playerId, 'process', { 
        diceIds, 
        pipsGained: result.pipsGained 
      });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  // ===== DICE MODIFICATIONS =====

  /**
   * Modify die value (increase/decrease)
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to modify
   * @param {number} change - Change amount (+1 or -1)
   * @returns {Object} - {success: boolean, error?: string}
   */
  modifyDieValue(playerId, dieId, change) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const cost = change > 0 ? PIP_COSTS.INCREASE_DIE : PIP_COSTS.DECREASE_DIE;
    const result = this.diceSystem.modifyDieValue(playerId, dieId, change, cost);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'modify_die', { dieId, change });
      this.saveActionState(playerId, 'modify_value', { 
        dieId, 
        change, 
        cost 
      });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Reroll a die
   * @param {string} playerId - Player ID
   * @param {string} dieId - ID of die to reroll
   * @returns {Object} - {success: boolean, error?: string}
   */
  rerollDie(playerId, dieId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.diceSystem.rerollDie(playerId, dieId, PIP_COSTS.REROLL_DIE);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'reroll_die', { dieId });
      // Save state for undo with deterministic reroll data
      this.saveActionState(playerId, 'reroll', { 
        dieId, 
        oldValue, 
        newValue, // Store the result so undo/redo is deterministic
        cost: require('./data/GameConstants').PIP_COSTS.REROLL_DIE 
      });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  // ===== SCORING OPERATIONS =====

  /**
   * Score a straight
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to use for straight
   * @returns {Object} - {success: boolean, error?: string, points?: number}
   */
  scoreStraight(playerId, diceIds) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.scoringSystem.scoreStraight(playerId, diceIds);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'score_straight', { diceIds });
      this.diceSystem.enforceMinimumDiceFloor(playerId);
      // Save state for undo
      this.saveActionState(playerId, 'score_straight', { 
        diceIds, 
        points: result.points 
      });
    }
    
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      points: result.points 
    };
  }

  /**
   * Score a set
   * @param {string} playerId - Player ID  
   * @param {Array} diceIds - IDs of dice to use for set
   * @returns {Object} - {success: boolean, error?: string, points?: number}
   */
  scoreSet(playerId, diceIds) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.scoringSystem.scoreSet(playerId, diceIds);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'score_set', { diceIds });
      this.diceSystem.enforceMinimumDiceFloor(playerId);
      // Save state for undo
      this.saveActionState(playerId, 'score_set', { 
        diceIds, 
        points: result.points 
      });
    }
    
    return { 
      success: result.success, 
      error: result.success ? undefined : result.message,
      points: result.points 
    };
  }

  // ===== FACTORY OPERATIONS =====

  /**
   * Purchase factory effect
   * @param {string} playerId - Player ID
   * @param {string} effectId - Effect ID to purchase
   * @returns {Object} - {success: boolean, error?: string}
   */
  buyFactoryEffect(playerId, effectId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.factorySystem.purchaseEffect(playerId, effectId);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'buy_effect', { effectId });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Purchase factory modification
   * @param {string} playerId - Player ID
   * @param {string} modificationId - Modification ID to purchase
   * @returns {Object} - {success: boolean, error?: string}
   */
  buyFactoryModification(playerId, modificationId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.factorySystem.purchaseModification(playerId, modificationId);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'buy_modification', { modificationId });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

    /**
   * Handle factory action (purchase effect or modification)
   * @param {string} playerId - Player ID
   * @param {string} actionType - 'effect' or 'modification'
   * @param {string} targetId - ID of effect/modification to purchase
   * @returns {Object} - {success: boolean, error?: string}
   */
  factoryAction(playerId, actionType, targetId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    let result;
    
    if (actionType === 'effect') {
      result = this.factorySystem.purchaseEffect(playerId, targetId);
    } else if (actionType === 'modification') {
      // This should not be called directly for modifications since they use bidding
      return { success: false, error: 'Modifications must be bid on, not purchased directly' };
    } else {
      return { success: false, error: `Unknown factory action type: ${actionType}` };
    }
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, `factory_${actionType}`, { targetId });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Play factory effect from hand
   * @param {string} playerId - Player ID
   * @param {string} effectId - Effect ID to play
   * @returns {Object} - {success: boolean, error?: string}
   */
  playFactoryEffect(playerId, effectId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    const result = this.factorySystem.playEffect(playerId, effectId);
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'play_effect', { effectId });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }
  
  /**
   * Handle factory action (purchase effect or modification)
   * @param {string} playerId - Player ID
   * @param {string} actionType - 'effect' or 'modification'
   * @param {string} targetId - ID of effect/modification to purchase
   * @returns {Object} - {success: boolean, error?: string}
   */
  factoryAction(playerId, actionType, targetId) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }

    let result;
    
    if (actionType === 'effect') {
      result = this.factorySystem.purchaseEffect(playerId, targetId);
    } else if (actionType === 'modification') {
      // This should not be called directly for modifications since they use bidding
      return { success: false, error: 'Modifications must be bid on, not purchased directly' };
    } else {
      return { success: false, error: `Unknown factory action type: ${actionType}` };
    }
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, `factory_${actionType}`, { targetId });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }
  // ===== TURN MANAGEMENT =====

  /**
   * Set player as ready (end turn)
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  setPlayerReady(playerId) {
    const result = this.turnSystem.setPlayerReady(playerId);
    
    // Check for collapse after turn ends
    if (result.success) {
      this.processEndOfTurn();
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Undo player's entire turn
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  undoTurn(playerId) {
    const result = this.turnSystem.undoPlayerTurn(playerId);
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  // ===== COLLAPSE SYSTEM =====

  /**
   * Player flees the factory
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  fleeFatory(playerId) { // Note: keeping typo for compatibility
    const result = this.collapseSystem.playerFlees(playerId);
    
    if (result.success) {
      // Check if game should end
      if (this.collapseSystem.isCollapseComplete()) {
        this.endGame();
      }
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  // ===== GAME FLOW =====

  /**
   * Handle deterministic reroll for undo/redo support
   * @param {string} playerId - Player ID
   * @param {string} dieId - Die ID to reroll
   * @param {number} predeterminedValue - Value to set (for redo after undo)
   * @returns {Object} - Result
   */
  rerollDieWithValue(playerId, dieId, predeterminedValue) {
    if (!this.canPlayerAct(playerId)) {
      return { success: false, error: 'Player cannot act' };
    }
  
    const result = this.diceSystem.rerollDie(
      playerId, 
      dieId, 
      require('./data/GameConstants').PIP_COSTS.REROLL_DIE,
      predeterminedValue
    );
    
    if (result.success) {
      this.turnSystem.recordPlayerAction(playerId, 'reroll_die', { dieId });
      // Save state for undo with the predetermined value
      this.saveActionState(playerId, 'reroll', { 
        dieId, 
        newValue: predeterminedValue,
        cost: require('./data/GameConstants').PIP_COSTS.REROLL_DIE 
      });
    }
    
    return { success: result.success, error: result.success ? undefined : result.message };
  }

  /**
   * Save player state after an action (for undo functionality)
   * @param {string} playerId - Player ID
   * @param {string} actionType - Type of action performed
   * @param {Object} actionData - Additional action data (like random results)
   */
  saveActionState(playerId, actionType, actionData = {}) {
  const player = this.state.players.find(p => p.id === playerId);
  if (!player) return;

  // Initialize action history if it doesn't exist
  if (!player.actionHistory) {
    player.actionHistory = [];
  }

  // Save current state snapshot
  const stateSnapshot = {
    timestamp: Date.now(),
    actionType,
    actionData,
    playerState: {
      dicePool: JSON.parse(JSON.stringify(player.dicePool)),
      freePips: player.freePips,
      score: player.score,
      exhaustedDice: [...(player.exhaustedDice || [])],
      // Don't save modifications/effects as they shouldn't be undoable
    }
  };

  player.actionHistory.push(stateSnapshot);

  // Limit history to prevent memory issues (keep last 10 actions)
  if (player.actionHistory.length > 10) {
    player.actionHistory.shift();
  }
  }
  
  /**
   * Undo the last action for a player
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  undoLastAction(playerId) {
  const player = this.state.players.find(p => p.id === playerId);
  
  if (!player) {
    return { success: false, error: 'Player not found' };
  }

  if (player.hasFled) {
    return { success: false, error: 'Cannot undo after fleeing' };
  }

  if (player.isReady) {
    return { success: false, error: 'Cannot undo after ending turn' };
  }

  if (!player.actionHistory || player.actionHistory.length === 0) {
    return { success: false, error: 'No actions to undo' };
  }

  // Remove the current state (last action result)
  const lastAction = player.actionHistory.pop();
  
  if (player.actionHistory.length === 0) {
    // If no more history, restore to turn start state
    if (player.turnStartState) {
      player.dicePool = JSON.parse(JSON.stringify(player.turnStartState.dicePool));
      player.freePips = player.turnStartState.freePips;
      player.score = player.turnStartState.score;
      player.exhaustedDice = [];
    }
  } else {
    // Restore to previous action state
    const previousState = player.actionHistory[player.actionHistory.length - 1];
    player.dicePool = JSON.parse(JSON.stringify(previousState.playerState.dicePool));
    player.freePips = previousState.playerState.freePips;
    player.score = previousState.playerState.score;
    player.exhaustedDice = [...previousState.playerState.exhaustedDice];
  }

  this.state.gameLog = require('./utils/GameLogger').logAction(
    this.state.gameLog,
    player.name,
    `undid last action: ${lastAction.actionType}`,
    this.state.round
  );

  return { success: true };
  }


  /**
   * Process end-of-turn events (collapse checks, etc.)
   */
  processEndOfTurn() {
    // Only process if all players are ready
    if (!this.turnSystem.areAllPlayersReady()) {
      return;
    }

    // Check for collapse start
    const collapseCheck = this.collapseSystem.checkForCollapseStart();
    
    // If collapse is active, process collapse phase
    if (this.state.collapseStarted) {
      const collapseResult = this.collapseSystem.processCollapsePhase();
      
      if (collapseResult.gameEnded) {
        this.endGame();
        return;
      }
    }

    // Process factory triggers
    this.factorySystem.processTriggers('turn_end');

    // Check other end conditions
    const endCheck = this.turnSystem.checkTurnEndConditions();
    if (endCheck.shouldEnd) {
      this.endGame();
    }
  }

  /**
   * End the game and determine winner
   */
  endGame() {
    this.state.phase = PHASES.COMPLETE;
    
    // Determine winner (highest score)
    const winner = this.state.players.reduce((best, current) => 
      current.score > best.score ? current : best
    );
    
    this.state.winner = winner.name;
    
    this.state.gameLog = logSystem(
      this.state.gameLog,
      `🏆 GAME OVER! Winner: ${winner.name} with ${winner.score} points!`,
      this.state.round
    );
  }

  /**
   * Save player turn state (compatibility method)
   * @param {string} playerId - Player ID
   * @returns {Object} - {success: boolean, error?: string}
   */
  savePlayerTurnState(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    // Use the turn system to save state
    this.turnSystem.saveTurnState(player);
    
    return { success: true };
  }

  /**
   * Get player by ID (compatibility method)
   * @param {string} playerId - Player ID
   * @returns {Object|null} - Player object or null
   */
  getPlayer(playerId) {
    return this.state.players.find(p => p.id === playerId) || null;
  }

  /**
   * Process a general game action (compatibility method)
   * @param {string} playerId - Player ID
   * @param {Object} action - Action object
   * @returns {Object} - {success: boolean, error?: string}
   */
  processAction(playerId, action) {
    // Route to appropriate system based on action type
    switch (action.action) {
      case 'recruit':
        return this.recruitDice(playerId, action.diceIds);
      case 'promote':
        return this.promoteDice(playerId, action.diceIds);
      case 'score-straight':
        return this.scoreStraight(playerId, action.diceIds);
      case 'score-set':
        return this.scoreSet(playerId, action.diceIds);
      case 'process':
        return this.processDice(playerId, action.diceIds);
      case 'pip-action':
        if (action.actionType === 'reroll') {
          return this.rerollDie(playerId, action.diceIds[0]);
        } else {
          const change = action.actionType === 'increase' ? 1 : -1;
          return this.modifyDieValue(playerId, action.diceIds[0], change);
        }
      case 'factory-action':
        if (action.actionType === 'effect') {
          // Would need effect ID - this is a placeholder
          return { success: false, error: 'Effect ID required' };
        } else {
          // Would need modification ID - this is a placeholder  
          return { success: false, error: 'Modification ID required' };
        }
      case 'end-turn':
        return this.setPlayerReady(playerId);
      case 'flee':
        return this.fleeFatory(playerId);
      case 'undo':
        return this.undoTurn(playerId);
      default:
        return { success: false, error: `Unknown action: ${action.action}` };
    }
  }
  
  // ===== BOT SUPPORT METHODS =====

  /**
   * Get pending bot players (those who haven't ended their turn)
   * @returns {Array} - Array of bot players that need to act
   */
  getPendingBotPlayers() {
    if (this.state.phase !== 'playing') return [];
    
    return this.state.players.filter(p => 
      p.isBot && 
      !p.isReady && 
      !p.hasFled &&
      this.canPlayerAct(p.id)
    );
  }

  /**
   * Check if it's a specific player's turn to act
   * @param {string} playerId - Player ID to check
   * @returns {boolean} - True if player can act
   */
  isPlayerTurn(playerId) {
    const player = this.state.players.find(p => p.id === playerId);
    if (!player) return false;
    
    return !player.isReady && 
           !player.hasFled && 
           this.state.phase === 'playing' &&
           this.canPlayerAct(playerId);
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if player can take actions
   * @param {string} playerId - Player ID
   * @returns {boolean}
   */
  canPlayerAct(playerId) {
    const result = this.turnSystem.canPlayerAct(playerId);
    return result.canAct;
  }

  /**
   * Check if game is complete
   * @returns {boolean}
   */
  isGameComplete() {
    return this.state.phase === PHASES.COMPLETE;
  }

  /**
   * Start a new game with same players
   * @returns {Object} - {success: boolean, error?: string}
   */
  startNewGame() {
    if (this.state.phase !== PHASES.COMPLETE) {
      return { success: false, error: 'Cannot start new game - current game not finished' };
    }

    // Reset all systems
    this.collapseSystem.resetCollapseState();
    this.turnSystem.resetTurnSystem();
    this.factorySystem.resetFactory();

    // Reset game state
    this.state.phase = PHASES.PLAYING;
    this.state.winner = null;
    this.state.lastCollapseRoll = null;
    this.state.gameLog = [];
    this.state.firstRecruits.clear();
    this.state.firstStraight = false;
    this.state.firstSet = false;

    // Reset players
    for (const player of this.state.players) {
      player.dicePool = createInitialDicePool();
      player.freePips = GAME_DEFAULTS.INITIAL_FREE_PIPS;
      player.score = GAME_DEFAULTS.INITIAL_SCORE;
      player.hasFled = false;
      player.isReady = false;
      player.exhaustedDice = [];
      player.currentTurnActions = [];
      player.turnStartState = null;
      player.effects = [];
      player.modifications = [];
      player.factoryHand = [];
    }

    // Reinitialize factory
    this.factorySystem.initializeFactory();

    this.state.gameLog = logSystem(
      this.state.gameLog,
      "=== NEW DICE FACTORY GAME STARTED ===",
      this.state.round
    );

    return { success: true };
  }

  /**
   * Get full game state
   * @returns {Object} - Complete game state
   */
  getGameState() {
    return {
      type: this.state.type,
      phase: this.state.phase,
      round: this.state.round,
      turnCounter: this.state.turnCounter,
      collapseStarted: this.state.collapseStarted,
      collapseDice: this.state.collapseDice,
      winner: this.state.winner,
      lastCollapseRoll: this.state.lastCollapseRoll,
      gameLog: this.state.gameLog,
      allPlayersReady: this.turnSystem.areAllPlayersReady(),
      players: this.state.players.map(p => ({...p})),
      // Frontend expects 'activeEffects' - provide both available effects and modifications
      activeEffects: [
        ...(this.state.availableEffects || []),
        ...(this.state.availableModifications || [])
      ],
      // Also provide the new separate arrays
      availableEffects: this.state.availableEffects || [],
      availableModifications: this.state.availableModifications || []
    };
  }

  /**
   * Get player-specific view of game state
   * @param {string} playerId - Player ID
   * @returns {Object} - Player-specific game state
   */
  getPlayerView(playerId) {
    const baseState = this.getGameState();
    
    // Find current player
    let currentPlayer = baseState.players.find(p => p.id === playerId);
    
    // Fallback for socket ID mismatch (reconnection scenarios)
    if (!currentPlayer && baseState.players.length <= 2) {
      currentPlayer = baseState.players[0];
    }
    
    return {
      ...baseState,
      currentPlayer: currentPlayer,
      exhaustedDice: currentPlayer?.exhaustedDice || []
    };
  }
}

module.exports = DiceFactoryGame;