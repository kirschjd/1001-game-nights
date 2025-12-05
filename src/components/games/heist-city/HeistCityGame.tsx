import React, { useEffect, useState, useMemo } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import CharacterCard from './components/CharacterCard';
import { MapState, CharacterToken, CharacterState, PlayerSelection, Position } from './types';
import { loadMap } from './data/mapLoader';
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
  const [playerSelections, setPlayerSelections] = useState<PlayerSelection[]>([]);
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

  // Determine current player's number
  const currentPlayerNumber = useMemo((): 1 | 2 | 'observer' => {
    if (!gameState?.players) return 'observer';
    const playerIndex = gameState.players.findIndex(p => p.id === playerId);
    if (playerIndex === 0) return 1;
    if (playerIndex === 1) return 2;
    return 'observer';
  }, [gameState?.players, playerId]);

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
          const initialMapState = loadMap(mapId, player1Id, player2Id);
          setMapState(initialMapState);
        } catch (error) {
          console.error('Error loading map:', error);
          // Fallback to bank-job if map loading fails
          const initialMapState = loadMap('bank-job', player1Id, player2Id);
          setMapState(initialMapState);
        }
      }

      setGameState(state);
    });

    // Listen for map state updates from other players
    socket.on('heist-city-map-state-update', (newMapState: MapState) => {
      console.log('Received map state update from server:', newMapState);
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
    }) => {
      console.log('Received game info update:', data);
      setTurnNumber(data.turnNumber);
      setBlueVictoryPoints(data.blueVictoryPoints);
      setRedVictoryPoints(data.redVictoryPoints);
    });

    // Listen for player selection updates
    socket.on('heist-city-selection-update', (selections: PlayerSelection[]) => {
      console.log('Received selection update:', selections);
      setPlayerSelections(selections);
    });

    // Listen for map load events
    socket.on('heist-city-map-loaded', (data: {
      mapState: MapState;
      turnNumber: number;
      blueVictoryPoints: number;
      redVictoryPoints: number;
    }) => {
      console.log('Received map load event:', data);
      setMapState(data.mapState);
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

    return () => {
      socket.off('gameStateUpdate');
      socket.off('game-started');
      socket.off('heist-city-map-state-update');
      socket.off('heist-city-dice-roll');
      socket.off('heist-city-game-info-update');
      socket.off('heist-city-selection-update');
      socket.off('heist-city-map-loaded');
      socket.off('heist-city-ruler-update');
    };
  }, [socket, gameState]);

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

  // Handle map loading
  const handleLoadMap = (mapId: string) => {
    if (!gameState) return;

    // Get player IDs
    const player1Id = gameState.players?.[0]?.id || 'player-1';
    const player2Id = gameState.players?.[1]?.id || 'player-2';

    // Load new map with starting positions
    const newMapState = loadMap(mapId, player1Id, player2Id);

    // Preserve equipment on characters
    if (mapState) {
      newMapState.characters = newMapState.characters.map(newChar => {
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

    // Update map state
    setMapState(newMapState);

    // Emit to server
    socket.emit('heist-city-map-load', {
      lobbyId,
      mapId,
      mapState: newMapState,
      turnNumber: 1,
      blueVictoryPoints: 0,
      redVictoryPoints: 0,
    });
  };

  // Handle pass turn
  const handlePassTurn = () => {
    if (!mapState) return;

    // Unexhaust all characters except unconscious ones
    const updatedCharacters = mapState.characters.map(char => ({
      ...char,
      exhausted: char.state === 'Unconscious' ? true : false, // Keep unconscious characters exhausted
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
        <h1 className="text-3xl font-bold text-white mb-6">Heist City</h1>

        {/* Game Map */}
        <GameMap
          mapState={mapState}
          onMapStateChange={handleMapStateChange}
          onSelectionChange={handleSelectionChange}
          readOnly={false}
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
