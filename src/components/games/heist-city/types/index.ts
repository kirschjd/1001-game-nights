// Type definitions for Heist City game

export interface Position {
  x: number; // Position in inches (0-36)
  y: number; // Position in inches (0-36)
}

export interface GridPosition {
  row: number;
  col: number;
}

export type ItemType =
  | 'wall'
  | 'table'
  | 'computer'
  | 'gear'
  | 'teleporter'
  | 'info-drop'
  | 'enemy-camera'
  | 'enemy-rapid-response'
  | 'enemy-security-guard';

export interface MapItem {
  id: string;
  type: ItemType;
  position: Position;
  rotation?: number; // Rotation in degrees (0-359)

  // Geometry properties
  size?: number; // Size in grid squares (default 1)
  width?: number; // Width in grid squares (for rectangular items)
  height?: number; // Height in grid squares (for rectangular items)
  endPosition?: Position; // End position for linear segments (walls)

  // Dynamic properties
  destructible?: boolean; // Can be destroyed
  health?: number; // Hit points before destruction
  maxHealth?: number; // Maximum health
  moveable?: boolean; // Can be pushed/moved
  interactive?: boolean; // Can be hacked/accessed
  provideCover?: boolean; // Blocks line of sight

  // Additional properties
  properties?: Record<string, any>; // Item-specific properties
}

export interface MapZone {
  id: string;
  position: Position; // Top-left corner position in inches
  width: number; // Width in grid squares
  height: number; // Height in grid squares
  color: string; // RGBA color string
  label: string; // Zone label/name
}

export type CharacterRole = 'Face' | 'Muscle' | 'Ninja' | 'Brain' | 'Spook';
export type CharacterState = 'Overt' | 'Hidden' | 'Disguised';

export interface CharacterStats {
  movement: number; // M
  meleeSkill: number; // MS
  ballisticSkill: number; // BS
  wounds: number; // W (current)
  maxWounds: number; // W (max)
  defense: number; // D
  hack: number; // H
  con: number; // C
}

export interface CharacterToken {
  id: string;
  playerId: string;
  playerNumber: 1 | 2;
  position: Position;
  color: string;
  name: string;
  role: CharacterRole;
  stats: CharacterStats;
  state: CharacterState;
  isSelected?: boolean;
}

export interface Player {
  id: string;
  name: string;
  playerNumber: 1 | 2;
  tokens: CharacterToken[];
}

export interface MapState {
  items: MapItem[];
  characters: CharacterToken[];
  zones: MapZone[];
}

export interface GameState {
  gameState: 'setup' | 'playing' | 'finished';
  players: Player[];
  mapState: MapState;
  currentTurn?: string; // Player ID whose turn it is
}

export interface HeistCityAction {
  type: string;
  payload: any;
}

// Map definition types (for JSON files)
export interface MapDefinitionItem {
  id?: string; // Optional - will be auto-generated if not provided
  type: ItemType;
  position: Position;
  rotation?: number;

  // Geometry options
  size?: number;
  width?: number;
  height?: number;
  endPosition?: Position;

  // Dynamic properties
  destructible?: boolean;
  health?: number;
  moveable?: boolean;
  interactive?: boolean;
  provideCover?: boolean;
  properties?: Record<string, any>;
}

export interface MapDefinition {
  id: string; // Unique identifier for the map
  name: string;
  description: string;
  items: MapDefinitionItem[];
  zones?: MapZone[]; // Optional zones
  startPositions: {
    player1: Position[];
    player2: Position[];
  };
}
