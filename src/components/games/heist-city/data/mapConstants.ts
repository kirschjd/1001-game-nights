// Map constants for Heist City

// Map dimensions in inches (0-indexed: 0 to 35 = 36 squares)
export const MAX_COORDINATE = 35; // Maximum coordinate for item placement
export const NUM_SQUARES = 36; // Number of grid squares (0-35 = 36 squares)
export const MAP_SIZE_INCHES = NUM_SQUARES; // Physical size in inches (36")

// SVG viewport size (pixels)
export const SVG_WIDTH = 900;
export const SVG_HEIGHT = 900;

// Scale factor: pixels per inch
export const SCALE = SVG_WIDTH / MAP_SIZE_INCHES; // 900/36 = 25 pixels per inch

// Grid settings
export const GRID_SIZE_INCHES = 1; // 1 inch grid squares
export const GRID_COLUMNS = NUM_SQUARES; // 36 columns
export const GRID_ROWS = NUM_SQUARES; // 36 rows

// Legacy constants for backwards compatibility
export const MAP_WIDTH_INCHES = MAX_COORDINATE;
export const MAP_HEIGHT_INCHES = MAX_COORDINATE;

// Character token settings
export const TOKEN_RADIUS = 12; // pixels
export const TOKENS_PER_PLAYER = 5;
export const TOTAL_TOKENS = TOKENS_PER_PLAYER * 2;

// Player colors
export const PLAYER_COLORS = {
  1: '#3b82f6', // Blue
  2: '#ef4444', // Red
};

// Item colors and sizes
export const ITEM_STYLES = {
  wall: {
    color: '#5b21b6', // Deep purple
    size: 1, // inches (full square for continuous walls)
  },
  table: {
    color: '#e9d5ff', // Very light purple (partial cover)
    size: 2, // inches (2x2)
  },
  computer: {
    color: '#1e293b',
    size: 1,
  },
  gear: {
    color: '#16a34a',
    size: 0.5,
  },
  teleporter: {
    color: '#a855f7',
    size: 1.5,
  },
  'info-drop': {
    color: '#eab308',
    size: 0.5,
  },
  'enemy-camera': {
    color: '#dc2626',
    size: 0.7,
  },
  'enemy-rapid-response': {
    color: '#f97316',
    size: 1,
  },
  'enemy-security-guard': {
    color: '#991b1b',
    size: 1,
  },
};

// Convert inches to pixels
export const inchesToPixels = (inches: number): number => {
  return inches * SCALE;
};

// Convert pixels to inches
export const pixelsToInches = (pixels: number): number => {
  return pixels / SCALE;
};

// Snap position to grid
export const snapToGrid = (position: { x: number; y: number }, gridSize: number = GRID_SIZE_INCHES) => {
  return {
    x: Math.round(position.x / gridSize) * gridSize,
    y: Math.round(position.y / gridSize) * gridSize,
  };
};

// Check if position is within map bounds
export const isWithinBounds = (position: { x: number; y: number }): boolean => {
  return position.x >= 0 && position.x <= MAP_WIDTH_INCHES &&
         position.y >= 0 && position.y <= MAP_HEIGHT_INCHES;
};

// Center offset to place items in center of grid squares (not on crosshairs)
export const GRID_CENTER_OFFSET = GRID_SIZE_INCHES / 2; // 0.5 inches
