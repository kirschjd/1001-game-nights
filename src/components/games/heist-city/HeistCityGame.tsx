import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import CharacterCard from './components/CharacterCard';
import { MapState, CharacterToken, CharacterState } from './types';
import { loadMap } from './data/mapLoader';

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
  const [selectedObject, setSelectedObject] = useState<{
    type: 'token' | 'item';
    name: string;
    position: { x: number; y: number };
  } | null>(null);

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

      // Load map using map ID from game options
      const mapId = state.mapId || 'bank-job'; // Default to bank-job if not specified
      const players = state.players || [];

      // Get player IDs (first two players)
      const player1Id = players[0]?.id || 'player-1';
      const player2Id = players[1]?.id || 'player-2';

      // Load the map
      try {
        const initialMapState = loadMap(mapId, player1Id, player2Id);
        setMapState(initialMapState);
        setGameState(state);
      } catch (error) {
        console.error('Error loading map:', error);
        // Fallback to bank-job if map loading fails
        const initialMapState = loadMap('bank-job', player1Id, player2Id);
        setMapState(initialMapState);
      }
    });

    // Listen for map state updates from other players
    socket.on('heist-city-map-state-update', (newMapState: MapState) => {
      console.log('Received map state update from server:', newMapState);
      setMapState(newMapState);
    });

    return () => {
      socket.off('gameStateUpdate');
      socket.off('game-started');
      socket.off('heist-city-map-state-update');
    };
  }, [socket]);

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

    const updatedCharacters = mapState.characters.map(char =>
      char.id === characterId ? { ...char, state: newState } : char
    );

    const newMapState = {
      ...mapState,
      characters: updatedCharacters,
    };

    handleMapStateChange(newMapState);
  };

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
          onSelectionChange={(selection) => {
            if (selection) {
              setSelectedObject({
                type: selection.type as 'token' | 'item',
                name: selection.name,
                position: selection.position,
              });
            } else {
              setSelectedObject(null);
            }
          }}
          readOnly={false}
        />

        {/* Selection Info Panel */}
        {selectedObject && (
          <div className="mt-6 bg-purple-900/30 border border-purple-500/50 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-purple-300 mb-2">Selected</h2>
            <div className="text-gray-300 space-y-1">
              <p className="text-sm">
                <span className="font-semibold text-purple-400">Type:</span>{' '}
                {selectedObject.type === 'token' ? 'Character Token' : 'Map Item'}
              </p>
              <p className="text-sm">
                <span className="font-semibold text-purple-400">Name:</span>{' '}
                {selectedObject.name}
              </p>
              <p className="text-sm">
                <span className="font-semibold text-purple-400">Position:</span>{' '}
                ({selectedObject.position.x.toFixed(1)}", {selectedObject.position.y.toFixed(1)}")
              </p>
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="mt-6 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-2">Game Controls</h2>
          <div className="text-gray-300 space-y-2">
            <p className="text-sm">• Click and drag tokens to move them</p>
            <p className="text-sm">• Click on tokens to select/deselect them</p>
            <p className="text-sm">• Tokens snap to the grid when released</p>
            <p className="text-sm">• Map items are visible but not yet interactive</p>
          </div>
        </div>

        {/* Character Cards */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold text-white mb-4">Character Cards</h2>

          {/* Player 1 Characters */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-blue-400 mb-3">Player 1 (Blue)</h3>
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
                  />
                ))}
            </div>
          </div>

          {/* Player 2 Characters */}
          <div>
            <h3 className="text-lg font-bold text-red-400 mb-3">Player 2 (Red)</h3>
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
