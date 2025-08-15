
// 1001 Game Nights - Scoring System
// Version: 2.0.0 - Handles all scoring operations
// Updated: December 2024

const { validateStraight, validateSet } = require('../data/ValidationRules');
const { findDiceByIds, removeDiceByIds } = require('../utils/DiceHelpers');
const { logScore, logAction } = require('../utils/GameLogger');

class ScoringSystem {
  /**
   * Get score preview for selected dice
   * @param {Object} player - Player object
   * @param {Array} diceIds - Array of die IDs to score
   * @returns {Object} - {straights: Array, sets: Array, notes: Array}
   */
  getScorePreview(player, diceIds) {
    if (!player) return { straights: [], sets: [], notes: ['Player not found'] };
    const selectedDice = player.dicePool.filter(die => diceIds.includes(die.id));
    if (selectedDice.length === 0) return { straights: [], sets: [], notes: ['No valid dice selected'] };
    const hasVerticalIntegration = player.modifications?.includes('vertical_integration');
    const hasJointVenture = player.modifications?.includes('joint_venture');
    const straights = this.findPossibleStraights(selectedDice, hasVerticalIntegration);
    const sets = this.findPossibleSets(selectedDice, hasJointVenture);
    const notes = [];
    if (selectedDice.length < 3) notes.push('Need at least 3 dice for scoring');
    if (selectedDice.length >= 3 && straights.length === 0 && sets.length === 0) {
      notes.push('Selected dice do not form a valid straight (3+ consecutive values) or set (3+ same value)');
    }
    return { straights, sets, notes };
  }
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
    console.log('[scoreStraight] Player:', playerId, 'Dice IDs:', diceIds);
    if (!player) {
      console.log('[scoreStraight] Failed: Player not found');
      return { success: false, message: 'Player not found' };
    }
    const straightDice = require('../utils/DiceHelpers').findDiceByIds(player.dicePool, diceIds);
    console.log('[scoreStraight] Dice:', straightDice.map(d => `d${d.sides}:${d.value}`));
    if (straightDice.length !== diceIds.length) {
      console.log('[scoreStraight] Failed: Some dice not found in pool');
      return { success: false, message: 'Some dice not found in pool' };
    }
    // Validate straight
    const hasVerticalIntegration = player.modifications?.includes('vertical_integration');
    console.log('[scoreStraight] Vertical Integration:', hasVerticalIntegration);
    const validation = require('../data/ValidationRules').validateStraight(straightDice, hasVerticalIntegration);
    console.log('[scoreStraight] Validation result:', validation);
    if (!validation.isValid) {
      console.log('[scoreStraight] Failed: Validation reason:', validation.reason);
      return { success: false, message: validation.reason };
    }
    let points = validation.points;
    // Apply factory effects/modifications that might affect scoring
    points = this.applyScoreModifiers(player, 'straight', points, straightDice);
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
    console.log('[scoreStraight] Success: Scored', points, 'points');
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
    console.log('[calculateScoringOpportunities] Player:', playerId);
    if (!player) {
      console.log('[calculateScoringOpportunities] Failed: Player not found');
      return { straights: [], sets: [] };
    }
    const availableDice = player.dicePool.filter(die => 
      die.value !== null && !player.exhaustedDice?.includes(die.id)
    );
    console.log('[calculateScoringOpportunities] Available dice:', availableDice.map(d => `d${d.sides}:${d.value}`));
    const opportunities = {
      straights: [],
      sets: []
    };
    // Pass verticalIntegration flag to findPossibleStraights
    const hasVerticalIntegration = player.modifications?.includes('vertical_integration');
    console.log('[calculateScoringOpportunities] Vertical Integration:', hasVerticalIntegration);
    opportunities.straights = this.findPossibleStraights(availableDice, hasVerticalIntegration);
    // Find all possible sets
    opportunities.sets = this.findPossibleSets(availableDice);
    console.log('[calculateScoringOpportunities] Opportunities:', opportunities);
    return opportunities;
  }

  /**
   * Find possible straight combinations
   * @param {Array} dice - Available dice
   * @returns {Array} - Array of possible straight combinations
   */
  findPossibleStraights(dice, verticalIntegration = false) {
    const straights = [];
    console.log('[findPossibleStraights] Dice:', dice.map(d => `d${d.sides}:${d.value}`), 'Vertical Integration:', verticalIntegration);
    // Group dice by value
    const valueGroups = {};
    dice.forEach(die => {
      if (!valueGroups[die.value]) {
        valueGroups[die.value] = [];
      }
      valueGroups[die.value].push(die);
    });
    const values = Object.keys(valueGroups).map(Number).sort((a, b) => a - b);
    // Try all possible sequences of at least 3 dice
    for (let i = 0; i < values.length; i++) {
      for (let j = i + 2; j < values.length; j++) { // At least 3 dice for straight
        // Build candidate sequence
        const candidateValues = values.slice(i, j + 1);
        // Get dice for these values
        const candidateDice = candidateValues.map(v => valueGroups[v][0]);
        // Validate with verticalIntegration flag
        const validation = validateStraight(candidateDice, verticalIntegration);
        console.log('[findPossibleStraights] Candidate:', candidateValues, 'Validation:', validation);
        if (validation.isValid) {
          straights.push({
            dice: candidateDice,
            points: validation.points,
            description: `${candidateValues[0]}-${candidateValues[candidateValues.length-1]} straight${verticalIntegration ? ' (vertical integration)' : ''}`
          });
        }
      }
    }
    // If verticalIntegration is true, also try skipping one value in the sequence
    if (verticalIntegration) {
      for (let i = 0; i < values.length; i++) {
        for (let j = i + 3; j < values.length; j++) { // At least 4 dice for a gap
          for (let skip = i + 1; skip < j; skip++) {
            const candidateValues = values.slice(i, j + 1).filter((_, idx) => (i + idx) !== skip);
            const candidateDice = candidateValues.map(v => valueGroups[v][0]);
            const validation = validateStraight(candidateDice, true);
            console.log('[findPossibleStraights] Candidate (gap):', candidateValues, 'Skip:', values[skip], 'Validation:', validation);
            if (validation.isValid) {
              straights.push({
                dice: candidateDice,
                points: validation.points,
                description: `${candidateValues[0]}-${candidateValues[candidateValues.length-1]} straight (vertical integration, gap at ${values[skip]})`
              });
            }
          }
        }
      }
    }
    console.log('[findPossibleStraights] Found straights:', straights);
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