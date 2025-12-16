// src/components/games/war/index.ts
// War game frontend module export barrel

export { default as EnhancedWarSetup } from './EnhancedWarSetup';
export { default as EnhancedWarGame } from './EnhancedWarGame';

// Hooks
export { default as useWarGame } from './hooks/useWarGame';
export { default as useWarActions } from './hooks/useWarActions';

// Types
export type {
  WarGameState,
  WarPlayer,
  WarVariant,
  BotConfig,
  GameAction
} from './types/WarTypes';

// Utils
export {
  getCardName,
  getCardEmoji,
  WAR_UI_CONSTANTS
} from './utils/cardHelpers';