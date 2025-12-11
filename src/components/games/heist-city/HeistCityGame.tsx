import React, { useEffect, useState, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import CharacterCard from './components/CharacterCard';
import { MapState, CharacterToken, CharacterState, PlayerSelection, Position, GridType } from './types';
import { loadMap, getMapDefinition } from './data/mapLoader';
import { LogEntry } from './components/GameLog';
import { getEquipmentByIds } from './data/equipmentLoader';

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
  const [gridType, setGridType] = useState<GridType>('square');
  const [playerSelections, setPlayerSelections] = useState<PlayerSelection[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
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
  const [blueVictoryPoints, setBlueVictoryPoints] = useState<number>(0);
  const [redVictoryPoints, setRedVictoryPoints] = useState<number>(0);
  const [rulerState, setRulerState] = useState<{
    start: Position | null;
    end: Position | null;
    playerId: string | null;
  } | null>(null);
  const [alertModifier, setAlertModifier] = useState<number>(0);

  // Determine current player's number
  const currentPlayerNumber = useMemo((): 1 | 2 | 'observer' => {
    if (!gameState?.players) return 'observer';
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === 0) return 1;
    if (playerIndex === 1) return 2;
    return 'observer';
  }, [gameState?.players, playerId]);

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

        // Also restore game info if available
        if (state.gameInfo) {
          setTurnNumber(state.gameInfo.turnNumber || 1);
          setBlueVictoryPoints(state.gameInfo.blueVictoryPoints || 0);
          setRedVictoryPoints(state.gameInfo.redVictoryPoints || 0);
        }
      } else {
        // No existing state - load fresh map
        console.log('Loading fresh map');
        const mapId = state.mapId || 'bank-job';
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
          const loadedMap = loadMap('bank-job', player1Id, player2Id);
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

    // Listen for game info updates (turn, victory points)
    socket.on('heist-city-game-info-update', (data: {
      turnNumber: number;
      blueVictoryPoints: number;
      redVictoryPoints: number;
      version?: number;
    }) => {
      console.log(`Received game info update (v${data.version}):`, data);
      checkVersionAndSync(data.version);
      setTurnNumber(data.turnNumber);
      setBlueVictoryPoints(data.blueVictoryPoints);
      setRedVictoryPoints(data.redVictoryPoints);
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
      setBlueVictoryPoints(data.blueVictoryPoints);
      setRedVictoryPoints(data.redVictoryPoints);
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
          setBlueVictoryPoints(data.state.gameInfo.blueVictoryPoints || 0);
          setRedVictoryPoints(data.state.gameInfo.redVictoryPoints || 0);
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
  }, [socket, gameState, lobbyId, lastKnownVersion, isSyncing]);

  // Handle map state changes (e.g., token movement)
  const handleMapStateChange = (newMapState: MapState) => {
    setMapState(newMapState);
    // Emit map state changes to server for synchronization
    socket.emit('heist-city-map-state-change', {
      lobbyId,
      mapState: newMapState,
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

  // Handle player name change
  const handleNameChange = () => {
    if (!editedName.trim()) return;

    // Update local state
    setGameState(prev => {
      if (!prev || !prev.players) return prev;
      return {
        ...prev,
        players: prev.players.map(p =>
          p.id === playerId ? { ...p, name: editedName.trim() } : p
        ),
      };
    });

    // Emit to server
    socket.emit('heist-city-name-change', {
      lobbyId,
      playerId,
      newName: editedName.trim(),
    });

    setIsEditingName(false);
  };

  // Get current player's name
  const currentPlayerName = useMemo(() => {
    return gameState?.players?.find(p => p.id === playerId)?.name || 'Unknown';
  }, [gameState?.players, playerId]);

  // Handle map loading
  const handleLoadMap = (mapId: string) => {
    if (!gameState) return;

    // Get player IDs
    const player1Id = gameState.players?.[0]?.id || 'player-1';
    const player2Id = gameState.players?.[1]?.id || 'player-2';

    // Load new map with starting positions
    const loadedMap = loadMap(mapId, player1Id, player2Id);

    // Preserve equipment on characters
    if (mapState) {
      loadedMap.characters = loadedMap.characters.map(newChar => {
        const oldChar = mapState.characters.find(c =>
          c.playerId === newChar.playerId && c.role === newChar.role
        );
        return {
          ...newChar,
          equipment: oldChar?.equipment || [],
          actions: oldChar?.actions || [],
        };
      });
    }

    // Reset game state
    setTurnNumber(1);
    setBlueVictoryPoints(0);
    setRedVictoryPoints(0);
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
        <h1 className="text-3xl font-bold text-white mb-4">Heist City</h1>

        {/* Player List */}
        <div className="mb-6 bg-gray-800 p-3 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-400">Players:</span>
            {gameState?.players?.map((player, index) => {
              const isCurrentPlayer = player.id === playerId;
              const playerColor = index === 0 ? 'text-blue-400' : 'text-red-400';

              return (
                <div key={player.id} className="flex items-center gap-2">
                  {isCurrentPlayer && isEditingName ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleNameChange();
                          if (e.key === 'Escape') setIsEditingName(false);
                        }}
                        autoFocus
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm w-32 focus:outline-none focus:border-purple-500"
                      />
                      <button
                        onClick={handleNameChange}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingName(false)}
                        className="px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white text-xs rounded"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`font-semibold ${playerColor}`}>
                        {player.name}
                        {isCurrentPlayer && ' (You)'}
                      </span>
                      {isCurrentPlayer && (
                        <button
                          onClick={() => {
                            setEditedName(player.name);
                            setIsEditingName(true);
                          }}
                          className="text-gray-400 hover:text-white text-xs"
                          title="Edit name"
                        >
                          ✏️
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
            setBlueVictoryPoints(info.blueVictoryPoints);
            setRedVictoryPoints(info.redVictoryPoints);
          }}
          alertModifier={alertModifier}
          onAlertModifierChange={setAlertModifier}
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

            {/* Blue Player Victory Points */}
            <div className="flex items-center justify-between">
              <label htmlFor="blue-vp" className="text-blue-400 text-sm font-semibold">
                {player1Name} VP:
              </label>
              <input
                id="blue-vp"
                type="number"
                value={blueVictoryPoints}
                onChange={(e) => {
                  const newVP = parseInt(e.target.value) || 0;
                  setBlueVictoryPoints(newVP);
                  socket.emit('heist-city-game-info-update', {
                    lobbyId,
                    turnNumber,
                    blueVictoryPoints: newVP,
                    redVictoryPoints,
                  });
                }}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Red Player Victory Points */}
            <div className="flex items-center justify-between">
              <label htmlFor="red-vp" className="text-red-400 text-sm font-semibold">
                {player2Name} VP:
              </label>
              <input
                id="red-vp"
                type="number"
                value={redVictoryPoints}
                onChange={(e) => {
                  const newVP = parseInt(e.target.value) || 0;
                  setRedVictoryPoints(newVP);
                  socket.emit('heist-city-game-info-update', {
                    lobbyId,
                    turnNumber,
                    blueVictoryPoints,
                    redVictoryPoints: newVP,
                  });
                }}
                className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-red-500"
              />
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
          </div>
        </div>

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
