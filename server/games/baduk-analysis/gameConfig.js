// Baduk (Go) Analysis Tool Configuration

module.exports = {
  // Board configuration
  board: {
    size: 19,
    // Star points (hoshi) - standard positions for 19x19
    starPoints: [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15]
    ]
  },

  // Stone values
  stone: {
    EMPTY: 0,
    BLACK: 1,
    WHITE: 2
  },

  // Default game settings
  defaults: {
    komi: 6.5,      // Points given to white for going second
    handicap: 0     // Number of handicap stones
  },

  // Handicap stone positions (standard placement)
  handicapPositions: {
    2: [[3, 15], [15, 3]],
    3: [[3, 15], [15, 3], [15, 15]],
    4: [[3, 3], [3, 15], [15, 3], [15, 15]],
    5: [[3, 3], [3, 15], [15, 3], [15, 15], [9, 9]],
    6: [[3, 3], [3, 15], [15, 3], [15, 15], [3, 9], [15, 9]],
    7: [[3, 3], [3, 15], [15, 3], [15, 15], [3, 9], [15, 9], [9, 9]],
    8: [[3, 3], [3, 15], [15, 3], [15, 15], [3, 9], [15, 9], [9, 3], [9, 15]],
    9: [[3, 3], [3, 15], [15, 3], [15, 15], [3, 9], [15, 9], [9, 3], [9, 15], [9, 9]]
  },

  // Turn colors
  turn: {
    BLACK: 'black',
    WHITE: 'white'
  }
};
