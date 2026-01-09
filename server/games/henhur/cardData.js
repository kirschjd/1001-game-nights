// HenHur Card Definitions (Server-side)

const BASE_CARDS = [
  {
    id: 'base_pit_stop',
    title: 'Pit Stop',
    deckType: 'base',
    trickNumber: 2,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' },
    description: 'Deck Maintenance',
    effectText: 'Move 1 space',
    burnEffectText: 'Discard a card from your burn stack',
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
    description: 'Econ',
    effectText: 'Move 1 space',
    burnEffectText: 'Gain a P+ token',
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
    description: 'Econ',
    effectText: 'Move 1 space',
    burnEffectText: 'Gain an A+ token',
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
    description: 'Sprint',
    effectText: 'Move 4 spaces, you may move at any point in the turn',
    burnEffectText: 'Gain an R+ token',
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
    description: 'Stride',
    effectText: 'Move forward without using race number',
    burnEffectText: 'Move 8 spaces',
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
    description: 'Fight',
    effectText: 'Move 2 spaces, then move an adjacent opponent 2 or give a damage token',
    burnEffectText: 'Move an adjacent opponent 4 spaces',
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
    id: 'lap1_golden_grain',
    title: 'Golden Grain',
    deckType: 'lap1',
    trickNumber: 7,
    raceNumber: 2,
    priority: { base: 1, dice: 'd6' },
    description: 'Econ',
    effectText: 'N/A',
    burnEffectText: 'Race 7',
    effect: [],
    burnEffect: [{ type: 'move_player_position', params: { distance: 7 } }],
    copies: 2
  },
  {
    id: 'lap1_merchants_wager',
    title: "Merchant's Wager",
    deckType: 'lap1',
    trickNumber: 9,
    raceNumber: 1,
    priority: { base: 3, dice: 'd4' },
    description: 'Econ',
    effectText: "As you play this card, discard a token, if you don't, the trick number goes to 4",
    burnEffectText: 'Ignore the effect of this card',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_speed_sandals',
    title: 'Speed Sandals',
    deckType: 'lap1',
    trickNumber: 4,
    raceNumber: 1,
    priority: { base: 4, dice: 'd8' },
    description: 'Deck Maintenance',
    effectText: 'Loot 2',
    burnEffectText: 'Loot 4',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_chariot_upgrade',
    title: 'Chariot Upgrade',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 0, dice: 'd6' },
    description: 'Deck Maintenance',
    effectText: 'Remove a damage token, or discard a card from your burn stack',
    burnEffectText: 'Remove all damage tokens',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_crowd_pleaser',
    title: 'Crowd Pleaser',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 3,
    priority: { base: 3, dice: 'd6' },
    description: 'Special',
    effectText: 'Get a token of your choice',
    burnEffectText: 'Get 2 tokens of 1 type',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_praetorian_plumes',
    title: 'Praetorian Plumes',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 1,
    priority: { base: 2, dice: 'd6' },
    description: 'Fight',
    effectText: 'Push enemy 3',
    burnEffectText: '@ Push an enemy 3',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_auctioneers_gavel',
    title: "Auctioneer's Gavel",
    deckType: 'lap1',
    trickNumber: 6,
    raceNumber: 1,
    priority: { base: 1, dice: 'd4' },
    description: 'Econ',
    effectText: 'Rummage',
    burnEffectText: 'Rummage 2',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_bread_and_circuses',
    title: 'Bread and Circuses',
    deckType: 'lap1',
    trickNumber: 6,
    raceNumber: 1,
    priority: { base: 1, dice: 'd6' },
    description: 'Econ',
    effectText: 'Get 2 trick tokens, everyone else gets a race token',
    burnEffectText: 'Get 2 trick tokens and a race token',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_veterans_pension',
    title: "Veteran's Pension",
    deckType: 'lap1',
    trickNumber: 4,
    raceNumber: 1,
    priority: { base: 2, dice: 'd4' },
    description: 'Econ',
    effectText: 'Get a trick token or a race token',
    burnEffectText: '@ get a trick token and a race token',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_chariot_craftsman',
    title: 'Chariot Craftsman',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 0,
    priority: { base: 0, dice: 'd6' },
    description: 'Deck Maintenance',
    effectText: 'Remove up to 2 damage tokens',
    burnEffectText: 'Remove all damage tokens',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_gladiator_gear_grab',
    title: 'Gladiator Gear Grab',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 0,
    priority: { base: 0, dice: 'd4' },
    description: 'Deck Maintenance',
    effectText: 'Discard a burn card',
    burnEffectText: 'Loot 3',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_molting_mishap',
    title: 'Molting Mishap',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 6,
    priority: { base: 2, dice: 'd4' },
    description: 'Defense',
    effectText: 'Remove a damage token',
    burnEffectText: 'Discard a burn card',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_chariot_splinter',
    title: 'Chariot Splinter',
    deckType: 'lap1',
    trickNumber: 3,
    raceNumber: 5,
    priority: { base: 3, dice: 'd4' },
    description: 'Fight',
    effectText: 'Give the closest enemy a damage token',
    burnEffectText: 'Give 2 damage tokens to the closest enemy',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_broken_axle',
    title: 'Broken Axle',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 3,
    priority: { base: 2, dice: 'd6' },
    description: 'Fight',
    effectText: 'Give 2 damage tokens to an enemy',
    burnEffectText: 'Give 3 damage tokens to an enemy',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_spur_strike',
    title: 'Spur Strike',
    deckType: 'lap1',
    trickNumber: 1,
    raceNumber: 6,
    priority: { base: 3, dice: 'd8' },
    description: 'Fight',
    effectText: 'Move an enemy 1',
    burnEffectText: 'Move an enemy 1 and give them a damage token',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_gizzard_grind',
    title: 'Gizzard Grind',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 7,
    priority: { base: 0, dice: 'd4' },
    description: 'Defense',
    effectText: 'Get a damage token',
    burnEffectText: 'N/A',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_wing_boost',
    title: 'Wing Boost',
    deckType: 'lap1',
    trickNumber: 5,
    raceNumber: 5,
    priority: { base: 4, dice: 'd8' },
    description: 'Stride',
    effectText: 'N/A',
    burnEffectText: 'Move all enemies 1',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_chariot_collision',
    title: 'Chariot Collision',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 6,
    priority: { base: 3, dice: 'd6' },
    description: 'Fight',
    effectText: 'Get a damage token, give 2 damage tokens to another player',
    burnEffectText: 'Before moving, you may swap with an adjacent enemy',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_sharp_turn',
    title: 'Sharp Turn',
    deckType: 'lap1',
    trickNumber: 4,
    raceNumber: 6,
    priority: { base: 5, dice: 'd8' },
    description: 'Sprint',
    effectText: 'If played on a turn (on the map), race value +2',
    burnEffectText: 'If played on a turn (on the map), race value +4',
    effect: [],
    burnEffect: [],
    copies: 2
  },
  {
    id: 'lap1_rooster_rush',
    title: 'Rooster Rush',
    deckType: 'lap1',
    trickNumber: 2,
    raceNumber: 7,
    priority: { base: 7, dice: 'd8' },
    description: 'Sprint',
    effectText: 'N/A',
    burnEffectText: 'Move an additional D4',
    effect: [],
    burnEffect: [],
    copies: 2
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
