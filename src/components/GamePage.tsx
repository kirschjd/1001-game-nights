import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import WarGame from './games/WarGame';
import DiceFactoryGame from './games/DiceFactoryGame';

interface WarGameState {
  type: string;
  phase: 'dealing' | 'playing' | 'revealing' | 'complete';
  round: number;
  winner: string | null;
  players: any[];
  roundResults: {
    message: string;
    winner: string | null;
    highCard: number | null;
  } | null;
  currentPlayer?: any;
}

interface DiceFactoryGameState {
  type: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete';
  round: number;
  turnCounter: number;
  currentPlayerIndex: number;
  collapseStarted: boolean;
  collapseDice: number[];
  activeEffects: any[];
  winner: string | null;
  players: any[];
  currentPlayer?: any;
}

type GameState = WarGameState | DiceFactoryGameState;

const GamePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    // Listen for game state updates
    newSocket.on('game-started', (state: GameState) => {
      console.log('Game started:', state);
      setGameState(state);
      setLoading(false);
    });

    newSocket.on('game-state-updated', (state: GameState) => {
      console.log('Game state updated:', state);
      setGameState(state);
      setLoading(false);
    });

    // Listen for dice factory specific events
    newSocket.on('dice-factory-error', (data) => {
      alert(`Error: ${data.error}`);
    });

    newSocket.on('dice-factory-scored', (data) => {
      alert(`Scored ${data.type} for ${data.points} points!`);
    });

    // Listen for lobby updates to determine leadership
    newSocket.on('lobby-updated', (lobbyData: any) => {
      setIsLeader(lobbyData.leaderId === newSocket.id);
      console.log('Lobby updated, isLeader:', lobbyData.leaderId === newSocket.id);
    });

    // Listen for game end
    newSocket.on('game-ended', (results) => {
      console.log('Game ended:', results);
    });

    return () => {
      newSocket.close();
      return;
    };
  }, [slug]);

  useEffect(() => {
    // Only join lobby once when socket is ready
    if (socket && slug && !hasJoinedLobby) {
      // Try to get existing player name from when they were in the lobby
      let storedName = sessionStorage.getItem(`player-name-${slug}`);
      if (!storedName) {
        storedName = `Player ${Math.floor(Math.random() * 1000)}`;
        sessionStorage.setItem(`player-name-${slug}`, storedName);
      }

      console.log('Joining lobby as:', storedName);
      socket.emit('join-lobby', { slug, playerName: storedName });
      setHasJoinedLobby(true);
    }
  }, [socket, slug, hasJoinedLobby]);

  const handleBackToLobby = () => {
    navigate(`/lobby/${slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">🎮 Game Not Found</h1>
          <p className="text-xl mb-8">The game session could not be loaded.</p>
          <p className="text-gray-400 mb-4">
            Try going back to the lobby and starting the game again.
          </p>
          <button
            onClick={handleBackToLobby}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.currentPlayer;
  const playerName = currentPlayer ? currentPlayer.name : 'Unknown';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            🎮 Playing: {gameState.type === 'war' ? 'War' : gameState.type === 'dice-factory' ? 'Dice Factory' : gameState.type}
          </h1>
          <p className="text-gray-300">
            {gameState.type === 'war' && `Round ${gameState.round}`}
            {gameState.type === 'dice-factory' && `Round ${gameState.round} | Phase: ${gameState.phase}`}
          </p>
          <p className="text-sm text-gray-400">Playing as: {playerName}</p>
          {currentPlayer && (
            <p className="text-xs text-gray-500">
              Player ID: {currentPlayer.id} | Socket ID: {socket?.id}
            </p>
          )}
        </div>
        <button
          onClick={handleBackToLobby}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Lobby
        </button>
      </header>

      {/* Game Content */}
      <div className="p-6">
        {gameState.type === 'war' && (
          <WarGame 
            gameState={gameState as WarGameState} 
            socket={socket} 
            isLeader={isLeader}
          />
        )}
        
        {gameState.type === 'dice-factory' && (
          <DiceFactoryGame 
            gameState={gameState as DiceFactoryGameState} 
            socket={socket} 
            isLeader={isLeader}
          />
        )}

        {/* Debug info - remove this once working */}
        {gameState.type !== 'war' && gameState.type !== 'dice-factory' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Unknown Game Type: {gameState.type}</h2>
            <pre className="text-left bg-gray-800 p-4 rounded">
              {JSON.stringify(gameState, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;