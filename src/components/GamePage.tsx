// 1001 Game Nights - Game Page Component
// Version: 2.1.0 - Complete implementation with enhanced war game
// Updated: December 2024

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { EnhancedWarGame } from './games/war';
import DiceFactoryGame from './games/dice-factory';

interface WarGameState {
  type: string;
  variant: string;
  variantDisplayName: string;
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
  const handleHome = useCallback(() => {
    // Clean up socket and navigate to home
    if (socket) {
      socket.disconnect();
    }
    navigate('/');
  }, [navigate, socket]);

  // Socket setup and connection management
  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    // Enhanced connection handling
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionError('Connection lost. Please refresh the page.');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionError('Failed to connect to server. Please refresh the page.');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Auto-join lobby and retrieve game state
  useEffect(() => {
    if (socket && !hasJoinedLobby && slug) {
      const playerName = sessionStorage.getItem(`player-name-${slug}`) || `Player ${Math.floor(Math.random() * 1000)}`;
      
      console.log('GamePage: Auto-joining lobby as', playerName);
      
      socket.emit('join-lobby', { slug, playerName });
      socket.emit('request-game-state', { slug });

      // Check if this player should be the leader (first to join game page)
      const currentLeader = sessionStorage.getItem(`lobby-leader-${slug}`);
      if (!currentLeader && socket.id) {
        sessionStorage.setItem(`lobby-leader-${slug}`, socket.id);
        // Request to become leader
        setTimeout(() => {
          socket.emit('change-leader', { slug, newLeaderId: socket.id });
        }, 500);
      }

      console.log('GamePage: My socket ID is', socket.id);
      setHasJoinedLobby(true);

    }
  }, [socket, hasJoinedLobby, slug]);

  // GamePage.tsx - Updated game state management useEffect (CORRECTED VERSION)
  useEffect(() => {
  if (!socket) return;

  // Enhanced game state handling
  const handleGameStarted = (gameData: GameState) => {
    console.log('Game started:', gameData);
    setGameState(gameData);
    setLoading(false);
  };

  const handleGameStateUpdated = (gameData: GameState) => {
    console.log('Game state updated:', gameData);
    setGameState(gameData);
    setLoading(false);
  };

  const handleLobbyUpdated = (lobbyData: any) => {
    console.log('Lobby updated:', lobbyData);
    console.log('My socket ID:', socket.id);
    console.log('Lobby leader ID:', lobbyData.leaderId);
    console.log('Am I leader?', socket.id === lobbyData.leaderId);
    setIsLeader(socket.id === lobbyData.leaderId);
    
    // Simple check - if we have lobby but no game after reasonable time, it means no game is running
    // We'll handle this with a separate useEffect to avoid multiple timeouts
  };

  // NEW: Handle explicit "no game running" response
  const handleNoGameRunning = () => {
    console.log('GamePage: Server confirmed no game is running');
    setLoading(false);
    navigate(`/lobby/${slug}`);
  };

  // Error handling
  const handleError = (error: { message: string }) => {
    console.error('Game error:', error);
    setConnectionError(error.message);
    setLoading(false);
  };

  const handleWarError = (error: { error: string }) => {
    console.error('War game error:', error);
    setConnectionError(error.error);
  };

  const handleDiceFactoryError = (error: { error: string }) => {
    console.error('Dice Factory error:', error);
    setConnectionError(error.error);
  };

  // Register event listeners
  socket.on('game-started', handleGameStarted);
  socket.on('game-state-updated', handleGameStateUpdated);
  socket.on('lobby-updated', handleLobbyUpdated);
  socket.on('no-game-running', handleNoGameRunning);
  socket.on('error', handleError);
  socket.on('war-error', handleWarError);
  socket.on('dice-factory-error', handleDiceFactoryError);

  return () => {
    socket.off('game-started', handleGameStarted);
    socket.off('game-state-updated', handleGameStateUpdated);
    socket.off('lobby-updated', handleLobbyUpdated);
    socket.off('no-game-running', handleNoGameRunning);
    socket.off('error', handleError);
    socket.off('war-error', handleWarError);
    socket.off('dice-factory-error', handleDiceFactoryError);
  };
  }, [socket, navigate, slug]);

// SEPARATE useEffect to handle the "no game" timeout - this prevents multiple timeouts
useEffect(() => {
  if (!loading || gameState || !hasJoinedLobby) {
    return; // Don't set timeout if not loading, already have game state, or haven't joined yet
  }

  console.log('GamePage: Setting timeout to check for game state...');
  
  const noGameTimeout = setTimeout(() => {
    if (loading && !gameState) {
      console.log('GamePage: No game state received after timeout - redirecting to lobby');
      navigate(`/lobby/${slug}`);
    }
  }, 4000); // Give 4 seconds for game state to arrive

  return () => {
    console.log('GamePage: Clearing no-game timeout');
    clearTimeout(noGameTimeout);
  };
}, [loading, gameState, hasJoinedLobby, navigate, slug]);

  // Get player name for display
  const getPlayerName = () => {
    if (!slug) return 'Unknown Player';
    return sessionStorage.getItem(`player-name-${slug}`) || 'Unknown Player';
  };

  const playerName = getPlayerName();

  // Loading state
  if (loading || !gameState) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-4">🎮</div>
          <div className="text-xl mb-2">Loading Game...</div>
          {connectionError && (
            <div className="text-red-400 text-sm">{connectionError}</div>
          )}
        </div>
      </div>
    );
  }

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
              🎮 Playing: {gameState.type === 'war' ? 
                (gameState as WarGameState).variantDisplayName || 'War' : 
                gameState.type === 'dice-factory' ? 'Dice Factory' : 
                gameState.type}
            </h1>
            <p className="text-gray-400">Player: {playerName}</p>
          </div>
        </div>
        
        {/* Navigation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleHome}
            className="bg-payne-grey hover:bg-payne-grey-light text-white px-4 py-2 rounded-lg transition-colors border border-payne-grey-light"
          >
            ← Home
          </button>
        </div>
      </header>

      {/* Game content */}
      <main className="relative z-10">
        {gameState.type === 'war' && (
          <EnhancedWarGame 
            gameState={gameState as WarGameState} 
            socket={socket!} 
            isLeader={isLeader} 
          />
        )}
        
        {gameState.type === 'dice-factory' && (
          <DiceFactoryGame 
            gameState={gameState as DiceFactoryGameState} 
            socket={socket!} 
            isLeader={isLeader} 
          />
        )}

        {/* Fallback for unknown game types */}
        {gameState.type !== 'war' && gameState.type !== 'dice-factory' && (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Unknown Game Type</h2>
            <p className="text-gray-400 mb-4">Game type "{gameState.type}" is not supported.</p>
            <button
              onClick={handleHome}
              className="bg-lion hover:bg-lion-dark px-6 py-3 rounded-lg font-bold text-white transition-colors"
            >
              ← Home
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
              {gameState.type === 'war' && (gameState as WarGameState).variant && (
                <div>Variant: {(gameState as WarGameState).variant}</div>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
};

export default GamePage;