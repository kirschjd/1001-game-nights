// HenHur Card Definitions (Server-side)

const BASE_CARDS = [
  {
    id: 'base_sprint',
    title: 'Sprint',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 1,
    priority: 5,
    description: 'Move forward 1 space',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
    ],
    burnEffect: [],
    copies: 5
  },
  {
    id: 'base_jog',
    title: 'Jog',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 2,
    priority: 3,
    description: 'Move forward 2 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      }
    ],
    burnEffect: [],
    copies: 3
  }
];

const LAP1_CARDS = [
  {
    id: 'lap1_dash',
    title: 'Dash',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 1,
    priority: 7,
    description: 'Move forward 3 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 3 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 1 }
      }
    ],
    copies: 4
  },
  {
    id: 'lap1_trip',
    title: 'Trip',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 2,
    priority: 6,
    description: 'Move opponent back 1 space',
    effect: [
      {
        type: 'move_opponent_position',
        params: { distance: -1, targetSelection: 'choose' }
      }
    ],
    burnEffect: [],
    copies: 3
  }
];

const LAP2_CARDS = [
  {
    id: 'lap2_surge',
    title: 'Surge',
    deckType: 'lap2',
    trickNumber: 3,
    raceNumber: 1,
    priority: 9,
    description: 'Move forward 4 spaces',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 4 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'movement', count: 2 }
      }
    ],
    copies: 2
  }
];

const LAP3_CARDS = [
  {
    id: 'lap3_turbo',
    title: 'Turbo Boost',
    deckType: 'lap3',
    trickNumber: 4,
    raceNumber: 1,
    priority: 10,
    description: 'Move forward 5 spaces and gain priority',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 5 }
      },
      {
        type: 'modify_priority',
        params: { adjustment: 2 }
      }
    ],
    burnEffect: [
      {
        type: 'draw_cards',
        params: { count: 2 }
      }
    ],
    copies: 1
  }
];

const ALL_CARDS = [
  ...BASE_CARDS,
  ...LAP1_CARDS,
  ...LAP2_CARDS,
  ...LAP3_CARDS
];

function getCardsByDeckType(deckType) {
  return ALL_CARDS.filter(card => card.deckType === deckType);
}

function getCardById(cardId) {
  return ALL_CARDS.find(card => card.id === cardId);
}

module.exports = {
  BASE_CARDS,
  LAP1_CARDS,
  LAP2_CARDS,
  LAP3_CARDS,
  ALL_CARDS,
  getCardsByDeckType,
  getCardById
};
