import { useReducer } from 'react';
import { MapState, GridType, PlayerSelection, Position, CharacterToken } from '../types';
import { LogEntry } from '../components/GameLog';
import { AdvisorConfig, AdvisorEntry, DEFAULT_ADVISOR_CONFIG } from '../engine/advisor';

// --- Types (moved from useHeistCitySocket) ---

export interface HeistCityGameState {
  gameState: string;
  mapState?: MapState;
  mapId?: string;
  players?: Array<{ id: string; name: string }>;
}

export interface DiceRoll {
  dice1: number;
  dice2: number;
  total: number;
  roller?: string;
}

export interface RulerState {
  start: Position | null;
  end: Position | null;
  playerId: string | null;
}

// --- Consolidated state ---

export type AIStatus = 'idle' | 'thinking' | 'executing' | 'paused' | 'error';

export interface HeistCityState {
  gameState: HeistCityGameState | null;
  mapState: MapState | null;
  gridType: GridType;
  playerSelections: PlayerSelection[];
  lastDiceRoll: DiceRoll | null;
  logEntries: LogEntry[];
  turnNumber: number;
  rulerState: RulerState | null;
  isSyncing: boolean;
  alertModifier: number;
  // AI Controller state
  aiEnabled: boolean;
  aiDifficulty: 'easy' | 'normal' | 'hard';
  aiPlayerNumber: 1 | 2;
  aiStatus: AIStatus;
  aiError: string | null;
  // Rules Advisor state
  advisorEnabled: boolean;
  advisorConfig: AdvisorConfig;
  advisorEntries: AdvisorEntry[];
}

// --- Actions ---

export type HeistCityAction =
  | { type: 'SET_GAME_STATE'; gameState: HeistCityGameState }
  | { type: 'GAME_STARTED'; gameState: HeistCityGameState; mapState: MapState; gridType: GridType; turnNumber: number }
  | { type: 'UPDATE_MAP_STATE'; mapState: MapState }
  | { type: 'UPDATE_CHARACTER'; characterId: string; updates: Partial<CharacterToken> }
  | { type: 'UPDATE_TURN'; turnNumber: number }
  | { type: 'UPDATE_ALERT'; alertModifier: number }
  | { type: 'UPDATE_SELECTIONS'; selections: PlayerSelection[] }
  | { type: 'UPDATE_PLAYER_NAME'; playerId: string; newName: string }
  | { type: 'SET_DICE_ROLL'; roll: DiceRoll }
  | { type: 'ADD_LOG_ENTRY'; entry: LogEntry }
  | { type: 'SET_RULER'; rulerState: RulerState | null }
  | { type: 'SET_SYNCING'; isSyncing: boolean }
  | { type: 'LOAD_MAP'; mapState: MapState; gridType: GridType; turnNumber: number }
  | { type: 'LOAD_GAME'; mapState: MapState; gridType: GridType; turnNumber: number; alertModifier: number }
  | { type: 'SYNC_FULL_STATE'; data: {
      mapState?: MapState;
      gridType?: GridType;
      gameInfo?: { turnNumber?: number };
      playerSelections?: PlayerSelection[];
      players?: Array<{ id: string; name: string }>;
    }; version: number }
  // AI Controller actions
  | { type: 'SET_AI_ENABLED'; enabled: boolean }
  | { type: 'SET_AI_DIFFICULTY'; difficulty: 'easy' | 'normal' | 'hard' }
  | { type: 'SET_AI_PLAYER'; playerNumber: 1 | 2 }
  | { type: 'SET_AI_STATUS'; status: AIStatus; error?: string }
  // Rules Advisor actions
  | { type: 'SET_ADVISOR_ENABLED'; enabled: boolean }
  | { type: 'SET_ADVISOR_CONFIG'; config: AdvisorConfig }
  | { type: 'ADD_ADVISOR_ENTRY'; entry: AdvisorEntry }
  | { type: 'CLEAR_ADVISOR_ENTRIES' };

// --- Initial state ---

export const initialHeistCityState: HeistCityState = {
  gameState: null,
  mapState: null,
  gridType: 'hex',
  playerSelections: [],
  lastDiceRoll: null,
  logEntries: [],
  turnNumber: 1,
  rulerState: null,
  isSyncing: false,
  alertModifier: 0,
  aiEnabled: false,
  aiDifficulty: 'normal',
  aiPlayerNumber: 2,
  aiStatus: 'idle',
  aiError: null,
  advisorEnabled: false,
  advisorConfig: DEFAULT_ADVISOR_CONFIG,
  advisorEntries: [],
};

// --- Reducer ---

export function heistCityReducer(state: HeistCityState, action: HeistCityAction): HeistCityState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.gameState };

    case 'GAME_STARTED':
      return {
        ...state,
        gameState: action.gameState,
        mapState: action.mapState,
        gridType: action.gridType,
        turnNumber: action.turnNumber,
      };

    case 'UPDATE_MAP_STATE':
      return { ...state, mapState: action.mapState };

    case 'UPDATE_CHARACTER': {
      if (!state.mapState) return state;
      return {
        ...state,
        mapState: {
          ...state.mapState,
          characters: state.mapState.characters.map(char =>
            char.id === action.characterId ? { ...char, ...action.updates } : char
          ),
        },
      };
    }

    case 'UPDATE_TURN':
      return { ...state, turnNumber: action.turnNumber };

    case 'UPDATE_ALERT':
      return { ...state, alertModifier: action.alertModifier };

    case 'UPDATE_SELECTIONS':
      return { ...state, playerSelections: action.selections };

    case 'UPDATE_PLAYER_NAME': {
      if (!state.gameState?.players) return state;
      return {
        ...state,
        gameState: {
          ...state.gameState,
          players: state.gameState.players.map(p =>
            p.id === action.playerId ? { ...p, name: action.newName } : p
          ),
        },
      };
    }

    case 'SET_DICE_ROLL':
      return { ...state, lastDiceRoll: action.roll };

    case 'ADD_LOG_ENTRY':
      return { ...state, logEntries: [...state.logEntries, action.entry] };

    case 'SET_RULER':
      return { ...state, rulerState: action.rulerState };

    case 'SET_SYNCING':
      return { ...state, isSyncing: action.isSyncing };

    case 'LOAD_MAP':
      return {
        ...state,
        mapState: action.mapState,
        gridType: action.gridType,
        turnNumber: action.turnNumber,
        playerSelections: [],
      };

    case 'LOAD_GAME':
      return {
        ...state,
        mapState: action.mapState,
        gridType: action.gridType,
        turnNumber: action.turnNumber,
        alertModifier: action.alertModifier,
        playerSelections: [],
      };

    case 'SYNC_FULL_STATE': {
      return {
        ...state,
        isSyncing: false,
        ...(action.data.mapState && { mapState: action.data.mapState }),
        ...(action.data.gridType && { gridType: action.data.gridType }),
        ...(action.data.gameInfo?.turnNumber != null && { turnNumber: action.data.gameInfo.turnNumber }),
        ...(action.data.playerSelections && { playerSelections: action.data.playerSelections }),
        ...(action.data.players && state.gameState
          ? { gameState: { ...state.gameState, players: action.data.players } }
          : {}),
      };
    }

    // AI Controller
    case 'SET_AI_ENABLED':
      return { ...state, aiEnabled: action.enabled, aiStatus: action.enabled ? state.aiStatus : 'idle', aiError: null };

    case 'SET_AI_DIFFICULTY':
      return { ...state, aiDifficulty: action.difficulty };

    case 'SET_AI_PLAYER':
      return { ...state, aiPlayerNumber: action.playerNumber };

    case 'SET_AI_STATUS':
      return { ...state, aiStatus: action.status, aiError: action.error ?? null };

    // Rules Advisor
    case 'SET_ADVISOR_ENABLED':
      return { ...state, advisorEnabled: action.enabled };

    case 'SET_ADVISOR_CONFIG':
      return { ...state, advisorConfig: action.config };

    case 'ADD_ADVISOR_ENTRY':
      return { ...state, advisorEntries: [...state.advisorEntries, action.entry] };

    case 'CLEAR_ADVISOR_ENTRIES':
      return { ...state, advisorEntries: [] };

    default:
      return state;
  }
}

// --- Hook ---

export function useHeistCityState() {
  return useReducer(heistCityReducer, initialHeistCityState);
}
