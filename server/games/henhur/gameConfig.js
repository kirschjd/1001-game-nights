// HenHur Game Configuration
// All game constants in one place for easy prototyping/balancing

module.exports = {
  // Track configuration
  track: {
    spacesPerLap: 30,
    lapsToWin: 3
  },

  // Turn structure
  turns: {
    perRound: 8,
    // Pattern: odd turns = race, even turns = auction
    getType: (turnNumber) => (turnNumber % 2 === 1) ? 'race' : 'auction'
  },

  // Hand management
  hand: {
    size: 8,
    drawToFull: false  // Only refill when hand is completely empty
  },

  // Token system
  tokens: {
    maxPerPlayer: 10,
    types: {
      'P+': { name: 'Priority +1', value: 1, category: 'priority' },
      'P+3': { name: 'Priority +3', value: 3, category: 'priority' },
      'R+': { name: 'Race +1', value: 1, category: 'race' },
      'R+3': { name: 'Race +3', value: 3, category: 'race' },
      'A+': { name: 'Auction +1', value: 1, category: 'auction' },
      'A+3': { name: 'Auction +3', value: 3, category: 'auction' },
      'W+': { name: 'Wild +1', value: 1, category: 'wild' },
      'W+3': { name: 'Wild +3', value: 3, category: 'wild' },
      'D': { name: 'Damage', value: 0, category: 'negative' },
      'D+': { name: 'Damage+', value: -1, category: 'negative', reducesMovement: true }
    }
  },

  // Burn system
  burn: {
    slotsPerPlayer: 3
  },

  // Auction configuration
  auction: {
    // Pool size = number of players + this value
    extraCards: 1,
    // Which lap decks are available based on highest player lap
    getAvailableDecks: (highestLap) => {
      if (highestLap >= 3) return ['lap1', 'lap2', 'lap3'];
      if (highestLap >= 2) return ['lap1', 'lap2'];
      return ['lap1']; // Lap 1 players can only draft base cards
    }
  },

  // Starting resources
  starting: {
    lap: 1,
    space: 0,
    tokens: {
      'P+': 1,   // Start with 1 of each basic token
      'P+3': 0,
      'R+': 1,
      'R+3': 0,
      'A+': 1,
      'A+3': 0,
      'W+': 1,
      'W+3': 0,
      'D': 0,
      'D+': 0
    }
  }
};
