// 1001 Game Nights - Game Page Component
// Version: 1.2.0 - Enhanced error handling and navigation fixes
// Updated: December 2024

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

interface GameLogEntry {
  timestamp: string;
  player: string;
  message: string;
  actionType: 'info' | 'action' | 'score' | 'system' | 'error';
  round: number;
}

interface DiceFactoryGameState {
  type: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete';
  round: number;
  turnCounter: number;
  collapseStarted: boolean;
  collapseDice: number[];
  activeEffects: any[];
  winner: string | null;
  lastCollapseRoll: string | null;
  gameLog: GameLogEntry[];
  allPlayersReady: boolean;
  players: any[];
  currentPlayer?: any;
  exhaustedDice?: string[];
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
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    // Connection error handling
    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError('Failed to connect to game server');
      setLoading(false);
    });

    newSocket.on('connect', () => {
      setConnectionError(null);
    });

    // Listen for game state updates
    newSocket.on('game-started', (state: GameState) => {
      setGameState(state);
      setLoading(false);
    });

    newSocket.on('game-state-updated', (state: GameState) => {
      setGameState(state);
      setLoading(false);
    });

    // Listen for dice factory specific events
    newSocket.on('dice-factory-error', (data) => {
      console.error('Dice Factory error:', data.error);
    });

    newSocket.on('dice-factory-scored', (data) => {
      console.log('Dice Factory scored:', data);
    });

    // Listen for lobby updates to determine leadership
    newSocket.on('lobby-updated', (lobbyData: any) => {
      setIsLeader(lobbyData.leaderId === newSocket.id);
    });

    // Listen for game end
    newSocket.on('game-ended', (results) => {
      console.log('Game ended:', results);
    });

    // Error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'An error occurred');
    });

    return () => {
      newSocket.close();
    };
  }, [slug]);

  useEffect(() => {
    // Only join lobby once when socket is ready
    if (socket && slug && !hasJoinedLobby && !connectionError) {
      // Try to get existing player name from when they were in the lobby
      let storedName = sessionStorage.getItem(`player-name-${slug}`);
      if (!storedName) {
        storedName = `Player ${Math.floor(Math.random() * 1000)}`;
        sessionStorage.setItem(`player-name-${slug}`, storedName);
      }

      socket.emit('join-lobby', { slug, playerName: storedName });
      setHasJoinedLobby(true);
    }
  }, [socket, slug, hasJoinedLobby, connectionError]);

  const handleBackToLobby = () => {
    if (slug) {
      navigate(`/lobby/${slug}`);
    } else {
      console.error('No slug available for navigation');
      navigate('/');
    }
  };

  // Show connection error
  if (connectionError) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center relative">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 text-lion">⚠️ Connection Error</h1>
          <p className="text-xl mb-8 text-red-400">{connectionError}</p>
          <div className="space-y-4">
            <button
              onClick={() => window.location.reload()}
              className="bg-lion hover:bg-lion-dark text-white font-bold py-3 px-6 rounded-lg mr-4 transition-colors"
            >
              🔄 Retry Connection
            </button>
            <button
              onClick={handleBackToLobby}
              className="bg-payne-grey hover:bg-payne-grey-light text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ← Back to Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center relative">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
        
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lion mx-auto mb-4"></div>
          <p className="text-xl text-lion-light">Loading game...</p>
          <p className="text-sm text-gray-400 mt-2">
            Connecting to lobby: {slug}
          </p>
          <button
            onClick={handleBackToLobby}
            className="mt-4 bg-payne-grey hover:bg-payne-grey-light text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center relative">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.08'%3E%3Ccircle cx='8' cy='8' r='1'/%3E%3Ccircle cx='72' cy='72' r='1'/%3E%3Ccircle cx='24' cy='24' r='1'/%3E%3Ccircle cx='56' cy='56' r='1'/%3E%3Ccircle cx='40' cy='8' r='1'/%3E%3Ccircle cx='8' cy='40' r='1'/%3E%3Ccircle cx='72' cy='40' r='1'/%3E%3Ccircle cx='40' cy='72' r='1'/%3E%3Ccircle cx='16' cy='56' r='1'/%3E%3Ccircle cx='64' cy='24' r='1'/%3E%3Ccircle cx='32' cy='48' r='1'/%3E%3Ccircle cx='48' cy='32' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        
        <div className="text-center relative z-10">
          <h1 className="text-4xl font-bold mb-4 text-lion">🎮 Game Not Found</h1>
          <p className="text-xl mb-8">The game session could not be loaded.</p>
          <p className="text-gray-400 mb-4">
            This could happen if:
          </p>
          <ul className="text-gray-400 mb-6 text-left inline-block">
            <li>• The game hasn't been started yet</li>
            <li>• You were disconnected during play</li>
            <li>• The lobby was closed</li>
          </ul>
          <div className="space-y-4">
            <button
              onClick={handleBackToLobby}
              className="bg-lion hover:bg-lion-dark text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              ← Back to Lobby
            </button>
            <br />
            <button
              onClick={() => navigate('/')}
              className="bg-payne-grey hover:bg-payne-grey-light text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🏠 Home Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.currentPlayer;
  const playerName = currentPlayer ? currentPlayer.name : 'Unknown';

  // Get game-specific colors
  const gameColor = gameState.type === 'war' ? 'tea-rose' : 'uranian-blue';
  const gameColorClasses = gameState.type === 'war' 
    ? 'border-tea-rose/30 bg-tea-rose/10' 
    : 'border-uranian-blue/30 bg-uranian-blue/10';

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header */}
      <header className={`p-4 border-b ${gameColorClasses} flex items-center justify-between relative z-10`}>
        <div className="flex items-center gap-4">
          <img 
            src={`/assets/icon-${gameState.type}.jpg`} 
            alt={gameState.type}
            className={`w-10 h-10 rounded border-2 border-${gameColor}`}
          />
          <div>
            <h1 className="text-2xl font-bold text-lion-light">
              🎮 Playing: {gameState.type === 'war' ? 'War' : gameState.type === 'dice-factory' ? 'Dice Factory' : gameState.type}
            </h1>
            <p className="text-gray-300">
              {gameState.type === 'war' && `Round ${gameState.round}`}
              {gameState.type === 'dice-factory' && (
                <>
                  Round {gameState.round} | Phase: {gameState.phase}
                  {'allPlayersReady' in gameState && gameState.allPlayersReady && (
                    <span className="text-green-400 ml-2">(All Ready)</span>
                  )}
                </>
              )}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <span className={`text-${gameColor}`}>Playing as: {playerName}</span>
              <span className="text-gray-500">ID: {currentPlayer?.id.slice(0, 8)}...</span>
              <span className="text-gray-500">Lobby: {slug}</span>
            </div>
          </div>
        </div>
        <div className="space-x-3">
          <button
            onClick={handleBackToLobby}
            className="bg-payne-grey hover:bg-payne-grey-light px-4 py-2 rounded-lg transition-colors font-semibold text-white border border-payne-grey-light"
          >
            ← Back to Lobby
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-lion hover:bg-lion-dark px-4 py-2 rounded-lg transition-colors text-white"
          >
            🏠 Home
          </button>
        </div>
      </header>

      {/* Game Content */}
      <div className="p-6 relative z-10">
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

        {/* Debug info for unknown game types */}
        {gameState.type !== 'war' && gameState.type !== 'dice-factory' && (
          <div className="text-center">
            <div className="bg-payne-grey/30 rounded-lg p-8 border border-lion/30">
              <h2 className="text-2xl font-bold mb-4 text-lion">Unknown Game Type: {gameState.type}</h2>
              <p className="text-gray-400 mb-4">
                This game type is not recognized. Please try starting a new game.
              </p>
              <button
                onClick={handleBackToLobby}
                className="bg-lion hover:bg-lion-dark px-6 py-3 rounded-lg font-bold text-white transition-colors"
              >
                ← Back to Lobby
              </button>
              <details className="mt-6">
                <summary className="cursor-pointer text-gray-400 hover:text-white">
                  Show Debug Info
                </summary>
                <pre className="text-left bg-payne-grey/50 p-4 rounded mt-2 overflow-auto max-h-64 border border-payne-grey">
                  {JSON.stringify(gameState, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamePage;