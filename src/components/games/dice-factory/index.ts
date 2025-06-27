// 1001 Game Nights - Dice Factory Module Exports
// Version: 2.1.0 - Updated exports for split factory panels
// Updated: December 2024

// Main component - default export for easier importing
export { default } from './DiceFactoryGame';
export { default as DiceFactoryGame } from './DiceFactoryGame';

// Types
export * from './types/DiceFactoryTypes';

// Components
export { default as GameHeader } from './components/GameHeader';
export { default as FactoryEffects } from './components/FactoryEffects'; // Legacy component
export { default as ActiveFactoryEffects } from './components/ActiveFactoryEffects';
export { default as ActiveFactoryModifications } from './components/ActiveFactoryModifications';
export { default as PlayerDicePool } from './components/PlayerDicePool';
export { default as PlayerList } from './components/PlayerList';
export { default as GameLog } from './components/GameLog';
export { default as DiceRenderer } from './components/DiceRenderer';

// Hooks
export { useGameState } from './hooks/useGameState';
export { useDiceActions } from './hooks/useDiceActions';