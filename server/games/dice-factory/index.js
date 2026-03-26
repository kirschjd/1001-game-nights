// 1001 Game Nights - Dice Factory Module Exports
// Version: 3.0.0 - Fresh rewrite

const DiceFactoryGame = require('./DiceFactoryGame');

module.exports = DiceFactoryGame;
module.exports.DiceFactoryGame = DiceFactoryGame;

// Stub exports to satisfy legacy socket event requires during transition
module.exports.DiceHelpers = require('./utils/DiceHelpers');
module.exports.GameLogger = require('./utils/GameLogger');
