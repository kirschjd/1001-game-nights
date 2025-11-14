// Dice Factory v0.2.1 - TypeScript Types (Minimal)

export interface Die {
  id: string;
  size: number;
  value: number;
}

export interface CardEffects {
  vp: number;
  diceNumbers: number[]; // Array of dice number options (empty if none)
}

export interface Card {
  id: string;
  title: string;
  cost: number[];
  effects: CardEffects;
  deckSource: number;
}

export interface GameLog {
  round: number;
  message: string;
  timestamp: number;
}

export interface Ability {
  id: string;
  name: string;
  tier: number;
  costCount?: number;
  needsTarget?: boolean;
  exhaustTarget?: boolean;
  effect?: string;
  multiTarget?: boolean;
  maxTargets?: number;
  needsDirection?: boolean;
  needsAmount?: boolean;
}

export interface Player {
  id: string;
  name: string;
  dicePool: Die[];
  exhaustedDice: string[];
  slots: { [key: number]: string | null };
  cards: Card[];
  exhaustedCards: string[];
  victoryPoints: number;
  hasPassed: boolean;
}

export interface GameState {
  type: string;
  version: string;
  phase: string;
  round: number;
  gameLog: GameLog[];

  // Multiplayer state
  players: Player[];
  turnOrder: string[]; // Array of player IDs
  currentPlayerIndex: number;
  startingPlayerIndex: number;
  actionsRemaining: number;

  // Shared tier-based abilities
  tier0Abilities: Ability[];
  availableTier1Abilities: Ability[];
  availableTier2Abilities: Ability[];
  availableTier3Abilities: Ability[];
  availableTier4Abilities: Ability[];

  // Shared Factory Decks
  deck1: Card[];
  deck2: Card[];
  deck3: Card[];
  availableCards: Card[];

  // Convenience properties (from getPlayerView)
  playerId?: string;
  playerName?: string;
  dicePool?: Die[];
  exhaustedDice?: string[];
  slots?: { [key: number]: string | null };
  playerCards?: Card[];
  exhaustedCards?: string[];
  victoryPoints?: number;
  recruitCost?: number; // Dynamic cost for recruit ability
  targetedRecruitCost?: number; // Dynamic cost for targeted recruit
  recruitPlusCost?: number; // Dynamic cost for recruit+
}
