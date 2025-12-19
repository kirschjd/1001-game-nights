// Type definitions for Heist City game

// Grid type for hybrid grid support
export type GridType = 'square' | 'hex';

export interface Position {
  x: number; // Position in inches (0-36) for square, axial q for hex
  y: number; // Position in inches (0-36) for square, axial r for hex
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
  | 'enemy-elite'
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
  position: Position; // Top-left corner position in inches (square), center position in axial coords (hex)
  width: number; // Width in grid squares (square grid only)
  height: number; // Height in grid squares (square grid only)
  color: string; // RGBA color string
  label: string; // Zone label/name
  hexCells?: Position[]; // Array of hex cell positions (axial coords) for hex grids
}

export type CharacterRole = 'Face' | 'Muscle' | 'Ninja' | 'Brain' | 'Spook';
export type CharacterState = 'Overt' | 'Hidden' | 'Disguised' | 'Stunned' | 'Unconscious';

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

// Stat bonuses from equipment (negative = improvement for skill checks, positive = improvement for wounds/movement)
export interface StatBonus {
  movement?: number;       // M: positive is better
  meleeSkill?: number;     // MS: negative is better (lower target number)
  ballisticSkill?: number; // BS: negative is better
  maxWounds?: number;      // W: positive is better
  defense?: number;        // D: negative is better
  hack?: number;           // H: negative is better
  con?: number;            // C: negative is better
  inventorySlots?: number; // Extra inventory slots (positive = more slots)
}

export interface EquipmentItem {
  id: string;
  type: 'Ranged' | 'Melee' | 'Thrown' | 'Tool';
  Cost: number;
  Attacks?: number;
  Range?: number;
  Damage?: number;
  Size?: number;
  Notice?: {
    Hidden?: boolean;
    Disguised?: boolean;
  };
  Special?: {
    [key: string]: boolean;
  };
  Description?: string;
  StatBonus?: StatBonus; // Equipment stat modifiers
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
  exhausted?: boolean;
  equipment?: string[]; // Array of equipment item IDs (max 3)
  actions?: string[]; // Array of action names (max 3)
  victoryPoints?: number; // VP earned by this character
  experience?: number; // Experience points (XP)
}

// Equipment loadout for saving/loading
export interface EquipmentLoadout {
  name: string;
  timestamp: number;
  characters: {
    role: CharacterRole;
    equipment: string[];
    experience?: number; // XP for progression tracking
    stats?: CharacterStats; // Base stat modifications (permanent changes)
  }[];
}

// Full game state for saving/loading
export interface SavedGameState {
  name: string;
  timestamp: number;
  mapState: MapState;
  gridType: GridType;
  turnNumber: number;
  alertModifier: number;
}

export interface Player {
  id: string;
  name: string;
  playerNumber: 1 | 2;
  tokens: CharacterToken[];
}

/**
 * Tracks which player has selected which character
 */
export interface PlayerSelection {
  playerId: string;
  characterId: string;
  playerNumber: 1 | 2 | 'observer'; // For color-coding the focus ring
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
  gridType?: GridType; // Grid type for the map (defaults to 'square')
  items: MapDefinitionItem[];
  zones?: MapZone[]; // Optional zones
  startPositions: {
    player1: Position[];
    player2: Position[];
  };
}
