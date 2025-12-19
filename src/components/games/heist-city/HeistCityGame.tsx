import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import CharacterCard from './components/CharacterCard';
import { MapState, CharacterToken, CharacterState, PlayerSelection, Position, GridType, EquipmentLoadout, SavedGameState } from './types';
import { loadMap } from './data/mapLoader';
import { LogEntry } from './components/GameLog';
import { getEquipmentByIds } from './data/equipmentLoader';
import {
  getSavedLoadouts,
  saveLoadout,
  deleteLoadout,
  createLoadoutFromCharacters,
  applyLoadoutToCharacters,
  importLoadoutFromJson,
  downloadLoadoutAsFile,
  copyLoadoutToClipboard,
} from './data/loadoutManager';
import {
  getSavedGames,
  saveGameState,
  deleteSavedGame,
  createSavedGameState,
  importGameStateFromJson,
  downloadGameStateAsFile,
  copyGameStateToClipboard,
} from './data/gameStateManager';

interface HeistCityGameProps {
  socket: Socket;
  lobbyId: string;
  playerId: string;
}

interface GameState {
  gameState: string;
  mapState?: MapState;
  mapId?: string; // Selected map ID
  players?: Array<{ id: string; name: string }>;
}

const HeistCityGame: React.FC<HeistCityGameProps> = ({ socket, lobbyId, playerId }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [mapState, setMapState] = useState<MapState | null>(null);
  const [gridType, setGridType] = useState<GridType>('hex');
  const [playerSelections, setPlayerSelections] = useState<PlayerSelection[]>([]);
  // Version tracking for sync detection
  const [lastKnownVersion, setLastKnownVersion] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastDiceRoll, setLastDiceRoll] = useState<{
    dice1: number;
    dice2: number;
    total: number;
    roller?: string;
  } | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [turnNumber, setTurnNumber] = useState<number>(1);
  const [rulerState, setRulerState] = useState<{
    start: Position | null;
    end: Position | null;
    playerId: string | null;
  } | null>(null);
  const [alertModifier, setAlertModifier] = useState<number>(0);

  // Loadout management state
  const [savedLoadouts, setSavedLoadouts] = useState<EquipmentLoadout[]>([]);
  const [showLoadoutModal, setShowLoadoutModal] = useState<{ type: 'save' | 'load' | 'export'; playerNumber: 1 | 2 } | null>(null);
  const [loadoutName, setLoadoutName] = useState<string>('');
  const [importJson, setImportJson] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Game save management state
  const [savedGames, setSavedGames] = useState<SavedGameState[]>([]);
  const [showGameSaveModal, setShowGameSaveModal] = useState<'save' | 'load' | null>(null);
  const [gameSaveName, setGameSaveName] = useState<string>('');
  const [gameImportJson, setGameImportJson] = useState<string>('');
  const gameFileInputRef = useRef<HTMLInputElement>(null);

  // Load saved loadouts and games on mount
  useEffect(() => {
    setSavedLoadouts(getSavedLoadouts());
    setSavedGames(getSavedGames());
  }, []);

  // Determine current player's number
  const currentPlayerNumber = useMemo((): 1 | 2 | 'observer' => {
    if (!gameState?.players) return 'observer';
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === 0) return 1;
    if (playerIndex === 1) return 2;
    return 'observer';
  }, [gameState?.players, playerId]);

  // Compute VP from character victoryPoints
  const blueVictoryPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 1)
      .reduce((total, char) => total + (char.victoryPoints || 0), 0);
  }, [mapState]);

  const redVictoryPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 2)
      .reduce((total, char) => total + (char.victoryPoints || 0), 0);
  }, [mapState]);

  // Helper to check version and request sync if needed
  const checkVersionAndSync = (receivedVersion: number | undefined) => {
    if (receivedVersion === undefined) return;

    // Check for version gap (more than 1 version behind)
    if (lastKnownVersion > 0 && receivedVersion - lastKnownVersion > 1) {
      console.log(`[HeistCity] Version gap detected: local v${lastKnownVersion} → server v${receivedVersion}`);
      if (!isSyncing) {
        setIsSyncing(true);
        console.log('[HeistCity] Requesting full sync...');
        socket.emit('request-full-sync', { lobbyId, clientVersion: lastKnownVersion });
      }
    } else {
      // Update to new version
      setLastKnownVersion(receivedVersion);
    }
  };

  useEffect(() => {
    // Listen for game state updates
    socket.on('gameStateUpdate', (state: GameState) => {
      setGameState(state);
      if (state.mapState) {
        setMapState(state.mapState);
      }
    });

    // Listen for initial game start with map ID
    socket.on('game-started', (state: any) => {
      console.log('Heist City game started:', state);

      // Track version from server
      if (state.version) {
        console.log(`[HeistCity] Initial version: ${state.version}`);
        setLastKnownVersion(state.version);
      }

      // Check if server has existing map state (e.g., from a refresh)
      if (state.mapState) {
        console.log('Using existing map state from server');
        setMapState(state.mapState);

        // Also restore grid type if available
        if (state.gridType) {
          setGridType(state.gridType);
        }

        // Also restore game info if available (VP comes from character data in mapState)
        if (state.gameInfo) {
          setTurnNumber(state.gameInfo.turnNumber || 1);
        }
      } else {
        // No existing state - load fresh map
        console.log('Loading fresh map');
        const mapId = state.mapId || 'bank-job-hex';
        const players = state.players || [];

        // Get player IDs (first two players)
        const player1Id = players[0]?.id || 'player-1';
        const player2Id = players[1]?.id || 'player-2';

        // Load the map
        try {
          const loadedMap = loadMap(mapId, player1Id, player2Id);
          setMapState(loadedMap);
          setGridType(loadedMap.gridType);
        } catch (error) {
          console.error('Error loading map:', error);
          // Fallback to bank-job if map loading fails
          const loadedMap = loadMap('bank-job-hex', player1Id, player2Id);
          setMapState(loadedMap);
          setGridType(loadedMap.gridType);
        }
      }

      setGameState(state);
    });

    // Request current game state from server when component mounts
    // This handles the case where we missed the initial game-started event
    socket.emit('request-game-state', { lobbyId });

    // Listen for map state updates from other players
    socket.on('heist-city-map-state-update', (data: { mapState: MapState; version?: number } | MapState) => {
      // Handle both new format (with version) and legacy format (just mapState)
      const newMapState = 'mapState' in data ? data.mapState : data;
      const version = 'version' in data ? data.version : undefined;

      console.log(`Received map state update from server (v${version})`);

      // Check version before applying
      checkVersionAndSync(version);
      setMapState(newMapState);
    });

    // Listen for dice roll updates
    socket.on('heist-city-dice-roll', (rollData: { dice1: number; dice2: number; total: number; roller?: string }) => {
      console.log('Received dice roll update:', rollData);
      setLastDiceRoll(rollData);

      // Add to game log with player name
      const rollerName = gameState?.players?.find(p => p.id === rollData.roller)?.name || rollData.roller || 'Unknown';
      const logEntry: LogEntry = {
        id: `roll-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        type: 'dice-roll',
        playerName: rollerName,
        dice1: rollData.dice1,
        dice2: rollData.dice2,
        total: rollData.total,
      };
      setLogEntries(prev => [...prev, logEntry]);
    });

    // Listen for game info updates (turn number only - VP comes from character data)
    socket.on('heist-city-game-info-update', (data: {
      turnNumber: number;
      blueVictoryPoints?: number; // Legacy, VP now from characters
      redVictoryPoints?: number; // Legacy, VP now from characters
      version?: number;
    }) => {
      console.log(`Received game info update (v${data.version}):`, data);
      checkVersionAndSync(data.version);
      setTurnNumber(data.turnNumber);
      // VP is now computed from character.victoryPoints in mapState
    });

    // Listen for player selection updates
    socket.on('heist-city-selection-update', (data: { selections: PlayerSelection[]; version?: number } | PlayerSelection[]) => {
      // Handle both new format (with version) and legacy format (just selections array)
      const selections = Array.isArray(data) ? data : data.selections;
      const version = !Array.isArray(data) && 'version' in data ? data.version : undefined;

      console.log(`Received selection update (v${version}):`, selections);
      checkVersionAndSync(version);
      setPlayerSelections(selections);
    });

    // Listen for map load events
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
      setMapState(data.mapState);
      if (data.gridType) {
        setGridType(data.gridType);
      }
      setTurnNumber(data.turnNumber);
      // VP is now computed from character.victoryPoints in mapState
      setPlayerSelections([]); // Clear all selections
    });

    // Listen for ruler updates
    socket.on('heist-city-ruler-update', (data: {
      start: Position | null;
      end: Position | null;
      playerId: string | null;
    }) => {
      console.log('Received ruler update:', data);
      setRulerState(data.start && data.end ? data : null);
    });

    // Listen for player name updates
    socket.on('heist-city-name-update', (data: {
      playerId: string;
      newName: string;
    }) => {
      console.log('Received name update:', data);
      setGameState(prev => {
        if (!prev || !prev.players) return prev;
        return {
          ...prev,
          players: prev.players.map(p =>
            p.id === data.playerId ? { ...p, name: data.newName } : p
          ),
        };
      });
    });

    // Listen for full sync response
    socket.on('full-sync-response', (data: {
      success: boolean;
      state?: any;
      version?: number;
      lastUpdated?: number;
      inSync?: boolean;
      reason?: string;
    }) => {
      console.log('[HeistCity] Full sync response:', data);
      setIsSyncing(false);

      if (!data.success) {
        console.error('[HeistCity] Full sync failed:', data.reason);
        return;
      }

      if (data.inSync) {
        console.log('[HeistCity] Client is in sync');
        if (data.version) {
          setLastKnownVersion(data.version);
        }
        return;
      }

      // Apply full state
      if (data.state) {
        console.log(`[HeistCity] Applying full state sync (v${data.version})`);
        setLastKnownVersion(data.version || 0);

        if (data.state.mapState) {
          setMapState(data.state.mapState);
        }
        if (data.state.gridType) {
          setGridType(data.state.gridType);
        }
        if (data.state.gameInfo) {
          setTurnNumber(data.state.gameInfo.turnNumber || 1);
          // VP is now computed from character.victoryPoints in mapState
        }
        if (data.state.playerSelections) {
          setPlayerSelections(data.state.playerSelections);
        }
        if (data.state.players) {
          setGameState(prev => prev ? { ...prev, players: data.state.players } : prev);
        }
      }
    });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('game-started');
      socket.off('heist-city-map-state-update');
      socket.off('heist-city-dice-roll');
      socket.off('heist-city-game-info-update');
      socket.off('heist-city-selection-update');
      socket.off('heist-city-map-loaded');
      socket.off('heist-city-ruler-update');
      socket.off('heist-city-name-update');
      socket.off('full-sync-response');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, gameState, lobbyId, lastKnownVersion, isSyncing]);

  // Handle map state changes (e.g., token movement)
  const handleMapStateChange = (newMapState: MapState) => {
    setMapState(newMapState);
    // Emit map state changes to server for synchronization
    // Include gridType to ensure server stays in sync
    socket.emit('heist-city-map-state-change', {
      lobbyId,
      mapState: newMapState,
      gridType,
    });
  };

  // Handle character stats update
  const handleStatsUpdate = (characterId: string, updatedStats: CharacterToken['stats']) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, stats: updatedStats } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle character state update
  const handleStateUpdate = (characterId: string, newState: CharacterState) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char => {
      if (char.id === characterId) {
        const updated = { ...char, state: newState };
        // If state is Unconscious, also set exhausted to true
        if (newState === 'Unconscious') {
          updated.exhausted = true;
        }
        return updated;
      }
      return char;
    });

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle equipment update
  const handleEquipmentUpdate = (characterId: string, equipment: string[]) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, equipment } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle action update
  const handleActionUpdate = (characterId: string, actions: string[]) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, actions } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle character victory points update
  const handleVictoryPointsUpdate = (characterId: string, victoryPoints: number) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, victoryPoints } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle character experience update
  const handleExperienceUpdate = (characterId: string, experience: number) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, experience } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle dice roll
  const handleDiceRoll = (dice1: number, dice2: number, total: number) => {
    const rollData = { dice1, dice2, total, roller: playerId };
    setLastDiceRoll(rollData);
    socket.emit('heist-city-dice-roll', { lobbyId, ...rollData });
  };

  // Handle exhaust toggle
  const handleExhaustToggle = (characterId: string) => {
    if (!mapState) return;

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, exhausted: !char.exhausted } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

  // Handle selection change
  const handleSelectionChange = (characterId: string | null) => {
    const updatedSelections = characterId
      ? [
          // Remove current player's old selection
          ...playerSelections.filter(sel => sel.playerId !== playerId),
          // Add new selection
          {
            playerId,
            characterId,
            playerNumber: currentPlayerNumber,
          },
        ]
      : // Remove current player's selection
        playerSelections.filter(sel => sel.playerId !== playerId);

    setPlayerSelections(updatedSelections);
    socket.emit('heist-city-selection-change', { lobbyId, selections: updatedSelections });
  };

  // Handle ruler update
  const handleRulerUpdate = (start: Position | null, end: Position | null) => {
    const rulerData = {
      start,
      end,
      playerId: start && end ? playerId : null,
    };
    setRulerState(rulerData);
    socket.emit('heist-city-ruler-update', { lobbyId, ...rulerData });
  };

  // Handle map loading
  const handleLoadMap = (mapId: string) => {
    if (!gameState) return;

    // Get player IDs
    const player1Id = gameState.players?.[0]?.id || 'player-1';
    const player2Id = gameState.players?.[1]?.id || 'player-2';

    // Load new map with starting positions
    const loadedMap = loadMap(mapId, player1Id, player2Id);

    // Preserve equipment on characters but reset VP
    if (mapState) {
      loadedMap.characters = loadedMap.characters.map(newChar => {
        const oldChar = mapState.characters.find(c =>
          c.playerId === newChar.playerId && c.role === newChar.role
        );
        return {
          ...newChar,
          equipment: oldChar?.equipment || [],
          actions: oldChar?.actions || [],
          victoryPoints: 0, // Reset VP on new map
        };
      });
    } else {
      // Reset VP for all characters
      loadedMap.characters = loadedMap.characters.map(char => ({
        ...char,
        victoryPoints: 0,
      }));
    }

    // Reset game state
    setTurnNumber(1);
    setPlayerSelections([]); // Clear all selections

    // Update map state and grid type
    setMapState(loadedMap);
    setGridType(loadedMap.gridType);

    // Emit to server
    socket.emit('heist-city-map-load', {
      lobbyId,
      mapId,
      mapState: loadedMap,
      gridType: loadedMap.gridType,
      turnNumber: 1,
      blueVictoryPoints: 0,
      redVictoryPoints: 0,
    });
  };

  // Handle pass turn
  const handlePassTurn = () => {
    if (!mapState) return;

    // Unexhaust all characters except unconscious ones, and reset actions
    const updatedCharacters = mapState.characters.map(char => ({
      ...char,
      exhausted: char.state === 'Unconscious' ? true : false, // Keep unconscious characters exhausted
      actions: [], // Reset all selected actions for the new turn
    }));

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    // Increment turn
    const newTurn = turnNumber + 1;
    setTurnNumber(newTurn);

    // Update map state and emit to server
    handleMapStateChange(newMapState);
    socket.emit('heist-city-game-info-update', {
      lobbyId,
      turnNumber: newTurn,
      blueVictoryPoints,
      redVictoryPoints,
    });
  };

  // Loadout management handlers
  const handleSaveLoadout = (playerNumber: 1 | 2) => {
    if (!mapState || !loadoutName.trim()) return;

    const teamCharacters = mapState.characters.filter(char => char.playerNumber === playerNumber);
    const loadout = createLoadoutFromCharacters(loadoutName.trim(), teamCharacters);
    saveLoadout(loadout);
    setSavedLoadouts(getSavedLoadouts());
    setLoadoutName('');
    setShowLoadoutModal(null);
  };

  const handleLoadLoadout = (loadout: EquipmentLoadout, playerNumber: 1 | 2) => {
    if (!mapState) return;

    const teamCharacters = mapState.characters.filter(char => char.playerNumber === playerNumber);
    const updatedTeamCharacters = applyLoadoutToCharacters(loadout, teamCharacters);

    const updatedCharacters = mapState.characters.map(char => {
      if (char.playerNumber === playerNumber) {
        const updated = updatedTeamCharacters.find(tc => tc.role === char.role);
        return updated || char;
      }
      return char;
    });

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
    setShowLoadoutModal(null);
  };

  const handleDeleteLoadout = (name: string) => {
    deleteLoadout(name);
    setSavedLoadouts(getSavedLoadouts());
  };

  const handleExportLoadout = (playerNumber: 1 | 2, method: 'download' | 'clipboard') => {
    if (!mapState) return;

    const teamCharacters = mapState.characters.filter(char => char.playerNumber === playerNumber);
    const loadout = createLoadoutFromCharacters(
      loadoutName.trim() || `${playerNumber === 1 ? 'Blue' : 'Red'} Team Loadout`,
      teamCharacters
    );

    if (method === 'download') {
      downloadLoadoutAsFile(loadout);
    } else {
      copyLoadoutToClipboard(loadout);
    }
    setLoadoutName('');
    setShowLoadoutModal(null);
  };

  const handleImportLoadout = (playerNumber: 1 | 2) => {
    const loadout = importLoadoutFromJson(importJson);
    if (loadout) {
      handleLoadLoadout(loadout, playerNumber);
      setImportJson('');
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>, playerNumber: 1 | 2) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const loadout = importLoadoutFromJson(content);
      if (loadout) {
        handleLoadLoadout(loadout, playerNumber);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Game save management handlers
  const handleSaveGame = () => {
    if (!mapState || !gameSaveName.trim()) return;

    const savedGame = createSavedGameState(
      gameSaveName.trim(),
      mapState,
      gridType,
      turnNumber,
      alertModifier
    );
    const result = saveGameState(savedGame);
    if (result.success) {
      setSavedGames(getSavedGames());
      setGameSaveName('');
      setShowGameSaveModal(null);
    } else {
      alert(`Failed to save game: ${result.error}`);
    }
  };

  const handleLoadGame = (savedGame: SavedGameState) => {
    setMapState(savedGame.mapState);
    setGridType(savedGame.gridType);
    setTurnNumber(savedGame.turnNumber);
    setAlertModifier(savedGame.alertModifier);
    setPlayerSelections([]); // Clear selections

    // Emit to server to sync with other players
    handleMapStateChange(savedGame.mapState);
    socket.emit('heist-city-game-info-update', {
      lobbyId,
      turnNumber: savedGame.turnNumber,
      blueVictoryPoints,
      redVictoryPoints,
    });

    setShowGameSaveModal(null);
  };

  const handleDeleteGame = (name: string) => {
    deleteSavedGame(name);
    setSavedGames(getSavedGames());
  };

  const handleExportGame = (method: 'download' | 'clipboard') => {
    if (!mapState) return;

    const savedGame = createSavedGameState(
      gameSaveName.trim() || 'Heist City Game',
      mapState,
      gridType,
      turnNumber,
      alertModifier
    );

    if (method === 'download') {
      downloadGameStateAsFile(savedGame);
    } else {
      copyGameStateToClipboard(savedGame);
    }
    setGameSaveName('');
  };

  const handleGameImportJson = () => {
    const savedGame = importGameStateFromJson(gameImportJson);
    if (savedGame) {
      handleLoadGame(savedGame);
      setGameImportJson('');
    } else {
      alert('Invalid game save JSON format');
    }
  };

  const handleGameFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const savedGame = importGameStateFromJson(content);
      if (savedGame) {
        handleLoadGame(savedGame);
      } else {
        alert('Invalid game save file format');
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (gameFileInputRef.current) {
      gameFileInputRef.current.value = '';
    }
  };

  // Calculate gear points for each team
  const blueGearPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 1)
      .reduce((total, char) => {
        const equipment = getEquipmentByIds(char.equipment || []);
        const equipmentCost = equipment.reduce((sum, item) => sum + item.Cost, 0);
        return total + equipmentCost;
      }, 0);
  }, [mapState]);

  const redGearPoints = useMemo(() => {
    if (!mapState) return 0;
    return mapState.characters
      .filter(char => char.playerNumber === 2)
      .reduce((total, char) => {
        const equipment = getEquipmentByIds(char.equipment || []);
        const equipmentCost = equipment.reduce((sum, item) => sum + item.Cost, 0);
        return total + equipmentCost;
      }, 0);
  }, [mapState]);

  // Get player names
  const player1Name = useMemo(() => {
    return gameState?.players?.[0]?.name || 'Player 1';
  }, [gameState?.players]);

  const player2Name = useMemo(() => {
    return gameState?.players?.[1]?.name || 'Player 2';
  }, [gameState?.players]);

  if (!mapState) {
    return <div className="text-white">Loading Heist City...</div>;
  }

  return (
    <div className="heist-city-game p-6 bg-gray-950 min-h-screen">
      <div className="max-w-[1550px] mx-auto">
        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-4">Heist City</h1>

        {/* Game Map */}
        <GameMap
          mapState={mapState}
          onMapStateChange={handleMapStateChange}
          onSelectionChange={handleSelectionChange}
          readOnly={false}
          gridType={gridType}
          onDiceRoll={handleDiceRoll}
          lastDiceRoll={lastDiceRoll}
          logEntries={logEntries}
          playerSelections={playerSelections}
          currentPlayerId={playerId}
          currentPlayerNumber={currentPlayerNumber}
          onExhaustToggle={handleExhaustToggle}
          onActionUpdate={handleActionUpdate}
          onLoadMap={handleLoadMap}
          sharedRulerState={rulerState}
          onRulerUpdate={handleRulerUpdate}
          gameInfo={{ turnNumber, blueVictoryPoints, redVictoryPoints }}
          onGameInfoChange={(info) => {
            setTurnNumber(info.turnNumber);
            // VP is now computed from character.victoryPoints in mapState
          }}
          alertModifier={alertModifier}
          onAlertModifierChange={setAlertModifier}
          onSaveGame={() => setShowGameSaveModal('save')}
          onLoadGame={() => setShowGameSaveModal('load')}
        />

        {/* Game Info */}
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-4">Game Info</h2>
          <div className="space-y-4">
            {/* Turn Number */}
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm font-semibold">Turn Number: {turnNumber}</span>
              <button
                onClick={handlePassTurn}
                className="px-4 py-2 rounded-lg font-semibold text-white text-sm transition-all bg-green-600 hover:bg-green-700 active:scale-95"
              >
                Pass Turn
              </button>
            </div>

            {/* Blue Player Victory Points - Per Character */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-blue-400 text-sm font-semibold">{player1Name} VP:</span>
                <span className="text-blue-400 text-lg font-bold">{blueVictoryPoints}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mapState.characters
                  .filter(char => char.playerNumber === 1)
                  .map(char => (
                    <div key={char.id} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                      <span className="text-gray-300 text-xs">{char.role}:</span>
                      <input
                        type="number"
                        value={char.victoryPoints || 0}
                        onChange={(e) => handleVictoryPointsUpdate(char.id, parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Red Player Victory Points - Per Character */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-red-400 text-sm font-semibold">{player2Name} VP:</span>
                <span className="text-red-400 text-lg font-bold">{redVictoryPoints}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {mapState.characters
                  .filter(char => char.playerNumber === 2)
                  .map(char => (
                    <div key={char.id} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
                      <span className="text-gray-300 text-xs">{char.role}:</span>
                      <input
                        type="number"
                        value={char.victoryPoints || 0}
                        onChange={(e) => handleVictoryPointsUpdate(char.id, parseInt(e.target.value) || 0)}
                        className="w-12 px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* Blue Player Gear Points */}
            <div className="flex items-center justify-between">
              <span className="text-blue-400 text-sm font-semibold">{player1Name} Gear Points:</span>
              <span className="text-amber-400 text-sm font-bold">{blueGearPoints}</span>
            </div>

            {/* Red Player Gear Points */}
            <div className="flex items-center justify-between">
              <span className="text-red-400 text-sm font-semibold">{player2Name} Gear Points:</span>
              <span className="text-amber-400 text-sm font-bold">{redGearPoints}</span>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-700 my-2"></div>

            {/* Equipment Loadout Management */}
            <div className="space-y-3">
              <span className="text-gray-300 text-sm font-semibold">Equipment Loadouts</span>

              {/* Blue Team Loadout Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-blue-400 text-xs w-16">{player1Name}:</span>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'save', playerNumber: 1 })}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'load', playerNumber: 1 })}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Load
                </button>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'export', playerNumber: 1 })}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  Export
                </button>
              </div>

              {/* Red Team Loadout Buttons */}
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-xs w-16">{player2Name}:</span>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'save', playerNumber: 2 })}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'load', playerNumber: 2 })}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Load
                </button>
                <button
                  onClick={() => setShowLoadoutModal({ type: 'export', playerNumber: 2 })}
                  className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loadout Modal */}
        {showLoadoutModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4">
                {showLoadoutModal.type === 'save' && 'Save Loadout'}
                {showLoadoutModal.type === 'load' && 'Load Loadout'}
                {showLoadoutModal.type === 'export' && 'Export Loadout'}
                {' - '}
                {showLoadoutModal.playerNumber === 1 ? player1Name : player2Name}
              </h3>

              {/* Save Loadout */}
              {showLoadoutModal.type === 'save' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={loadoutName}
                    onChange={(e) => setLoadoutName(e.target.value)}
                    placeholder="Enter loadout name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveLoadout(showLoadoutModal.playerNumber)}
                      disabled={!loadoutName.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
                    >
                      Save to Browser
                    </button>
                    <button
                      onClick={() => setShowLoadoutModal(null)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Load Loadout */}
              {showLoadoutModal.type === 'load' && (
                <div className="space-y-4">
                  {/* Saved Loadouts List */}
                  <div className="space-y-2">
                    <span className="text-gray-300 text-sm">Saved Loadouts:</span>
                    {savedLoadouts.length === 0 ? (
                      <p className="text-gray-500 text-sm">No saved loadouts</p>
                    ) : (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {savedLoadouts.map((loadout) => (
                          <div key={loadout.name} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <span className="text-white text-sm">{loadout.name}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleLoadLoadout(loadout, showLoadoutModal.playerNumber)}
                                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteLoadout(loadout.name)}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Import from JSON */}
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <span className="text-gray-300 text-sm">Import from JSON:</span>
                    <textarea
                      value={importJson}
                      onChange={(e) => setImportJson(e.target.value)}
                      placeholder="Paste JSON here..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    />
                    <button
                      onClick={() => handleImportLoadout(showLoadoutModal.playerNumber)}
                      disabled={!importJson.trim()}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
                    >
                      Import from JSON
                    </button>
                  </div>

                  {/* Import from File */}
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <span className="text-gray-300 text-sm">Import from File:</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={(e) => handleFileImport(e, showLoadoutModal.playerNumber)}
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setShowLoadoutModal(null);
                      setImportJson('');
                    }}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Export Loadout */}
              {showLoadoutModal.type === 'export' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={loadoutName}
                    onChange={(e) => setLoadoutName(e.target.value)}
                    placeholder="Enter loadout name (optional)..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportLoadout(showLoadoutModal.playerNumber, 'download')}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm"
                    >
                      Download File
                    </button>
                    <button
                      onClick={() => handleExportLoadout(showLoadoutModal.playerNumber, 'clipboard')}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold text-sm"
                    >
                      Copy to Clipboard
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowLoadoutModal(null);
                      setLoadoutName('');
                    }}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Game Save Modal */}
        {showGameSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-4">
                {showGameSaveModal === 'save' ? 'Save Game' : 'Load Game'}
              </h3>

              {/* Save Game */}
              {showGameSaveModal === 'save' && (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={gameSaveName}
                    onChange={(e) => setGameSaveName(e.target.value)}
                    placeholder="Enter save name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveGame}
                      disabled={!gameSaveName.trim()}
                      className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
                    >
                      Save to Browser
                    </button>
                    <button
                      onClick={() => setShowGameSaveModal(null)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                    >
                      Cancel
                    </button>
                  </div>

                  {/* Export Options */}
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <span className="text-gray-300 text-sm">Or export current game:</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleExportGame('download')}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        Download File
                      </button>
                      <button
                        onClick={() => handleExportGame('clipboard')}
                        className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm"
                      >
                        Copy to Clipboard
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Load Game */}
              {showGameSaveModal === 'load' && (
                <div className="space-y-4">
                  {/* Saved Games List */}
                  <div className="space-y-2">
                    <span className="text-gray-300 text-sm">Saved Games ({savedGames.length}):</span>
                    {savedGames.length === 0 ? (
                      <p className="text-gray-500 text-sm">No saved games</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {savedGames.map((game) => (
                          <div key={game.name} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                            <div className="flex-1 min-w-0">
                              <span className="text-white text-sm block truncate">{game.name}</span>
                              <span className="text-gray-400 text-xs">
                                Turn {game.turnNumber} - {new Date(game.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex gap-1 ml-2">
                              <button
                                onClick={() => handleLoadGame(game)}
                                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                              >
                                Load
                              </button>
                              <button
                                onClick={() => handleDeleteGame(game.name)}
                                className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Import from JSON */}
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <span className="text-gray-300 text-sm">Import from JSON:</span>
                    <textarea
                      value={gameImportJson}
                      onChange={(e) => setGameImportJson(e.target.value)}
                      placeholder="Paste game JSON here..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                    />
                    <button
                      onClick={handleGameImportJson}
                      disabled={!gameImportJson.trim()}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded font-semibold text-sm"
                    >
                      Import from JSON
                    </button>
                  </div>

                  {/* Import from File */}
                  <div className="border-t border-gray-700 pt-4 space-y-2">
                    <span className="text-gray-300 text-sm">Import from File:</span>
                    <input
                      ref={gameFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleGameFileImport}
                      className="w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setShowGameSaveModal(null);
                      setGameImportJson('');
                    }}
                    className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Character Cards */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">Character Cards</h2>

          {/* Player 1 Characters */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3">{player1Name} (Blue)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {mapState.characters
                .filter((char) => char.playerNumber === 1)
                .map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isOwnedByPlayer={character.playerId === playerId}
                    onStatsUpdate={handleStatsUpdate}
                    onStateUpdate={handleStateUpdate}
                    onEquipmentUpdate={handleEquipmentUpdate}
                    onExperienceUpdate={handleExperienceUpdate}
                  />
                ))}
            </div>
          </div>

          {/* Player 2 Characters */}
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-3">{player2Name} (Red)</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
              {mapState.characters
                .filter((char) => char.playerNumber === 2)
                .map((character) => (
                  <CharacterCard
                    key={character.id}
                    character={character}
                    isOwnedByPlayer={character.playerId === playerId}
                    onStatsUpdate={handleStatsUpdate}
                    onStateUpdate={handleStateUpdate}
                    onEquipmentUpdate={handleEquipmentUpdate}
                    onExperienceUpdate={handleExperienceUpdate}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeistCityGame;
