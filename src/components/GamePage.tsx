// 1001 Game Nights - Game Page Component
// Version: 2.1.0 - Complete implementation with fixed navigation and enhanced features
// Updated: December 2024

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import WarGame from './games/WarGame';
import DiceFactoryGame from './games/dice-factory';

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

  // Enhanced back to lobby handler with proper cleanup
  const handleBackToLobby = useCallback(() => {
    console.log('Back to lobby clicked, slug:', slug);
    
    // Emit leave game event to clean up game state
    if (socket) {
      socket.emit('leave-game');
      socket.emit('leave-lobby'); // Also leave lobby to ensure cleanup
    }
    
    if (slug) {
      navigate(`/lobby/${slug}`);
    } else {
      console.error('No slug available for navigation');
      // Fallback to home page if no slug
      navigate('/');
    }
  }, [slug, navigate, socket]);

  // Socket setup and connection management
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
      console.log('Socket connected:', newSocket.id);
      setConnectionError(null);
    });

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
      console.error('Dice Factory error:', data.error);
    });

    newSocket.on('dice-factory-scored', (data) => {
      console.log('Dice Factory scored:', data);
    });

    // Listen for lobby updates to determine leadership
    newSocket.on('lobby-updated', (lobbyData: any) => {
      console.log('Lobby updated:', lobbyData);
      setIsLeader(lobbyData.leaderId === newSocket.id);
    });

    // Listen for game end
    newSocket.on('game-ended', (results) => {
      console.log('Game ended:', results);
    });

    // Enhanced error handling
    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'An error occurred');
    });

    // Handle disconnection
    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected the socket, try to reconnect
        newSocket.connect();
      }
    });

    // Cleanup when component unmounts
    return () => {
      console.log('Cleaning up socket connection');
      newSocket.emit('leave-game');
      newSocket.emit('leave-lobby');
      newSocket.close();
    };
  }, [slug]);

  // Join lobby once socket is ready
  useEffect(() => {
    if (socket && slug && !hasJoinedLobby && !connectionError) {
      // Try to get existing player name from sessionStorage
      let storedName = sessionStorage.getItem(`player-name-${slug}`);
      if (!storedName) {
        storedName = `Player ${Math.floor(Math.random() * 1000)}`;
        sessionStorage.setItem(`player-name-${slug}`, storedName);
      }

      console.log('Joining lobby with name:', storedName);
      socket.emit('join-lobby', { slug, playerName: storedName });
      setHasJoinedLobby(true);
    }
  }, [socket, slug, hasJoinedLobby, connectionError]);

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

  // Show loading state
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

  // Show game not found state
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
          
          {/* Debug information for development */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-6">
              <summary className="cursor-pointer text-gray-400 hover:text-white">
                Show Debug Info
              </summary>
              <div className="text-left bg-payne-grey/50 p-4 rounded mt-2 border border-payne-grey text-sm">
                <p><strong>Slug:</strong> {slug}</p>
                <p><strong>Socket ID:</strong> {socket?.id}</p>
                <p><strong>Socket Connected:</strong> {socket?.connected ? 'Yes' : 'No'}</p>
                <p><strong>Has Joined Lobby:</strong> {hasJoinedLobby ? 'Yes' : 'No'}</p>
                <p><strong>Is Leader:</strong> {isLeader ? 'Yes' : 'No'}</p>
              </div>
            </details>
          )}
        </div>
      </div>
    );
  }

  const currentPlayer = gameState.currentPlayer;
  const playerName = currentPlayer ? currentPlayer.name : 'Unknown';

  // Get game-specific colors and styling
  const gameColor = gameState.type === 'war' ? 'tea-rose' : 'uranian-blue';
  const gameColorClasses = gameState.type === 'war' 
    ? 'border-tea-rose/30 bg-tea-rose/10' 
    : 'border-uranian-blue/30 bg-uranian-blue/10';

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Header with game info and navigation */}
      <header className={`p-4 border-b ${gameColorClasses} flex items-center justify-between relative z-10`}>
        <div className="flex items-center gap-4">
          <img 
            src={`/assets/icon-${gameState.type}.jpg`} 
            alt={gameState.type}
            className={`w-10 h-10 rounded border-2 border-${gameColor}`}
            onError={(e) => {
              // Fallback if image doesn't exist
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-2xl font-bold text-lion-light">
              🎮 Playing: {gameState.type === 'war' ? 'War' : gameState.type === 'dice-factory' ? 'Dice Factory' : gameState.type}
            </h1>
            <p className="text-gray-400">Player: {playerName}</p>
          </div>
        </div>
        
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleBackToLobby}
            className="bg-payne-grey hover:bg-payne-grey-light text-white px-4 py-2 rounded-lg transition-colors border border-payne-grey-light"
          >
            ← Back to Lobby
          </button>
        </div>
      </header>

      {/* Game content */}
      <main className="relative z-10">
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

        {/* Fallback for unknown game types */}
        {gameState.type !== 'war' && gameState.type !== 'dice-factory' && (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Unknown Game Type</h2>
            <p className="text-gray-400 mb-4">Game type "{gameState.type}" is not supported.</p>
            <button
              onClick={handleBackToLobby}
              className="bg-lion hover:bg-lion-dark px-6 py-3 rounded-lg font-bold text-white transition-colors"
            >
              ← Back to Lobby
            </button>
          </div>
        )}
      </main>

      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-payne-grey/90 p-2 rounded-lg border border-payne-grey-light text-xs text-gray-400 relative z-20">
          <details>
            <summary className="cursor-pointer">Debug Info</summary>
            <div className="mt-2 space-y-1">
              <div>Game: {gameState.type}</div>
              <div>Phase: {gameState.phase}</div>
              <div>Socket: {socket?.connected ? '🟢' : '🔴'}</div>
              <div>Leader: {isLeader ? 'Yes' : 'No'}</div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default GamePage;