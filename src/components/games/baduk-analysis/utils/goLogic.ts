// Client-side Go Logic
// Used for move validation preview and board state calculations

import { BoardState, Point, StoneColor, EMPTY, BLACK, WHITE } from '../types/baduk.types';

const BOARD_SIZE = 19;

/**
 * Get adjacent points (orthogonal neighbors)
 */
export function getAdjacentPoints(x: number, y: number): Point[] {
  const adjacent: Point[] = [];
  if (x > 0) adjacent.push({ x: x - 1, y });
  if (x < BOARD_SIZE - 1) adjacent.push({ x: x + 1, y });
  if (y > 0) adjacent.push({ x, y: y - 1 });
  if (y < BOARD_SIZE - 1) adjacent.push({ x, y: y + 1 });
  return adjacent;
}

/**
 * Find all stones in a connected group using flood fill
 */
export function getGroup(board: BoardState, x: number, y: number): Point[] {
  const color = board[y][x];
  if (color === EMPTY) return [];

  const group: Point[] = [];
  const visited = new Set<string>();
  const stack: Point[] = [{ x, y }];

  while (stack.length > 0) {
    const pos = stack.pop()!;
    const key = `${pos.x},${pos.y}`;

    if (visited.has(key)) continue;
    if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) continue;
    if (board[pos.y][pos.x] !== color) continue;

    visited.add(key);
    group.push(pos);

    stack.push({ x: pos.x - 1, y: pos.y });
    stack.push({ x: pos.x + 1, y: pos.y });
    stack.push({ x: pos.x, y: pos.y - 1 });
    stack.push({ x: pos.x, y: pos.y + 1 });
  }

  return group;
}

/**
 * Count liberties for a group of stones
 */
export function countLiberties(board: BoardState, group: Point[]): number {
  const liberties = new Set<string>();

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
export function getLiberties(board: BoardState, x: number, y: number): Point[] {
  const group = getGroup(board, x, y);
  if (group.length === 0) return [];

  const liberties = new Set<string>();
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
 * Clone a board state
 */
export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => [...row]);
}

/**
 * Check which opponent groups would be captured by placing a stone
 * Returns array of captured stone positions
 */
export function findCaptures(board: BoardState, x: number, y: number, color: StoneColor): Point[] {
  const opponentColor = color === BLACK ? WHITE : BLACK;
  const captured: Point[] = [];
  const checkedGroups = new Set<string>();

  const adjacent = getAdjacentPoints(x, y);
  for (const adj of adjacent) {
    if (board[adj.y][adj.x] !== opponentColor) continue;

    const groupKey = `${adj.x},${adj.y}`;
    if (checkedGroups.has(groupKey)) continue;

    const group = getGroup(board, adj.x, adj.y);
    group.forEach(pos => checkedGroups.add(`${pos.x},${pos.y}`));

    const liberties = countLiberties(board, group);
    if (liberties === 0) {
      captured.push(...group);
    }
  }

  return captured;
}

/**
 * Preview what captures would occur if a stone is placed
 * Does not modify the board
 */
export function previewCaptures(board: BoardState, x: number, y: number, color: StoneColor): Point[] {
  // Simulate placing the stone
  const testBoard = cloneBoard(board);
  testBoard[y][x] = color;

  return findCaptures(testBoard, x, y, color);
}

/**
 * Check if a move is valid
 * @returns Object with valid flag and reason
 */
export function isValidMove(
  board: BoardState,
  x: number,
  y: number,
  color: StoneColor,
  koPoint: Point | null = null
): { valid: boolean; reason: string } {
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
 * Execute a move and return the resulting board state
 */
export function executeMove(
  board: BoardState,
  x: number,
  y: number,
  color: StoneColor
): { board: BoardState; captures: Point[]; koPoint: Point | null } {
  const newBoard = cloneBoard(board);
  newBoard[y][x] = color;

  // Find and remove captured stones
  const captures = findCaptures(newBoard, x, y, color);
  for (const cap of captures) {
    newBoard[cap.y][cap.x] = EMPTY;
  }

  // Determine ko point
  let koPoint: Point | null = null;
  if (captures.length === 1) {
    const group = getGroup(newBoard, x, y);
    const liberties = getLiberties(newBoard, x, y);
    if (group.length === 1 && liberties.length === 1) {
      koPoint = captures[0];
    }
  }

  return { board: newBoard, captures, koPoint };
}

/**
 * Territory region with ownership info
 */
export interface TerritoryRegion {
  points: Point[];
  owner: 'black' | 'white' | 'neutral';
}

/**
 * Get all territory regions with their owners
 * Used for both counting and visualization
 */
export function getTerritoryRegions(board: BoardState, deadStones: Set<string> = new Set()): TerritoryRegion[] {
  const regions: TerritoryRegion[] = [];
  const visited = new Set<string>();

  // Create a modified board view that treats dead stones as empty
  const effectiveBoard = board.map((row, y) =>
    row.map((cell, x) => deadStones.has(`${x},${y}`) ? EMPTY : cell)
  );

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (effectiveBoard[y][x] !== EMPTY || visited.has(`${x},${y}`)) continue;

      const region: Point[] = [];
      const stack: Point[] = [{ x, y }];
      let touchesBlack = false;
      let touchesWhite = false;

      while (stack.length > 0) {
        const pos = stack.pop()!;
        const key = `${pos.x},${pos.y}`;

        if (visited.has(key)) continue;
        if (pos.x < 0 || pos.x >= BOARD_SIZE || pos.y < 0 || pos.y >= BOARD_SIZE) continue;

        const stone = effectiveBoard[pos.y][pos.x];
        if (stone === BLACK) {
          touchesBlack = true;
          continue;
        }
        if (stone === WHITE) {
          touchesWhite = true;
          continue;
        }

        visited.add(key);
        region.push(pos);

        stack.push({ x: pos.x - 1, y: pos.y });
        stack.push({ x: pos.x + 1, y: pos.y });
        stack.push({ x: pos.x, y: pos.y - 1 });
        stack.push({ x: pos.x, y: pos.y + 1 });
      }

      let owner: 'black' | 'white' | 'neutral';
      if (touchesBlack && !touchesWhite) {
        owner = 'black';
      } else if (touchesWhite && !touchesBlack) {
        owner = 'white';
      } else {
        owner = 'neutral';
      }

      regions.push({ points: region, owner });
    }
  }

  return regions;
}

/**
 * Count territory for scoring (simplified)
 */
export function countTerritory(board: BoardState, deadStones: Set<string> = new Set()): { black: number; white: number } {
  const regions = getTerritoryRegions(board, deadStones);
  const territory = { black: 0, white: 0 };

  for (const region of regions) {
    if (region.owner === 'black') {
      territory.black += region.points.length;
    } else if (region.owner === 'white') {
      territory.white += region.points.length;
    }
  }

  return territory;
}

/**
 * Count stones on the board
 */
export function countStones(board: BoardState): { black: number; white: number } {
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
export function countDeadStones(board: BoardState, deadStones: Set<string>): { black: number; white: number } {
  let black = 0;
  let white = 0;

  Array.from(deadStones).forEach(key => {
    const [x, y] = key.split(',').map(Number);
    if (board[y][x] === BLACK) black++;
    else if (board[y][x] === WHITE) white++;
  });

  return { black, white };
}

/**
 * Full score breakdown
 */
export interface ScoreBreakdown {
  black: {
    territory: number;
    stones: number;
    captures: number;
    deadStones: number;
    total: number;
  };
  white: {
    territory: number;
    stones: number;
    captures: number;
    deadStones: number;
    komi: number;
    total: number;
  };
  winner: 'black' | 'white' | 'tie';
  margin: number;
}

/**
 * Calculate score (Chinese rules: territory + stones on board)
 * Dead stones count as territory for the opponent
 */
export function calculateScore(
  board: BoardState,
  komi: number,
  captures: { black: number; white: number },
  deadStones: Set<string> = new Set()
): ScoreBreakdown {
  const territory = countTerritory(board, deadStones);
  const stones = countStones(board);
  const dead = countDeadStones(board, deadStones);

  // In Chinese rules: score = territory + living stones
  // Dead stones become territory for opponent
  const blackTerritory = territory.black + dead.white; // Dead white stones = black territory
  const whiteTerritory = territory.white + dead.black; // Dead black stones = white territory

  const blackLivingStones = stones.black - dead.black;
  const whiteLivingStones = stones.white - dead.white;

  const blackTotal = blackTerritory + blackLivingStones;
  const whiteTotal = whiteTerritory + whiteLivingStones + komi;

  let winner: 'black' | 'white' | 'tie';
  if (blackTotal > whiteTotal) {
    winner = 'black';
  } else if (whiteTotal > blackTotal) {
    winner = 'white';
  } else {
    winner = 'tie';
  }

  return {
    black: {
      territory: blackTerritory,
      stones: blackLivingStones,
      captures: captures.black,
      deadStones: dead.white,
      total: blackTotal
    },
    white: {
      territory: whiteTerritory,
      stones: whiteLivingStones,
      captures: captures.white,
      deadStones: dead.black,
      komi,
      total: whiteTotal
    },
    winner,
    margin: Math.abs(blackTotal - whiteTotal)
  };
}

/**
 * Create an empty board
 */
export function createEmptyBoard(): BoardState {
  return Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(EMPTY));
}

/**
 * Check if a point is a star point (hoshi)
 */
export function isStarPoint(x: number, y: number): boolean {
  const starPositions = [3, 9, 15];
  return starPositions.includes(x) && starPositions.includes(y);
}

/**
 * Get all star point positions
 */
export function getStarPoints(): Point[] {
  const positions = [3, 9, 15];
  const starPoints: Point[] = [];

  for (const x of positions) {
    for (const y of positions) {
      starPoints.push({ x, y });
    }
  }

  return starPoints;
}

/**
 * Convert board coordinates to display coordinates (1-19, A-T)
 */
export function toDisplayCoords(x: number, y: number): string {
  // Skip 'I' in Go coordinates
  const letters = 'ABCDEFGHJKLMNOPQRST';
  const col = letters[x] || '?';
  const row = 19 - y; // Row 1 is at the bottom
  return `${col}${row}`;
}

/**
 * Convert display coordinates to board coordinates
 */
export function fromDisplayCoords(coord: string): Point | null {
  const letters = 'ABCDEFGHJKLMNOPQRST';
  const match = coord.toUpperCase().match(/^([A-HJ-T])(\d{1,2})$/);

  if (!match) return null;

  const x = letters.indexOf(match[1]);
  const row = parseInt(match[2]);

  if (x < 0 || row < 1 || row > 19) return null;

  return { x, y: 19 - row };
}
