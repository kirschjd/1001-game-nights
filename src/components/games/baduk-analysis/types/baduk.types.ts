// Baduk (Go) Analysis Tool Types

// Stone values
export type StoneColor = 0 | 1 | 2; // EMPTY, BLACK, WHITE
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

// Board representation (19x19 2D array)
export type BoardState = StoneColor[][];

// Point on the board
export interface Point {
  x: number;
  y: number;
}

// Annotation types
export type AnnotationType = 'triangle' | 'square' | 'circle' | 'x' | 'label';

export interface Annotation {
  type: AnnotationType;
  point: Point;
  label?: string;
}

// Serialized node for network transfer
export interface SerializedMoveTreeNode {
  id: string;
  move: Point | null;
  isPass: boolean;
  color: 'black' | 'white' | null;
  comment: string;
  annotations: Annotation[];
  moveNumber: number;
  parentId: string | null;
  childrenIds: string[];
  hasVariations: boolean;
}

// Current node details
export interface CurrentNodeInfo {
  id: string;
  move: Point | null;
  isPass: boolean;
  color: 'black' | 'white' | null;
  comment: string;
  annotations: Annotation[];
  moveNumber: number;
  hasChildren: boolean;
  hasVariations: boolean;
  childrenIds: string[];
  parentId: string | null;
}

// Move tree structure
export interface MoveTree {
  rootId: string;
  currentNodeId: string;
  nodes: Record<string, SerializedMoveTreeNode>;
  nodeCount: number;
  pathToCurrentNode: string[];
}

// Game metadata
export interface GameMetadata {
  blackPlayer: string;
  whitePlayer: string;
  komi: number;
  handicap: number;
  date: string;
  result: string | null;
  event?: string;
  source?: string;
}

// Player in session
export interface Player {
  playerId: string;
  playerName: string;
  isConnected: boolean;
}

// Board configuration
export interface BoardConfig {
  boardSize: number;
  starPoints: [number, number][];
}

// AI opponent settings
export interface AIOpponentSettings {
  enabled: boolean;
  color: 'black' | 'white';
  skillLevel: string;
  isThinking: boolean;
}

// Skill level option for UI
export interface SkillLevelOption {
  id: string;
  name: string;
  description: string;
}

// AI move result
export interface AIMoveResult {
  move: Point | null;
  isPass: boolean;
  winrate: number;
  scoreLead: number;
  skillLevel: string;
}

// Game phases
export type GamePhase = 'analyzing' | 'scoring' | 'finished';

// Full game state from server
export interface BadukAnalysisState {
  type: 'baduk-analysis';
  started: boolean;
  phase: GamePhase;

  // Board state
  board: BoardState;

  // Move tree
  moveTree: MoveTree;

  // Current node details
  currentNode: CurrentNodeInfo;

  // Game metadata
  metadata: GameMetadata;

  // Current turn
  currentTurn: 'black' | 'white';

  // Captures
  captures: {
    black: number;
    white: number;
  };

  // Ko point
  koPoint: Point | null;

  // Players
  players: Player[];

  // Dead stones (for scoring phase) - array of "x,y" strings
  deadStones: string[];

  // AI opponent settings
  aiOpponent: AIOpponentSettings;

  // Board config
  config: BoardConfig;
}

// Navigation directions
export type NavigationDirection = 'forward' | 'back' | 'to-node' | 'to-start' | 'to-end';

// Socket event types
export interface PlaceStoneData {
  slug: string;
  x: number;
  y: number;
}

export interface NavigateData {
  slug: string;
  direction: NavigationDirection;
  nodeId?: string;
}

export interface UploadSGFData {
  slug: string;
  sgfContent: string;
}

export interface AddCommentData {
  slug: string;
  comment: string;
}

export interface AddAnnotationData {
  slug: string;
  type: AnnotationType;
  x: number;
  y: number;
  label?: string;
}

// AI Analysis types
export interface AIAnalysisRequest {
  board: BoardState;
  currentTurn: 'black' | 'white';
  komi: number;
  options?: {
    maxVisits?: number;
    timeLimit?: number;
  };
}

export interface AIMoveAnalysis {
  point: Point | null; // null for pass
  winrate: number;
  visits: number;
  scoreLead: number;
  pv: Point[]; // Principal variation
}

export interface AIAnalysisResult {
  timestamp: number;
  moves: AIMoveAnalysis[];
  overallWinrate: { black: number; white: number };
  scoreLead: number;
  message?: string | null;
  available: boolean; // Whether KataGo is configured
}

export interface AIAnalysisStatus {
  status: 'starting' | 'analyzing' | 'complete' | 'error';
  message: string;
}
