// Go Rules Engine
// Handles liberties, captures, ko, and suicide prevention

const config = require('./gameConfig');
const { EMPTY, BLACK, WHITE } = config.stone;
const BOARD_SIZE = config.board.size;

/**
 * Get adjacent points (orthogonal neighbors)
 */
function getAdjacentPoints(x, y) {
  const adjacent = [];
  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < BOARD_SIZE - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < BOARD_SIZE - 1) adjacent.push({ x, y: y + 1 });
  return adjacent;
}

/**
 * Find all stones in a connected group using flood fill
 * Returns array of {x, y} positions
 */
function getGroup(board, x, y) {
  const color = board[y][x];
  if (color === EMPTY) return [];

  const group = [];
  const visited = new Set();
  const stack = [{ x, y }];

  while (stack.length > 0) {
    const pos = stack.pop();
    const key = `${pos.x},${pos.y}`;

    if (visited.has(key)) continue;
    if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) continue;
    if (board[pos.y][pos.x] !== color) continue;

    visited.add(key);
    group.push(pos);

    // Add neighbors to stack
    stack.push({ x: pos.x - 1, y: pos.y });
    stack.push({ x: pos.x + 1, y: pos.y });
    stack.push({ x: pos.x, y: pos.y - 1 });
    stack.push({ x: pos.x, y: pos.y + 1 });
  }

  return group;
}

/**
 * Count liberties for a group of stones
 * Liberty = empty adjacent intersection
 */
function countLiberties(board, group) {
  const liberties = new Set();

  for (const pos of group) {
    const adjacent = getAdjacentPoints(pos.x, pos.y);
    for (const adj of adjacent) {
      if (board[adj.y][adj.x] === EMPTY) {
        liberties.add(`${adj.x},${adj.y}`);
      }
    }
  }

  return liberties.size;
}

/**
 * Get liberties as array of points
 */
function getLiberties(board, x, y) {
  const group = getGroup(board, x, y);
  if (group.length === 0) return [];

  const liberties = new Set();
  for (const pos of group) {
    const adjacent = getAdjacentPoints(pos.x, pos.y);
    for (const adj of adjacent) {
      if (board[adj.y][adj.x] === EMPTY) {
        liberties.add(`${adj.x},${adj.y}`);
      }
    }
  }

  return Array.from(liberties).map(key => {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
  });
}

/**
 * Check which opponent groups would be captured by placing a stone
 * Returns array of captured stone positions
 */
function findCaptures(board, x, y, color) {
  const opponentColor = color === BLACK ? WHITE : BLACK;
  const captured = [];
  const checkedGroups = new Set();

  const adjacent = getAdjacentPoints(x, y);
  for (const adj of adjacent) {
    if (board[adj.y][adj.x] !== opponentColor) continue;

    const groupKey = `${adj.x},${adj.y}`;
    if (checkedGroups.has(groupKey)) continue;

    const group = getGroup(board, adj.x, adj.y);
    // Mark all stones in this group as checked
    group.forEach(pos => checkedGroups.add(`${pos.x},${pos.y}`));

    // Count liberties (the placed stone takes one liberty)
    const liberties = countLiberties(board, group);
    if (liberties === 0) {
      captured.push(...group);
    }
  }

  return captured;
}

/**
 * Clone a board state
 */
function cloneBoard(board) {
  return board.map(row => [...row]);
}

/**
 * Check if a move is valid
 * @param board Current board state
 * @param x X coordinate (0-18)
 * @param y Y coordinate (0-18)
 * @param color Stone color (BLACK or WHITE)
 * @param koPoint Ko point if any ({x, y} or null)
 * @returns {valid: boolean, reason: string}
 */
function isValidMove(board, x, y, color, koPoint = null) {
  // Check bounds
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return { valid: false, reason: 'Out of bounds' };
  }

  // Check if intersection is empty
  if (board[y][x] !== EMPTY) {
    return { valid: false, reason: 'Intersection is occupied' };
  }

  // Check ko rule
  if (koPoint && koPoint.x === x && koPoint.y === y) {
    return { valid: false, reason: 'Ko rule violation' };
  }

  // Simulate placing the stone
  const testBoard = cloneBoard(board);
  testBoard[y][x] = color;

  // Check for captures first
  const captures = findCaptures(testBoard, x, y, color);
  if (captures.length > 0) {
    // Move captures stones, so it's valid
    return { valid: true, reason: '' };
  }

  // Check for suicide (no captures and no liberties)
  const group = getGroup(testBoard, x, y);
  const liberties = countLiberties(testBoard, group);
  if (liberties === 0) {
    return { valid: false, reason: 'Suicide move (no liberties)' };
  }

  return { valid: true, reason: '' };
}

/**
 * Execute a move and return the new board state
 * @param board Current board state
 * @param x X coordinate
 * @param y Y coordinate
 * @param color Stone color
 * @returns {board: number[][], captures: {x,y}[], koPoint: {x,y}|null}
 */
function executeMove(board, x, y, color) {
  const newBoard = cloneBoard(board);
  newBoard[y][x] = color;

  // Find and remove captured stones
  const captures = findCaptures(newBoard, x, y, color);
  for (const cap of captures) {
    newBoard[cap.y][cap.x] = EMPTY;
  }

  // Determine ko point (single stone capture that could be immediately recaptured)
  let koPoint = null;
  if (captures.length === 1) {
    // Check if the capturing stone has exactly one liberty (the captured point)
    const group = getGroup(newBoard, x, y);
    const liberties = getLiberties(newBoard, x, y);
    if (group.length === 1 && liberties.length === 1) {
      koPoint = captures[0];
    }
  }

  return {
    board: newBoard,
    captures,
    koPoint
  };
}

/**
 * Count territory for scoring (simplified Chinese-style)
 * Dead stones are treated as empty spaces
 * Returns { black: number, white: number }
 */
function countTerritory(board, deadStones = new Set()) {
  const territory = { black: 0, white: 0 };
  const visited = new Set();

  // Create effective board where dead stones are treated as empty
  const effectiveBoard = board.map((row, y) =>
    row.map((cell, x) => deadStones.has(`${x},${y}`) ? EMPTY : cell)
  );

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (effectiveBoard[y][x] !== EMPTY || visited.has(`${x},${y}`)) continue;

      // Flood fill to find connected empty region
      const region = [];
      const stack = [{ x, y }];
      const touchesBlack = { value: false };
      const touchesWhite = { value: false };

      while (stack.length > 0) {
        const pos = stack.pop();
        const key = `${pos.x},${pos.y}`;

        if (visited.has(key)) continue;
        if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) continue;

        const stone = effectiveBoard[pos.y][pos.x];
        if (stone === BLACK) {
          touchesBlack.value = true;
          continue;
        }
        if (stone === WHITE) {
          touchesWhite.value = true;
          continue;
        }

        visited.add(key);
        region.push(pos);

        stack.push({ x: pos.x - 1, y: pos.y });
        stack.push({ x: pos.x + 1, y: pos.y });
        stack.push({ x: pos.x, y: pos.y - 1 });
        stack.push({ x: pos.x, y: pos.y + 1 });
      }

      // Territory belongs to a color if it only touches that color
      if (touchesBlack.value && !touchesWhite.value) {
        territory.black += region.length;
      } else if (touchesWhite.value && !touchesBlack.value) {
        territory.white += region.length;
      }
      // If touches both or neither, it's neutral/dame
    }
  }

  return territory;
}

/**
 * Count stones on the board
 */
function countStones(board) {
  let black = 0;
  let white = 0;

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (board[y][x] === BLACK) black++;
      else if (board[y][x] === WHITE) white++;
    }
  }

  return { black, white };
}

/**
 * Count dead stones by color
 */
function countDeadStones(board, deadStones) {
  let black = 0;
  let white = 0;

  for (const key of deadStones) {
    const [x, y] = key.split(',').map(Number);
    if (board[y][x] === BLACK) black++;
    else if (board[y][x] === WHITE) white++;
  }

  return { black, white };
}

/**
 * Calculate score (Chinese rules: territory + stones on board)
 * Dead stones count as territory for opponent
 */
function calculateScore(board, komi, captures, deadStones = new Set()) {
  const territory = countTerritory(board, deadStones);
  const stones = countStones(board);
  const dead = countDeadStones(board, deadStones);

  // In Chinese rules: score = territory + living stones
  // Dead stones become territory for opponent
  const blackTerritory = territory.black + dead.white;
  const whiteTerritory = territory.white + dead.black;

  const blackLivingStones = stones.black - dead.black;
  const whiteLivingStones = stones.white - dead.white;

  const blackScore = blackTerritory + blackLivingStones;
  const whiteScore = whiteTerritory + whiteLivingStones + komi;

  return {
    black: blackScore,
    white: whiteScore,
    winner: blackScore > whiteScore ? 'black' : (whiteScore > blackScore ? 'white' : 'tie'),
    margin: Math.abs(blackScore - whiteScore)
  };
}

/**
 * Create an empty board
 */
function createEmptyBoard() {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
}

/**
 * Set up handicap stones
 */
function setupHandicap(board, handicap) {
  if (handicap < 2 || handicap > 9) return board;

  const newBoard = cloneBoard(board);
  const positions = config.handicapPositions[handicap] || [];

  for (const [x, y] of positions) {
    newBoard[y][x] = BLACK;
  }

  return newBoard;
}

module.exports = {
  getAdjacentPoints,
  getGroup,
  countLiberties,
  getLiberties,
  findCaptures,
  isValidMove,
  executeMove,
  countTerritory,
  countStones,
  countDeadStones,
  calculateScore,
  createEmptyBoard,
  cloneBoard,
  setupHandicap,
  BOARD_SIZE
};
