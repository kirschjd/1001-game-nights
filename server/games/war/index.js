// server/games/war/index.js
// War game module export barrel

const WarGame = require('./WarGame');
const EnhancedWarGame = require('./EnhancedWarGame');
const setupWarEvents = require('./events');
const VariantRegistry = require('./variants/VariantRegistry');
const { WAR_CONSTANTS } = require('./utils/warConstants');

module.exports = {
  // Game classes
  WarGame,
  EnhancedWarGame,
  
  // Event setup
  setupWarEvents,
  
  // Variant system
  VariantRegistry,
  
  // Constants
  WAR_CONSTANTS,
  
  // Convenience functions
  createWarGame: (players, variant = 'regular') => {
    return new EnhancedWarGame(players, variant);
  },
  
  getAvailableVariants: () => {
    return VariantRegistry.getAllVariants();
  }
};