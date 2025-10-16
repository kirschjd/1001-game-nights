// HenHur Card Utilities (Server-side)

/**
 * Expand cards based on their copies property
 */
function expandCardCopies(cards) {
  const expanded = [];

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
function shuffleCards(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Initialize a player's starting deck with base cards
 */
function initializePlayerDeck(playerId, baseCards) {
  const expandedCards = expandCardCopies(baseCards);
  return {
    playerId,
    deck: shuffleCards(expandedCards),
    hand: [],
    discard: []
  };
}

/**
 * Draw cards from a player's deck
 */
function drawCards(playerDeck, count) {
  const newDeck = {
    playerId: playerDeck.playerId,
    deck: [...playerDeck.deck],
    hand: [...playerDeck.hand],
    discard: [...playerDeck.discard]
  };
  const drawnCards = [];

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
function discardCard(playerDeck, cardId) {
  const newDeck = {
    playerId: playerDeck.playerId,
    deck: [...playerDeck.deck],
    hand: [...playerDeck.hand],
    discard: [...playerDeck.discard]
  };

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
function playCard(playerDeck, cardId) {
  const newDeck = {
    playerId: playerDeck.playerId,
    deck: [...playerDeck.deck],
    hand: [...playerDeck.hand],
    discard: [...playerDeck.discard]
  };

  const cardIndex = newDeck.hand.findIndex(c => c.id === cardId);

  if (cardIndex === -1) {
    return { updatedDeck: playerDeck, playedCard: null };
  }

  const [card] = newDeck.hand.splice(cardIndex, 1);
  newDeck.discard.push(card);

  return { updatedDeck: newDeck, playedCard: card };
}

/**
 * Get deck statistics
 */
function getDeckStats(playerDeck) {
  return {
    deckCount: playerDeck.deck.length,
    handCount: playerDeck.hand.length,
    discardCount: playerDeck.discard.length,
    totalCount: playerDeck.deck.length + playerDeck.hand.length + playerDeck.discard.length
  };
}

module.exports = {
  expandCardCopies,
  shuffleCards,
  initializePlayerDeck,
  drawCards,
  discardCard,
  playCard,
  getDeckStats
};
