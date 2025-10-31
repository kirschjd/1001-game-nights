// 1001 Game Nights - Dice Factory Module Exports
// Version: 2.0.0 - Export barrel for clean backend imports
// Updated: December 2024

// Main game class - default export for compatibility
module.exports = require('./DiceFactoryGame');

// Also export as named export
module.exports.DiceFactoryGame = require('./DiceFactoryGame');

// Export all systems for potential direct access
module.exports.DiceSystem = require('./systems/DiceSystem');
module.exports.ScoringSystem = require('./systems/ScoringSystem');
module.exports.CollapseSystem = require('./systems/CollapseSystem');
module.exports.FactorySystem = require('./systems/FactorySystem');
module.exports.TurnSystem = require('./systems/TurnSystem');

// Export data modules
module.exports.GameConstants = require('./data/GameConstants');
module.exports.FactoryEffects = require('./data/FactoryEffects');
module.exports.FactoryModifications = require('./data/FactoryModifications');
module.exports.ValidationRules = require('./data/ValidationRules');

// Export utilities
module.exports.DiceHelpers = require('./utils/DiceHelpers');
module.exports.GameLogger = require('./utils/GameLogger');