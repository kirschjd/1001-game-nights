// 1001 Game Nights - Game Logger Utility
// Version: 2.0.0 - Extracted logging functionality
// Updated: December 2024

const { LOG_TYPES } = require('../data/GameConstants');

/**
 * Format timestamp for log entries
 * @returns {string} - Formatted timestamp (HH:MM:SS)
 */
function formatTimestamp() {
  const now = new Date();
  return now.toTimeString().substring(0, 8);
}

/**
 * Create a log entry object
 * @param {string} playerName - Name of the player
 * @param {string} message - Log message
 * @param {string} actionType - Type of action (LOG_TYPES)
 * @param {number} round - Current round number
 * @returns {Object} - Log entry object
 */
function createLogEntry(playerName, message, actionType = LOG_TYPES.INFO, round = 1) {
  return {
    timestamp: formatTimestamp(),
    player: playerName,
    message: message,
    actionType: actionType,
    round: round
  };
}

/**
 * Add log entry to game log
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Name of the player
 * @param {string} message - Log message
 * @param {string} actionType - Type of action
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function addLogEntry(gameLog, playerName, message, actionType = LOG_TYPES.INFO, round = 1) {
  const entry = createLogEntry(playerName, message, actionType, round);
  return [...gameLog, entry];
}

/**
 * Log system message
 * @param {Array} gameLog - Current game log array
 * @param {string} message - System message
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logSystem(gameLog, message, round = 1) {
  return addLogEntry(gameLog, 'SYSTEM', message, LOG_TYPES.SYSTEM, round);
}

/**
 * Log player action
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {string} action - Action description
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logAction(gameLog, playerName, action, round = 1) {
  return addLogEntry(gameLog, playerName, action, LOG_TYPES.ACTION, round);
}

/**
 * Log scoring event
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {string} scoreType - Type of score (straight, set, etc.)
 * @param {number} points - Points scored
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logScore(gameLog, playerName, scoreType, points, round = 1) {
  const message = `scored ${points} points with ${scoreType}`;
  return addLogEntry(gameLog, playerName, message, LOG_TYPES.SCORE, round);
}

/**
 * Log error event
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {string} error - Error description
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logError(gameLog, playerName, error, round = 1) {
  return addLogEntry(gameLog, playerName, error, LOG_TYPES.ERROR, round);
}

/**
 * Log dice roll results
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {Array} diceResults - Array of dice roll results
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logDiceRoll(gameLog, playerName, diceResults, round = 1) {
  const diceStr = diceResults.map(die => `${die.value}(d${die.sides})`).join(', ');
  const message = `rolled: ${diceStr}`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Log dice recruitment
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {Array} recruitingDice - Dice used for recruitment
 * @param {Array} recruitedDice - Dice that were recruited
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logRecruitment(gameLog, playerName, recruitingDice, recruitedDice, round = 1) {
  const recruitingStr = recruitingDice.map(die => `${die.value}(d${die.sides})`).join(', ');
  const recruitedStr = recruitedDice.map(die => `d${die.sides}`).join(', ');
  const message = `recruited ${recruitedStr} using ${recruitingStr}`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Log dice promotion
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {Array} promotedDice - Dice that were promoted
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logPromotion(gameLog, playerName, promotedDice, round = 1) {
  const diceStr = promotedDice.map(die => `d${die.oldSides}→d${die.newSides}`).join(', ');
  const message = `promoted ${diceStr}`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Log dice processing for pips
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {Array} processedDice - Dice that were processed
 * @param {number} pipsGained - Number of pips gained
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logProcessing(gameLog, playerName, processedDice, pipsGained, round = 1) {
  const diceStr = processedDice.map(die => `${die.value}(d${die.sides})`).join(', ');
  const message = `processed ${diceStr} for ${pipsGained} pips`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Log factory effect or modification purchase
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {string} itemType - 'effect' or 'modification'
 * @param {string} itemName - Name of the item purchased
 * @param {number} cost - Cost in pips
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logFactoryPurchase(gameLog, playerName, itemType, itemName, cost, round = 1) {
  const message = `bought ${itemType}: "${itemName}" for ${cost} pips`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Log factory collapse events
 * @param {Array} gameLog - Current game log array
 * @param {string} collapseEvent - Type of collapse event
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logCollapse(gameLog, collapseEvent, round = 1) {
  return logSystem(gameLog, `FACTORY COLLAPSE: ${collapseEvent}`, round);
}

/**
 * Log player fleeing the factory
 * @param {Array} gameLog - Current game log array
 * @param {string} playerName - Player name
 * @param {number} finalScore - Player's final score
 * @param {number} round - Current round number
 * @returns {Array} - Updated game log array
 */
function logPlayerFlee(gameLog, playerName, finalScore, round = 1) {
  const message = `fled the factory with ${finalScore} points`;
  return logAction(gameLog, playerName, message, round);
}

/**
 * Get recent log entries
 * @param {Array} gameLog - Game log array
 * @param {number} count - Number of recent entries to get
 * @returns {Array} - Recent log entries
 */
function getRecentLogs(gameLog, count = 10) {
  return gameLog.slice(-count);
}

/**
 * Filter logs by type
 * @param {Array} gameLog - Game log array
 * @param {string} actionType - Type to filter by
 * @returns {Array} - Filtered log entries
 */
function filterLogsByType(gameLog, actionType) {
  return gameLog.filter(entry => entry.actionType === actionType);
}

/**
 * Filter logs by player
 * @param {Array} gameLog - Game log array
 * @param {string} playerName - Player name to filter by
 * @returns {Array} - Filtered log entries
 */
function filterLogsByPlayer(gameLog, playerName) {
  return gameLog.filter(entry => entry.player === playerName);
}

module.exports = {
  formatTimestamp,
  createLogEntry,
  addLogEntry,
  logSystem,
  logAction,
  logScore,
  logError,
  logDiceRoll,
  logRecruitment,
  logPromotion,
  logProcessing,
  logFactoryPurchase,
  logCollapse,
  logPlayerFlee,
  getRecentLogs,
  filterLogsByType,
  filterLogsByPlayer
};