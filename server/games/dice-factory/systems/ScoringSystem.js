// 1001 Game Nights - Scoring System
// Version: 2.0.0 - Handles all scoring operations
// Updated: December 2024

const { validateStraight, validateSet } = require('../data/ValidationRules');
const { findDiceByIds, removeDiceByIds } = require('../utils/DiceHelpers');
const { logScore, logAction } = require('../utils/GameLogger');

class ScoringSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  /**
   * Apply score modifiers from factory effects/modifications - UPDATED with synergy
   * @param {Object} player - Player object
   * @param {string} scoreType - 'straight' or 'set'
   * @param {number} basePoints - Base points before modifiers
   * @param {Array} dice - Dice used in scoring
   * @returns {number} - Modified points
   */
  applyScoreModifiers(player, scoreType, basePoints, dice) {
    let modifiedPoints = basePoints;

    // Apply Synergy modification - counts as having 1 additional die
    if (player.modifications?.includes('synergy')) {
      if (scoreType === 'straight') {
        // Straight: base formula is highest value × dice count
        // With synergy: highest value × (dice count + 1)
        const highestValue = Math.max(...dice.map(d => d.value));
        modifiedPoints = highestValue * (dice.length + 1);
      } else if (scoreType === 'set') {
        // Set: base formula is value × (dice count + 1)
        // With synergy: value × (dice count + 2)
        const setValue = dice[0].value; // All dice have same value in a set
        modifiedPoints = setValue * (dice.length + 2);
      }

      // Log the synergy bonus
      this.gameState.gameLog = require('../utils/GameLogger').logAction(
        this.gameState.gameLog,
        player.name,
        `synergy added +1 effective die for +${modifiedPoints - basePoints} points`,
        this.gameState.round
      );
    }

    return modifiedPoints;
  }

  /**
   * Score a straight with selected dice - UPDATED with synergy support
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to use for straight
   * @returns {Object} - {success: boolean, message: string, points?: number}
   */
  scoreStraight(playerId, diceIds) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    const straightDice = require('../utils/DiceHelpers').findDiceByIds(player.dicePool, diceIds);

    if (straightDice.length !== diceIds.length) {
      return { success: false, message: 'Some dice not found in pool' };
    }

    // Validate straight
    const hasVerticalIntegration = player.modifications?.includes('vertical_integration');
    const validation = require('../data/ValidationRules').validateStraight(straightDice, hasVerticalIntegration);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }

    let points = validation.points;

    // Apply factory effects/modifications that might affect scoring
    points = this.applyScoreModifiers(player, 'straight', points, straightDice);

    // Check for first straight bonus
    if (!this.gameState.firstStraight) {
      this.gameState.firstStraight = true;
      points += 5;
      this.gameState.gameLog = require('../utils/GameLogger').logAction(
        this.gameState.gameLog,
        player.name,
        'earned 5 bonus points for first straight of the game',
        this.gameState.round
      );
    }

    // Remove dice from pool and add points
    let diceToRemove = diceIds;
    if (player.modifications?.includes('patent_protection')) {
      // Keep the highest-value die
      const scoredDice = require('../utils/DiceHelpers').findDiceByIds(player.dicePool, diceIds);
      if (scoredDice.length > 0) {
        const highestDie = scoredDice.reduce((a, b) => (a.value > b.value ? a : b));
        // Remove all except the highest-value die
        diceToRemove = diceIds.filter(id => id !== highestDie.id);
        this.gameState.gameLog = require('../utils/GameLogger').logAction(
          this.gameState.gameLog,
          player.name,
          `Patent Protection: kept d${highestDie.sides} showing ${highestDie.value} from scored trick`,
          this.gameState.round
        );
      }
    }
    player.dicePool = require('../utils/DiceHelpers').removeDiceByIds(player.dicePool, diceToRemove);
    player.score += points;

    // Log scoring
    this.gameState.gameLog = require('../utils/GameLogger').logScore(
      this.gameState.gameLog,
      player.name,
      `straight (${straightDice.length} dice)`,
      points,
      this.gameState.round
    );

    return { 
      success: true, 
      message: `Scored ${points} points with straight`,
      points 
    };
  }

  /**
   * Score a set with selected dice - UPDATED with synergy support
   * @param {string} playerId - Player ID
   * @param {Array} diceIds - IDs of dice to use for set
   * @returns {Object} - {success: boolean, message: string, points?: number}
   */
  scoreSet(playerId, diceIds) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { success: false, message: 'Player not found' };
    }
  
    const setDice = require('../utils/DiceHelpers').findDiceByIds(player.dicePool, diceIds);
    
    if (setDice.length !== diceIds.length) {
      return { success: false, message: 'Some dice not found in pool' };
    }
  
    // Validate set
    const hasJointVenture = player.modifications?.includes('joint_venture');
    const validation = require('../data/ValidationRules').validateSet(setDice, hasJointVenture);
    if (!validation.isValid) {
      return { success: false, message: validation.reason };
    }
  
    let points = validation.points;
  
    // Apply factory effects/modifications that might affect scoring
    points = this.applyScoreModifiers(player, 'set', points, setDice);
  
    // Check for first set bonus
    if (!this.gameState.firstSet) {
      this.gameState.firstSet = true;
      points += 5;
      this.gameState.gameLog = require('../utils/GameLogger').logAction(
        this.gameState.gameLog,
        player.name,
        'earned 5 bonus points for first set of the game',
        this.gameState.round
      );
    }
  
    // Remove dice from pool and add points
    let diceToRemove = diceIds;
    if (player.modifications?.includes('patent_protection')) {
      // Keep the highest-value die
      const scoredDice = require('../utils/DiceHelpers').findDiceByIds(player.dicePool, diceIds);
      if (scoredDice.length > 0) {
        const highestDie = scoredDice.reduce((a, b) => (a.value > b.value ? a : b));
        // Remove all except the highest-value die
        diceToRemove = diceIds.filter(id => id !== highestDie.id);
        this.gameState.gameLog = require('../utils/GameLogger').logAction(
          this.gameState.gameLog,
          player.name,
          `Patent Protection: kept d${highestDie.sides} showing ${highestDie.value} from scored trick`,
          this.gameState.round
        );
      }
    }
    player.dicePool = require('../utils/DiceHelpers').removeDiceByIds(player.dicePool, diceToRemove);
    player.score += points;
  
    // Log scoring
    this.gameState.gameLog = require('../utils/GameLogger').logScore(
      this.gameState.gameLog,
      player.name,
      `set (${setDice.length} dice of ${setDice[0].value}s)`,
      points,
      this.gameState.round
    );
  
    return { 
      success: true, 
      message: `Scored ${points} points with set`,
      points 
    };
  }

  /**
   * Calculate potential scoring opportunities for a player
   * @param {string} playerId - Player ID
   * @returns {Object} - {straights: Array, sets: Array}
   */
  calculateScoringOpportunities(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return { straights: [], sets: [] };
    }

    const availableDice = player.dicePool.filter(die => 
      die.value !== null && !player.exhaustedDice?.includes(die.id)
    );

    const opportunities = {
      straights: [],
      sets: []
    };

    // Find all possible straights (this is computationally intensive, so we'll do a basic check)
    opportunities.straights = this.findPossibleStraights(availableDice);
    
    // Find all possible sets
    opportunities.sets = this.findPossibleSets(availableDice);

    return opportunities;
  }

  /**
   * Find possible straight combinations
   * @param {Array} dice - Available dice
   * @returns {Array} - Array of possible straight combinations
   */
  findPossibleStraights(dice) {
    const straights = [];
    
    // Group dice by value
    const valueGroups = {};
    dice.forEach(die => {
      if (!valueGroups[die.value]) {
        valueGroups[die.value] = [];
      }
      valueGroups[die.value].push(die);
    });

    const values = Object.keys(valueGroups).map(Number).sort((a, b) => a - b);
    
    // Find consecutive sequences
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 2; j < values.length; j++) { // At least 3 dice for straight
        let isConsecutive = true;
        for (let k = i; k < j; k++) {
          if (values[k + 1] !== values[k] + 1) {
            isConsecutive = false;
            break;
          }
        }
        
        if (isConsecutive) {
          const straightDice = [];
          for (let k = i; k <= j; k++) {
            straightDice.push(valueGroups[values[k]][0]); // Take one die of each value
          }
          
          const validation = validateStraight(straightDice);
          if (validation.isValid) {
            straights.push({
              dice: straightDice,
              points: validation.points,
              description: `${values[i]}-${values[j]} straight`
            });
          }
        }
      }
    }

    return straights;
  }

  /**
   * Find possible set combinations
   * @param {Array} dice - Available dice
   * @returns {Array} - Array of possible set combinations
   */
  findPossibleSets(dice) {
    const sets = [];
    
    // Group dice by value
    const valueGroups = {};
    dice.forEach(die => {
      if (!valueGroups[die.value]) {
        valueGroups[die.value] = [];
      }
      valueGroups[die.value].push(die);
    });

    // Check each value group for potential sets
    Object.entries(valueGroups).forEach(([value, diceGroup]) => {
      const numValue = parseInt(value);
      
      // Try different set sizes (4+)
      for (let setSize = 4; setSize <= diceGroup.length; setSize++) {
        const setDice = diceGroup.slice(0, setSize);
        const validation = validateSet(setDice);
        
        if (validation.isValid) {
          sets.push({
            dice: setDice,
            points: validation.points,
            description: `${setSize} ${numValue}s`
          });
        }
      }
    });

    return sets;
  }

  /**
   * Get player's current score and potential
   * @param {string} playerId - Player ID
   * @returns {Object} - {currentScore: number, potentialScore: number, opportunities: Object}
   */
  getPlayerScoreAnalysis(playerId) {
    const player = this.gameState.players.find(p => p.id === playerId);
    
    if (!player) {
      return null;
    }

    const opportunities = this.calculateScoringOpportunities(playerId);
    
    let maxPotentialScore = 0;
    opportunities.straights.forEach(straight => {
      maxPotentialScore = Math.max(maxPotentialScore, straight.points);
    });
    opportunities.sets.forEach(set => {
      maxPotentialScore = Math.max(maxPotentialScore, set.points);
    });

    return {
      currentScore: player.score,
      potentialScore: player.score + maxPotentialScore,
      opportunities: opportunities,
      maxSingleScore: maxPotentialScore
    };
  }
}

module.exports = ScoringSystem;