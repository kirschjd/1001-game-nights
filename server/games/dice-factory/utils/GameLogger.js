// 1001 Game Nights - Dice Factory Game Logger
// Version: 3.0.0 - Stub (to be implemented)

/**
 * Appends a log entry and returns the updated log array.
 * @param {Array} gameLog
 * @param {string} playerId
 * @param {string} action
 * @param {Object} data
 * @returns {Array}
 */
const logAction = (gameLog, playerId, action, data) => {
  return [
    ...(gameLog || []),
    { timestamp: Date.now(), playerId, action, data },
  ];
};

module.exports = { logAction };
