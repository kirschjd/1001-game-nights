import { useEffect, useRef, useCallback, Dispatch } from 'react';
import { Socket } from 'socket.io-client';
import { MapState, GridType, PlayerSelection, Position, CharacterToken } from '../types';
import { LogEntry } from '../components/GameLog';
import { loadMap } from '../data/mapLoader';
import { HeistCityState, HeistCityAction, HeistCityGameState, DiceRoll } from './useHeistCityState';

// --- Hook ---

export function useHeistCitySocket(
  socket: Socket,
  lobbyId: string,
  playerId: string,
  state: HeistCityState,
  dispatch: Dispatch<HeistCityAction>
) {
  // --- Refs for stable access inside socket listeners ---
  // Listeners register once; they read current state via this ref.
  const stateRef = useRef(state);
  const lastKnownVersionRef = useRef(0);
  const isSyncingRef = useRef(false);

  useEffect(() => { stateRef.current = state; }, [state]);

  // --- Version tracking ---
  // Detects gaps in version numbers and requests a full sync if needed.
  const checkVersionAndSync = useCallback((receivedVersion: number | undefined) => {
    if (receivedVersion === undefined) return;

    if (lastKnownVersionRef.current > 0 && receivedVersion - lastKnownVersionRef.current > 1) {
      console.log(`[HeistCity] Version gap: local v${lastKnownVersionRef.current} → server v${receivedVersion}`);
      if (!isSyncingRef.current) {
        isSyncingRef.current = true;
        dispatch({ type: 'SET_SYNCING', isSyncing: true });
        console.log('[HeistCity] Requesting full sync...');
        socket.emit('request-full-sync', { lobbyId, clientVersion: lastKnownVersionRef.current });
      }
    } else {
      lastKnownVersionRef.current = receivedVersion;
    }
  }, [socket, lobbyId, dispatch]);

  // --- Socket listener registration (registers once, reads current values via refs) ---
  useEffect(() => {
    socket.on('gameStateUpdate', (gameState: HeistCityGameState) => {
      dispatch({ type: 'SET_GAME_STATE', gameState });
      if (gameState.mapState) {
        dispatch({ type: 'UPDATE_MAP_STATE', mapState: gameState.mapState });
      }
    });

    socket.on('game-started', (serverState: any) => {
      console.log('Heist City game started:', serverState);

      if (serverState.version) {
        console.log(`[HeistCity] Initial version: ${serverState.version}`);
        lastKnownVersionRef.current = serverState.version;
      }

      if (serverState.mapState) {
        console.log('Using existing map state from server');
        dispatch({
          type: 'GAME_STARTED',
          gameState: serverState,
          mapState: serverState.mapState,
          gridType: serverState.gridType || 'hex',
          turnNumber: serverState.gameInfo?.turnNumber || 1,
        });
      } else {
        console.log('Loading fresh map');
        const mapId = serverState.mapId || 'bank-job-hex';
        const players = serverState.players || [];
        const player1Id = players[0]?.id || 'player-1';
        const player2Id = players[1]?.id || 'player-2';

        try {
          const loadedMap = loadMap(mapId, player1Id, player2Id);
          dispatch({
            type: 'GAME_STARTED',
            gameState: serverState,
            mapState: loadedMap,
            gridType: loadedMap.gridType,
            turnNumber: 1,
          });
        } catch (error) {
          console.error('Error loading map:', error);
          const loadedMap = loadMap('bank-job-hex', player1Id, player2Id);
          dispatch({
            type: 'GAME_STARTED',
            gameState: serverState,
            mapState: loadedMap,
            gridType: loadedMap.gridType,
            turnNumber: 1,
          });
        }
      }
    });

    // Request current game state on mount (handles missed game-started event)
    socket.emit('request-game-state', { lobbyId });

    socket.on('heist-city-map-state-update', (data: { mapState: MapState; version?: number } | MapState) => {
      const newMapState = 'mapState' in data ? data.mapState : data;
      const version = 'version' in data ? data.version : undefined;
      console.log(`Received map state update from server (v${version})`);
      checkVersionAndSync(version);
      dispatch({ type: 'UPDATE_MAP_STATE', mapState: newMapState });
    });

    socket.on('heist-city-character-updated', (data: {
      characterId: string;
      updates: Partial<CharacterToken>;
      version?: number;
    }) => {
      console.log(`Received character update from server (${data.characterId}, v${data.version})`);
      checkVersionAndSync(data.version);
      dispatch({ type: 'UPDATE_CHARACTER', characterId: data.characterId, updates: data.updates });
    });

    socket.on('heist-city-dice-roll', (rollData: DiceRoll) => {
      console.log('Received dice roll update:', rollData);
      dispatch({ type: 'SET_DICE_ROLL', roll: rollData });

      const currentState = stateRef.current;
      const rollerName = currentState.gameState?.players?.find(p => p.id === rollData.roller)?.name || rollData.roller || 'Unknown';
      const logEntry: LogEntry = {
        id: `roll-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: 'dice-roll',
        playerName: rollerName,
        dice1: rollData.dice1,
        dice2: rollData.dice2,
        total: rollData.total,
      };
      dispatch({ type: 'ADD_LOG_ENTRY', entry: logEntry });
    });

    socket.on('heist-city-game-info-update', (data: {
      turnNumber: number;
      blueVictoryPoints?: number;
      redVictoryPoints?: number;
      version?: number;
    }) => {
      console.log(`Received game info update (v${data.version}):`, data);
      checkVersionAndSync(data.version);
      dispatch({ type: 'UPDATE_TURN', turnNumber: data.turnNumber });
    });

    socket.on('heist-city-selection-update', (data: { selections: PlayerSelection[]; version?: number } | PlayerSelection[]) => {
      const selections = Array.isArray(data) ? data : data.selections;
      const version = !Array.isArray(data) && 'version' in data ? data.version : undefined;
      console.log(`Received selection update (v${version}):`, selections);
      checkVersionAndSync(version);
      dispatch({ type: 'UPDATE_SELECTIONS', selections });
    });

    socket.on('heist-city-map-loaded', (data: {
      mapState: MapState;
      gridType?: GridType;
      turnNumber: number;
      blueVictoryPoints: number;
      redVictoryPoints: number;
      version?: number;
    }) => {
      console.log(`Received map load event (v${data.version}):`, data);
      checkVersionAndSync(data.version);
      dispatch({
        type: 'LOAD_MAP',
        mapState: data.mapState,
        gridType: data.gridType || stateRef.current.gridType,
        turnNumber: data.turnNumber,
      });
    });

    socket.on('heist-city-ruler-update', (data: {
      start: Position | null;
      end: Position | null;
      playerId: string | null;
    }) => {
      console.log('Received ruler update:', data);
      dispatch({ type: 'SET_RULER', rulerState: data.start && data.end ? data : null });
    });

    socket.on('heist-city-name-update', (data: {
      playerId: string;
      newName: string;
    }) => {
      console.log('Received name update:', data);
      dispatch({ type: 'UPDATE_PLAYER_NAME', playerId: data.playerId, newName: data.newName });
    });

    socket.on('heist-city-ai-log', (data: { entries: LogEntry[] }) => {
      console.log('Received AI log broadcast:', data.entries.length, 'entries');
      for (const entry of data.entries) {
        dispatch({ type: 'ADD_LOG_ENTRY', entry });
      }
    });

    socket.on('full-sync-response', (data: {
      success: boolean;
      state?: any;
      version?: number;
      lastUpdated?: number;
      inSync?: boolean;
      reason?: string;
    }) => {
      console.log('[HeistCity] Full sync response:', data);
      isSyncingRef.current = false;

      if (!data.success) {
        console.error('[HeistCity] Full sync failed:', data.reason);
        dispatch({ type: 'SET_SYNCING', isSyncing: false });
        return;
      }

      if (data.inSync) {
        console.log('[HeistCity] Client is in sync');
        if (data.version) {
          lastKnownVersionRef.current = data.version;
        }
        dispatch({ type: 'SET_SYNCING', isSyncing: false });
        return;
      }

      if (data.state) {
        console.log(`[HeistCity] Applying full state sync (v${data.version})`);
        lastKnownVersionRef.current = data.version || 0;
        dispatch({ type: 'SYNC_FULL_STATE', data: data.state, version: data.version || 0 });
      }
    });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('game-started');
      socket.off('heist-city-map-state-update');
      socket.off('heist-city-character-updated');
      socket.off('heist-city-dice-roll');
      socket.off('heist-city-game-info-update');
      socket.off('heist-city-selection-update');
      socket.off('heist-city-map-loaded');
      socket.off('heist-city-ruler-update');
      socket.off('heist-city-name-update');
      socket.off('heist-city-ai-log');
      socket.off('full-sync-response');
    };
  }, [socket, lobbyId, checkVersionAndSync, dispatch]);

  // --- Emitter functions ---

  // Dispatches UPDATE_MAP_STATE and emits to server.
  // The server broadcasts to OTHER players only (socket.to), so local update is required.
  const emitMapStateChange = useCallback((newMapState: MapState) => {
    dispatch({ type: 'UPDATE_MAP_STATE', mapState: newMapState });
    socket.emit('heist-city-map-state-change', {
      lobbyId,
      mapState: newMapState,
      gridType: stateRef.current.gridType,
    });
  }, [socket, lobbyId, dispatch]);

  // Dispatches UPDATE_CHARACTER for immediate local feedback and emits only { characterId, updates }.
  // The server applies the partial update and broadcasts to OTHER players only.
  const emitCharacterUpdate = useCallback((characterId: string, updates: Partial<CharacterToken>) => {
    dispatch({ type: 'UPDATE_CHARACTER', characterId, updates });
    socket.emit('heist-city-character-update', {
      lobbyId,
      characterId,
      updates,
    });
  }, [socket, lobbyId, dispatch]);

  // Dispatches SET_DICE_ROLL for immediate feedback and emits.
  // The server broadcasts to ALL players (including sender), so the listener will also fire.
  const emitDiceRoll = useCallback((dice1: number, dice2: number, total: number) => {
    const rollData = { dice1, dice2, total, roller: playerId };
    dispatch({ type: 'SET_DICE_ROLL', roll: rollData });
    socket.emit('heist-city-dice-roll', { lobbyId, ...rollData });
  }, [socket, lobbyId, playerId, dispatch]);

  // Emits game info (turn number, VP) to other players.
  // The server broadcasts to OTHER players only, so the component must update local state before calling.
  const emitGameInfoUpdate = useCallback((newTurnNumber: number, blueVP: number, redVP: number) => {
    socket.emit('heist-city-game-info-update', {
      lobbyId,
      turnNumber: newTurnNumber,
      blueVictoryPoints: blueVP,
      redVictoryPoints: redVP,
    });
  }, [socket, lobbyId]);

  // Dispatches UPDATE_SELECTIONS for immediate feedback and emits.
  // The server broadcasts to ALL players (including sender).
  const emitSelectionChange = useCallback((selections: PlayerSelection[]) => {
    dispatch({ type: 'UPDATE_SELECTIONS', selections });
    socket.emit('heist-city-selection-change', { lobbyId, selections });
  }, [socket, lobbyId, dispatch]);

  // Emits a map load event. The server broadcasts to ALL players (including sender),
  // so the listener will handle local state updates.
  const emitMapLoad = useCallback((data: {
    mapId: string;
    mapState: MapState;
    gridType: GridType;
    turnNumber: number;
    blueVictoryPoints: number;
    redVictoryPoints: number;
  }) => {
    socket.emit('heist-city-map-load', { lobbyId, ...data });
  }, [socket, lobbyId]);

  // Dispatches SET_RULER for immediate feedback and emits.
  // The server broadcasts to ALL players (including sender).
  const emitRulerUpdate = useCallback((start: Position | null, end: Position | null) => {
    const rulerData = {
      start,
      end,
      playerId: start && end ? playerId : null,
    };
    dispatch({ type: 'SET_RULER', rulerState: rulerData });
    socket.emit('heist-city-ruler-update', { lobbyId, ...rulerData });
  }, [socket, lobbyId, playerId, dispatch]);

  // Broadcasts AI log entries to other players so their game logs stay in sync.
  const emitAILogBroadcast = useCallback((entries: LogEntry[]) => {
    socket.emit('heist-city-ai-log', { lobbyId, entries });
  }, [socket, lobbyId]);

  return {
    emitMapStateChange,
    emitCharacterUpdate,
    emitDiceRoll,
    emitGameInfoUpdate,
    emitSelectionChange,
    emitMapLoad,
    emitRulerUpdate,
    emitAILogBroadcast,
  };
}
