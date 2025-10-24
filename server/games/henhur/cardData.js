// HenHur Card Definitions (Server-side)

const BASE_CARDS = [
  {
    id: 'base_pit_stop',
    title: 'Pit Stop',
    deckType: 'base',
    trickNumber: 2,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' },
    description: 'Deck Maintenance - Discard a card from your burn stack',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      },
      {
        type: 'affect_player_mat',
        params: { property: 'deckMaintenance', value: 1, operation: 'set' }
      }
    ],
    burnEffect: [
      {
        type: 'affect_player_mat',
        params: { property: 'discardBurnStack', value: true, operation: 'set' }
      }
    ],
    copies: 1
  },
  {
    id: 'base_high_bid',
    title: 'High Bid',
    deckType: 'base',
    trickNumber: 7,
    raceNumber: 1,
    priority: { base: 1, dice: 'd4' },
    description: 'Econ - Move 1 space and gain 4 trick value',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'P+', count: 1 }
      }
    ],
    copies: 1
  },
  {
    id: 'base_low_bid',
    title: 'Low Bid',
    deckType: 'base',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 2, dice: 'd8' },
    description: 'Econ - Move 1 space and gain 8 trick value',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 1 }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'A+', count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'base_rush',
    title: 'Rush',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 5,
    priority: { base: 2, dice: 'd8' },
    description: 'Sprint - Move 4 spaces, you may move at any point in the turn',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 4 }
      },
      {
        type: 'affect_player_mat',
        params: { property: 'canMoveAnytime', value: true, operation: 'set' }
      }
    ],
    burnEffect: [
      {
        type: 'affect_token_pool',
        params: { action: 'gain', tokenType: 'R+', count: 1 }
      }
    ],
    copies: 2
  },
  {
    id: 'base_stride',
    title: 'Stride',
    deckType: 'base',
    trickNumber: 1,
    raceNumber: 7,
    priority: { base: 2, dice: 'd8' },
    description: 'Stride - Move forward without using race number',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 0 }
      }
    ],
    burnEffect: [
      {
        type: 'move_player_position',
        params: { distance: 8 }
      }
    ],
    copies: 2
  },
  {
    id: 'base_punch',
    title: 'Punch',
    deckType: 'base',
    trickNumber: 3,
    raceNumber: 4,
    priority: { base: 2, dice: 'd8' },
    description: 'Fight - Move 2 spaces, then move an adjacent opponent 2 or give a damage token',
    effect: [
      {
        type: 'move_player_position',
        params: { distance: 2 }
      },
      {
        type: 'move_opponent_position',
        params: { distance: 2, targetSelection: 'choose', requiresAdjacent: true }
      }
    ],
    burnEffect: [
      {
        type: 'move_opponent_position',
        params: { distance: 4, targetSelection: 'choose', requiresAdjacent: true }
      }
    ],
    copies: 2
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
