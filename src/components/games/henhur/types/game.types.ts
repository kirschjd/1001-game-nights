// HenHur Game State Type Definitions
// Complete game state including rounds, turns, positions, tokens, etc.

import { Card, PlayerDeck } from './card.types';

// Re-export Card and PlayerDeck for convenience
export type { Card, PlayerDeck } from './card.types';

// ============================================================================
// TOKEN TYPES
// ============================================================================

export type TokenType = 'P+' | 'R+' | 'A+' | 'W+' | 'P+3' | 'D';

export interface TokenPool {
  'P+': number;   // Priority +1
  'R+': number;   // Race value +1
  'A+': number;   // Auction value +1
  'W+': number;   // Wild +1 (can be used for any)
  'P+3': number;  // Priority +3
  'D': number;    // Damage (negative token, can't be removed easily)
}

// ============================================================================
// POSITION & LAP TRACKING
// ============================================================================

export interface PlayerPosition {
  playerId: string;
  lane: 'inner' | 'middle' | 'outer';
  space: number;  // 0-29 (30 spaces per lap)
  lap: number;    // 1, 2, or 3
}

export interface RaceTrack {
  trackLength: number;  // Default: 30 spaces
  lapsToWin: number;    // Default: 3
}

// ============================================================================
// BURN SLOTS
// ============================================================================

export interface BurnSlot {
  card: Card | null;
  slotIndex: number;  // 0, 1, or 2
}

export type BurnSlots = [BurnSlot, BurnSlot, BurnSlot];

// ============================================================================
// PLAYER STATE
// ============================================================================

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  isConnected: boolean;

  // Card management
  deck: PlayerDeck;

  // Position on track
  position: PlayerPosition;

  // Resources
  tokens: TokenPool;
  maxTokens: number;  // Default: 10

  // Burn slots
  burnSlots: BurnSlots;

  // Turn state
  selectedCard: Card | null;
  selectedTokens: TokenType[];  // Tokens selected to use this turn
  willBurn: boolean;  // Whether selected card will be burned
  isReady: boolean;   // Ready for this turn

  // Temporary modifiers (last for one turn)
  priorityModifier: number;

  // Stats
  cardsPlayed: number;
  cardsBurned: number;
  distanceMoved: number;
}

// ============================================================================
// TURN & ROUND MANAGEMENT
// ============================================================================

export type TurnType = 'race' | 'auction';

export type GamePhase =
  | 'waiting'           // Before game starts
  | 'race_selection'    // Players selecting cards/tokens for race
  | 'race_reveal'       // Cards revealed, showing priority order
  | 'race_resolution'   // Executing card effects in priority order
  | 'auction_selection' // Players selecting bid cards
  | 'auction_reveal'    // Bids revealed
  | 'auction_drafting'  // Players drafting cards in order
  | 'game_over';        // Someone won

export interface TurnState {
  roundNumber: number;       // Current round (1, 2, 3...)
  turnNumber: number;        // Turn within round (1-8)
  turnType: TurnType;        // 'race' or 'auction'
  phase: GamePhase;

  // For race turns
  raceSelections?: Map<string, {
    card: Card;
    willBurn: boolean;
    tokensUsed: TokenType[];
  }>;

  // For auction turns
  auctionBids?: Map<string, {
    card: Card;
    willBurn: boolean;
    tokensUsed: TokenType[];
  }>;
  auctionPool?: Card[];      // Cards available to draft
  auctionOrder?: string[];   // Player IDs in draft order
  currentDrafter?: string;   // Current player drafting
}

// ============================================================================
// COMPLETE GAME STATE
// ============================================================================

export interface HenHurGameState {
  // Game info
  gameType: 'henhur';
  started: boolean;
  variant: 'standard' | 'debug';

  // Track configuration
  track: RaceTrack;

  // Turn management
  turn: TurnState;

  // Players
  players: PlayerGameState[];

  // Game configuration
  config: GameConfig;

  // Winner
  winner: string | null;  // playerId of winner

  // History (for replay/undo)
  turnHistory: TurnHistoryEntry[];
}

export interface GameConfig {
  turnsPerRound: number;      // Default: 8
  handSize: number;           // Default: 3
  trackLength: number;        // Default: 30
  lapsToWin: number;          // Default: 3
  maxTokens: number;          // Default: 10
  burnSlots: number;          // Default: 3
  selectedCards: string[];    // Card IDs enabled for this game
}

export interface TurnHistoryEntry {
  roundNumber: number;
  turnNumber: number;
  turnType: TurnType;
  actions: TurnAction[];
  timestamp: number;
}

export interface TurnAction {
  playerId: string;
  actionType: 'play_card' | 'burn_card' | 'use_token' | 'move' | 'draft_card';
  details: any;
}

// ============================================================================
// PLAYER VIEW (What clients see)
// ============================================================================

export interface HenHurPlayerView {
  type: 'henhur';
  started: boolean;
  variant: string;

  // Game state
  phase: GamePhase;
  turnNumber: number;
  roundNumber: number;
  turnType: TurnType;

  // Track info
  track: RaceTrack;

  // My full state
  myState: PlayerGameState;

  // Other players (partial info)
  otherPlayers: PlayerPublicState[];

  // Turn-specific info
  auctionPool?: Card[];
  auctionOrder?: string[];
  currentDrafter?: string;

  // Who's ready
  readyPlayers: string[];

  // Winner
  winner: string | null;

  // Messages
  message?: string;
  lastAction?: string;
}

export interface PlayerPublicState {
  playerId: string;
  playerName: string;
  isConnected: boolean;

  // Position
  position: PlayerPosition;

  // Card counts (not actual cards)
  handCount: number;
  deckCount: number;
  discardCount: number;

  // Tokens (visible)
  tokens: TokenPool;

  // Burn slots (visible)
  burnSlots: BurnSlots;

  // Ready status
  isReady: boolean;

  // Stats
  cardsPlayed: number;
  cardsBurned: number;
  distanceMoved: number;
}

// ============================================================================
// ACTION PAYLOADS (Client → Server)
// ============================================================================

export interface SelectCardPayload {
  cardId: string;
  willBurn: boolean;
  tokensToUse: TokenType[];
}

export interface DraftCardPayload {
  cardId: string;
}

export interface ReadyPayload {
  ready: boolean;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export interface EffectExecutionResult {
  success: boolean;
  message: string;
  stateChanges: Partial<HenHurGameState>;
  animations?: Animation[];
}

export interface Animation {
  type: 'move' | 'draw' | 'discard' | 'burn' | 'token' | 'lap_complete';
  playerId: string;
  data: any;
}

// ============================================================================
// SOCKET EVENTS
// ============================================================================

export type HenHurSocketEvent =
  | 'henhur:select-card'
  | 'henhur:draft-card'
  | 'henhur:ready'
  | 'henhur:use-token'
  | 'henhur:game-state'
  | 'henhur:turn-complete'
  | 'henhur:game-over';