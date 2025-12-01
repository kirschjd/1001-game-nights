import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameMap } from './components';
import { MapState } from './types';
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

  if (!mapState) {
    return <div className="text-white">Loading Heist City...</div>;
  }

  return (
    <div className="heist-city-game p-6 bg-gray-950 min-h-screen">
      <div className="max-w-[920px] mx-auto">
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

        {/* Token Status */}
        <div className="mt-4 bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-bold text-white mb-2">Character Tokens</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-blue-400 mb-2">Player 1 (Blue)</h3>
              {mapState.characters
                .filter((t) => t.playerNumber === 1)
                .map((token) => (
                  <div key={token.id} className="text-sm text-gray-300 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: token.color }}
                    />
                    <span>
                      {token.name}: ({token.position.x.toFixed(1)}", {token.position.y.toFixed(1)}")
                    </span>
                  </div>
                ))}
            </div>
            <div>
              <h3 className="text-sm font-bold text-red-400 mb-2">Player 2 (Red)</h3>
              {mapState.characters
                .filter((t) => t.playerNumber === 2)
                .map((token) => (
                  <div key={token.id} className="text-sm text-gray-300 flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full border border-white"
                      style={{ backgroundColor: token.color }}
                    />
                    <span>
                      {token.name}: ({token.position.x.toFixed(1)}", {token.position.y.toFixed(1)}")
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeistCityGame;
