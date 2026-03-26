// 1001 Game Nights - Dice Factory Module Exports
// Version: 2.1.0 - Updated exports for split factory panels
// Updated: December 2024

// Main component - default export for easier importing
export { default } from './DiceFactoryGame';
export { default as DiceFactoryGame } from './DiceFactoryGame';

// Types
export * from './types/DiceFactoryTypes';

// Components
  export { default as GameHeader } from './components/game/GameHeader';
  export { default as GameLog } from './components/game/GameLog';
  export { default as ActiveFactoryEffects } from './components/market/ActiveFactoryEffects';
  export { default as ActiveFactoryModifications } from './components/market/ActiveFactoryModifications';
  export { default as PlayerDicePool } from './components/player/PlayerDicePool';
  export { default as PlayerList } from './components/player/PlayerList';
  export { default as DiceRenderer } from './components/player/DiceRenderer';

// Hooks
export { useGameState } from './hooks/useGameState';
export { useDiceActions } from './hooks/useDiceActions';