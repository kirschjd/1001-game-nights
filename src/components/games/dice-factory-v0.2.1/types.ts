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

export interface GameState {
  type: string;
  version: string;
  phase: string;
  round: number;
  gameLog: GameLog[];
  // Solo player state
  playerId: string;
  playerName: string;
  dicePool: Die[];
  exhaustedDice: string[];
  slots: { [key: number]: string | null };
  availableAbilities: string[];
  // Factory Decks
  availableCards: Card[];
  playerCards: Card[];
  exhaustedCards: string[];
  victoryPoints: number;
}
