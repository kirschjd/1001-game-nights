// src/components/games/war/types/WarTypes.ts
// TypeScript type definitions for War game

export interface WarPlayer {
  id: string;
  name: string;
  score: number;
  card: number | null;
  hasPlayed: boolean;
  hasFolded: boolean;
  action: GameAction | null;
  isBot?: boolean;
}

export interface WarGameState {
  type: 'war';
  variant: string;
  variantDisplayName: string;
  phase: GamePhase;
  round: number;
  winner: string | null;
  players: WarPlayer[];
  roundResults: RoundResults | null;
  currentPlayer?: WarPlayer;
}

export interface RoundResults {
  message: string;
  winner: string | null;
  highCard: number | null;
}

export interface WarVariant {
  id: string;
  name: string;
  description: string;
  rules: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  minPlayers: number;
  maxPlayers: number;
  estimatedTime: string;
}

export interface BotConfig {
  style: string;
  count: number;
}

export interface BotStyle {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type GamePhase = 'dealing' | 'playing' | 'revealing' | 'complete';
export type GameAction = 'play' | 'fold';

export interface EnhancedWarSetupProps {
  socket: any; // Socket.IO client
  isLeader: boolean;
  lobbySlug: string;
  onStartGame: () => void;
  currentPlayers: number;
}

export interface EnhancedWarGameProps {
  socket: any; // Socket.IO client
  gameState: WarGameState;
  isLeader: boolean;
}

export interface PlayerCardProps {
  player: WarPlayer;
  isCurrentPlayer: boolean;
  gamePhase: GamePhase;
}

export interface ActionButtonsProps {
  onPlay: () => void;
  onFold: () => void;
  disabled: boolean;
  selectedAction: GameAction | null;
}

export interface BotIndicatorProps {
  isBot: boolean;
  style?: string;
}

export interface GameHeaderProps {
  variantDisplayName: string;
  round: number;
  variant: string;
}

export interface RoundResultsProps {
  results: RoundResults;
  onNextRound?: () => void;
  showNextButton: boolean;
}

// Utility types
export interface CardInfo {
  value: number;
  name: string;
  emoji: string;
}

export interface GameConstants {
  WINNING_SCORE: number;
  MIN_PLAYERS: number;
  MAX_PLAYERS: number;
  CARD_NAMES: Record<number, string>;
  CARD_EMOJIS: Record<number, string>;
}