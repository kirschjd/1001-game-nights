// 1001 Game Nights - Dice Factory Types
// Version: 3.0.0 - Fresh rewrite

export interface Die {
  id: string;
  sides: number;
  value: number | null;
  shiny?: boolean;
  rainbow?: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
}

export interface DiceFactoryGameState {
  type: 'dice-factory';
  version: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Record<string, Player>;
  currentPlayerId: string | null;
  round: number;
  gameLog: GameLogEntry[];
}

export interface GameLogEntry {
  timestamp: number;
  playerId: string;
  action: string;
  data?: unknown;
}
