import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface GameState {
  type: string;
  phase: string;
  round: number;
  players: any[];
  [key: string]: any;
}

const GamePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    // Listen for game state updates
    newSocket.on('game-state-updated', (state: GameState) => {
      setGameState(state);
      setLoading(false);
    });

    // Listen for game end
    newSocket.on('game-ended', (results) => {
      console.log('Game ended:', results);
      // Could show results modal here
    });

    return () => {
      newSocket.close();
      return;
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🎮 Playing: {gameState.type}</h1>
          <p className="text-gray-300">Round {gameState.round} • Phase: {gameState.phase}</p>
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
        {gameState.type === 'war' && <WarGame gameState={gameState} socket={socket} />}
        {gameState.type === 'dice-factory' && <DiceFactoryGame gameState={gameState} socket={socket} />}
      </div>
    </div>
  );
};

// War Game Component (Placeholder)
const WarGame: React.FC<{ gameState: GameState; socket: Socket | null }> = ({ gameState, socket }) => {
  return (
    <div className="text-center">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">🎴 War Game</h2>
        <p className="text-gray-300 mb-6">
          War game implementation coming soon! This will feature:
        </p>
        <ul className="text-left text-gray-300 space-y-2 mb-8">
          <li>• Individual card displays for each player</li>
          <li>• Play/Fold decision buttons</li>
          <li>• Live score tracking</li>
          <li>• Round-by-round gameplay</li>
        </ul>
        <div className="bg-blue-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Current Game State:</strong> {JSON.stringify(gameState, null, 2)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Dice Factory Game Component (Placeholder)
const DiceFactoryGame: React.FC<{ gameState: GameState; socket: Socket | null }> = ({ gameState, socket }) => {
  return (
    <div className="text-center">
      <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">🎲 Dice Factory</h2>
        <p className="text-gray-300 mb-6">
          Dice Factory implementation coming soon! This will feature:
        </p>
        <ul className="text-left text-gray-300 space-y-2 mb-8">
          <li>• Individual dice pools for each player</li>
          <li>• Dice promotion and recruitment systems</li>
          <li>• Trick scoring (straights and sets)</li>
          <li>• Factory collapse mechanics</li>
          <li>• Real-time turn synchronization</li>
        </ul>
        <div className="bg-purple-900 p-4 rounded-lg">
          <p className="text-sm">
            <strong>Current Game State:</strong> {JSON.stringify(gameState, null, 2)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GamePage;