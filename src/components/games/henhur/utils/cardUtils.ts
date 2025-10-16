// HenHur Card Utilities
// Functions for managing card operations: drawing, discarding, shuffling, etc.

import { Card, PlayerDeck, SharedCardPool } from '../types/card.types';

/**
 * Expand cards based on their copies property
 * If a card has copies: 3, it will be duplicated 3 times with unique IDs
 */
export function expandCardCopies(cards: Card[]): Card[] {
  const expanded: Card[] = [];

  for (const card of cards) {
    const numCopies = card.copies || 1;
    for (let i = 0; i < numCopies; i++) {
      expanded.push({
        ...card,
        id: numCopies > 1 ? `${card.id}_copy${i + 1}` : card.id
      });
    }
  }

  return expanded;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 */
export function shuffleCards<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Draw cards from a player's deck
 */
export function drawCards(deck: PlayerDeck, count: number): {
  updatedDeck: PlayerDeck;
  drawnCards: Card[];
} {
  const newDeck = { ...deck };
  const drawnCards: Card[] = [];

  for (let i = 0; i < count; i++) {
    if (newDeck.deck.length === 0) {
      // If deck is empty, shuffle discard pile into deck
      if (newDeck.discard.length > 0) {
        newDeck.deck = shuffleCards(newDeck.discard);
        newDeck.discard = [];
      } else {
        // No cards left to draw
        break;
      }
    }

    const card = newDeck.deck.shift();
    if (card) {
      drawnCards.push(card);
      newDeck.hand.push(card);
    }
  }

  return { updatedDeck: newDeck, drawnCards };
}

/**
 * Discard a card from hand
 */
export function discardCard(deck: PlayerDeck, cardId: string): PlayerDeck {
  const newDeck = { ...deck };
  const cardIndex = newDeck.hand.findIndex(c => c.id === cardId);

  if (cardIndex !== -1) {
    const [card] = newDeck.hand.splice(cardIndex, 1);
    newDeck.discard.push(card);
  }

  return newDeck;
}

/**
 * Play a card from hand (removes from hand, triggers effects, goes to discard)
 */
export function playCard(deck: PlayerDeck, cardId: string): {
  updatedDeck: PlayerDeck;
  playedCard: Card | null;
} {
  const newDeck = { ...deck };
  const cardIndex = newDeck.hand.findIndex(c => c.id === cardId);

  if (cardIndex === -1) {
    return { updatedDeck: deck, playedCard: null };
  }

  const [card] = newDeck.hand.splice(cardIndex, 1);
  newDeck.discard.push(card);

  return { updatedDeck: newDeck, playedCard: card };
}

/**
 * Add a card to a player's deck (from drafting)
 */
export function addCardToDeck(deck: PlayerDeck, card: Card, destination: 'deck' | 'hand' | 'discard' = 'discard'): PlayerDeck {
  const newDeck = { ...deck };
  newDeck[destination].push(card);
  return newDeck;
}

/**
 * Remove a card from a player's deck entirely (burn effect)
 */
export function burnCard(deck: PlayerDeck, cardId: string): {
  updatedDeck: PlayerDeck;
  burnedCard: Card | null;
} {
  const newDeck = { ...deck };
  let burnedCard: Card | null = null;

  // Check hand first
  let cardIndex = newDeck.hand.findIndex(c => c.id === cardId);
  if (cardIndex !== -1) {
    [burnedCard] = newDeck.hand.splice(cardIndex, 1);
    return { updatedDeck: newDeck, burnedCard };
  }

  // Check discard
  cardIndex = newDeck.discard.findIndex(c => c.id === cardId);
  if (cardIndex !== -1) {
    [burnedCard] = newDeck.discard.splice(cardIndex, 1);
    return { updatedDeck: newDeck, burnedCard };
  }

  // Check deck
  cardIndex = newDeck.deck.findIndex(c => c.id === cardId);
  if (cardIndex !== -1) {
    [burnedCard] = newDeck.deck.splice(cardIndex, 1);
    return { updatedDeck: newDeck, burnedCard };
  }

  return { updatedDeck: deck, burnedCard: null };
}

/**
 * Initialize a player's starting deck with base cards
 */
export function initializePlayerDeck(playerId: string, baseCards: Card[]): PlayerDeck {
  const expandedCards = expandCardCopies(baseCards);
  return {
    playerId,
    deck: shuffleCards(expandedCards),
    hand: [],
    discard: []
  };
}

/**
 * Get available cards from shared pool based on current lap
 */
export function getAvailableCardsForLap(
  pool: SharedCardPool,
  allCards: Card[],
  selectedCardIds: string[]
): Card[] {
  return allCards.filter(card =>
    selectedCardIds.includes(card.id) &&
    card.deckType === pool.currentLap
  );
}

/**
 * Progress the shared pool to the next lap
 */
export function progressToNextLap(pool: SharedCardPool): SharedCardPool {
  const lapOrder: Array<'base' | 'lap1' | 'lap2' | 'lap3'> = ['base', 'lap1', 'lap2', 'lap3'];
  const currentIndex = lapOrder.indexOf(pool.currentLap);

  if (currentIndex < lapOrder.length - 1) {
    return {
      ...pool,
      currentLap: lapOrder[currentIndex + 1]
    };
  }

  return pool; // Already at final lap
}

/**
 * Get card counts for a player deck
 */
export function getDeckStats(deck: PlayerDeck): {
  deckCount: number;
  handCount: number;
  discardCount: number;
  totalCount: number;
} {
  return {
    deckCount: deck.deck.length,
    handCount: deck.hand.length,
    discardCount: deck.discard.length,
    totalCount: deck.deck.length + deck.hand.length + deck.discard.length
  };
}
