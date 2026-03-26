export type GamePhase = 'SETUP' | 'QUESTION' | 'LOCK_IN' | 'BIDDING' | 'REVEAL' | 'ROUND_OVER';

export interface LoddenPlayer {
  id: string;
  name: string;
  isConnected: boolean;
  bettorWins: number;
  spectatorCorrect: number;
}

export interface Bid {
  bettorId: string;
  value: number | null;
  action: 'bid' | 'take_under';
}

export interface SpectatorPrediction {
  playerId: string;
  predictedSide: 'over' | 'under';
}

export interface QueueItem {
  id: string;
  text: string;
  submittedById: string;
  submittedByName: string;
  deckQuestionId: string | null;
}

export interface DeckQuestion {
  id: string;
  text: string;
  displayText: string;
}

export interface DeckCategory {
  id: string;
  name: string;
  description: string;
  questions: DeckQuestion[];
}

export interface QuestionDeck {
  version: string;
  categories: DeckCategory[];
}

export interface Round {
  question: string | null;
  questionQueue: QueueItem[];
  loddenId: string;
  bettorAId: string;
  bettorBId: string;
  activeBettorId: string;
  loddenNumber: number | null;
  bids: Bid[];
  spectatorPredictions: SpectatorPrediction[];
  winnerId: string | null;
  finalBid: number | null;
  underBettorId: string | null;
  overBettorId: string | null;
}

export interface LoddenThinksGameState {
  type: 'lodden-thinks';
  phase: GamePhase;
  roundNumber: number;
  players: LoddenPlayer[];
  currentRound: Round;
  roundHistory: Round[];
}
