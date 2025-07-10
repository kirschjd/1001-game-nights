// 1001 Game Nights - Dice Factory Type Definitions
// Version: 2.0.1 - Added process to ActionMode
// Updated: December 2024

import { Socket } from 'socket.io-client';

export interface Die {
  id: string;
  sides: number;
  value: number | null;
  shiny: boolean;
  rainbow: boolean;
}

export interface Player {
  id: string;
  name: string;
  dicePool: Die[];
  diceFloor: number;
  freePips: number;
  score: number;
  hasFled: boolean;
  isReady: boolean;
  currentTurnActions?: any[];
  turnStartState?: any;
  actionHistory?: any[];
  modifications?: string[]; // Array of modification IDs the player owns
  effects?: string[]; // Array of effect IDs the player has played
  factoryHand?: string[]; // Array of effect IDs in player's hand
  exhaustedDice?: string[]; // Array of dice IDs that are exhausted this turn
}

export interface GameLogEntry {
  timestamp: string;
  player: string;
  message: string;
  actionType: 'info' | 'action' | 'score' | 'system' | 'error';
  round: number;
}

export interface FactoryEffect {
  name: string;
  description: string;
  type: 'effect' | 'modification';
  cost: number;
}

export interface DiceFactoryGameState {
  type: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete';
  round: number;
  turnCounter: number;
  collapseStarted: boolean;
  collapseDice: number[];
  activeEffects: FactoryEffect[];
  winner: string | null;
  lastCollapseRoll: string | null;
  gameLog: GameLogEntry[];
  allPlayersReady: boolean;
  players: Player[];
  currentPlayer?: Player;
  exhaustedDice?: string[];
  firstRecruits?: Set<string>;
  firstStraight?: boolean;
  firstSet?: boolean;
  variant?: string;
  experimentalTurnLimit?: number;
}

export interface DiceFactoryGameProps {
  gameState: DiceFactoryGameState;
  socket: Socket | null;
  isLeader: boolean;
}

// FIXED: Added 'freepips' and 'score' to ActionMode for proper single-selection
export type ActionMode = 'promote' | 'recruit' | 'process' | 'freepips' | 'score' | 'straight' | 'set' | 'pips' | null;

export type MessageType = 'success' | 'error' | 'info';

export interface GameAction {
  type: string;
  diceIds?: string[];
  targetValue?: number;
  actionMode?: ActionMode;
}

export interface DiceActionHandlers {
  handlePromoteDice: () => void;
  handleRecruitDice: () => void;
  handleScoreStraight: () => void;
  handleScoreSet: () => void;
  handleScore: () => void;
  handleProcessDice: (diceIds?: string[], arbitrageChoice?: 'pips' | 'points') => void;
  handlePipAction: (actionType: 'increase' | 'decrease' | 'reroll') => void;
  handleFactoryAction: (actionType: 'effect' | 'modification') => void;
  handleEndTurn: (dividendChoice?: 'pips' | 'points') => void;
  handleUndo: () => void;
  handleFlee: () => void;
  handleRerollAllDice?: () => void;
  handleIncreaseDicePool?: () => void;
}

export interface GameStateHelpers {
  canTakeActions: () => boolean;
  isExhausted: (dieId: string) => boolean;
  isDieSelectable: (die: Die, actionMode: ActionMode) => boolean;
  showMessage: (text: string, type?: MessageType) => void;
}