// 1001 Game Nights - Game Page Component
// Version: 2.2.0 - Centralized socket management with auto-reconnect
// Updated: December 2024

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import { EnhancedWarGame } from './games/war';
import { DiceFactoryGame as DiceFactoryGameV015 } from './games/dice-factory-v0.1.5';
import { DiceFactoryGame as DiceFactoryGameV021 } from './games/dice-factory-v0.2.1';
import HenHurGame from './games/henhur';
import KillTeamDraftGame from './games/kill-team-draft/KillTeamDraftGame';
import HeistCityGame from './games/heist-city';
import { GameHeader } from './shared';
import {
  SOCKET_EVENTS,
  WAR_EVENTS,
  DICE_FACTORY_EVENTS,
} from '../constants';

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  isBot?: boolean;
  botStyle?: string;
}

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
  version?: string;
  phase: 'rolling' | 'playing' | 'revealing' | 'complete' | string;
  round: number;
  maxRounds?: number;
  turnCounter?: number;
  collapseStarted?: boolean;
  collapseDice?: number[];
  activeEffects?: any[];
  winner: string | null;
  lastCollapseRoll?: string | null;
  gameLog: GameLogEntry[];
  allPlayersReady?: boolean;
  players: any[];
  currentPlayer?: any;
  exhaustedDice?: string[];
}

type GameState = WarGameState | DiceFactoryGameState;

const GamePage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { socket, isConnected, rejoinLobby } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);
  const [hasJoinedLobby, setHasJoinedLobby] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>([]);
  const [leaderId, setLeaderId] = useState<string>('');
  const hasInitializedRef = useRef(false);

  // Navigate to home (socket is now shared, so we don't disconnect)
  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  // Handle player name change
  const handleNameChange = useCallback((newName: string) => {
    if (socket && slug) {
      socket.emit(SOCKET_EVENTS.UPDATE_PLAYER_NAME, { slug, newName });
      localStorage.setItem(`player-name-${slug}`, newName);
    }
  }, [socket, slug]);

  // Handle leader transfer
  const handleTransferLeadership = useCallback((newLeaderId: string) => {
    if (socket && slug) {
      socket.emit(SOCKET_EVENTS.CHANGE_LEADER, { slug, newLeaderId });
    }
  }, [socket, slug]);

  // Connection error handling (socket is managed by context)
  useEffect(() => {
    if (!isConnected && hasJoinedLobby) {
      // Only show error if we were connected and lost connection
      // The ConnectionStatus component handles the UI, but we track for game-specific display
      setConnectionError('Connection lost. Attempting to reconnect...');
    } else if (isConnected) {
      setConnectionError(null);
    }
  }, [isConnected, hasJoinedLobby]);

  // Auto-join lobby and retrieve game state
  useEffect(() => {
    if (socket && isConnected && !hasInitializedRef.current && slug) {
      hasInitializedRef.current = true;

      // Try to get existing name for this lobby, or create new one
      let playerName = localStorage.getItem(`player-name-${slug}`);
      const hadStoredName = !!playerName;

      if (!playerName) {
        playerName = `Player ${Math.floor(Math.random() * 1000)}`;
        // Store the name for future reconnections
        localStorage.setItem(`player-name-${slug}`, playerName);
      }

      console.log('GamePage: Auto-joining lobby as', playerName, hadStoredName ? '(from localStorage)' : '(newly generated)');
      console.log('GamePage: localStorage key:', `player-name-${slug}`);

      socket.emit(SOCKET_EVENTS.JOIN_LOBBY, { slug, playerName });
      socket.emit(SOCKET_EVENTS.REQUEST_GAME_STATE, { slug });

      // Check if this player should be the leader (first to join game page)
      const currentLeader = localStorage.getItem(`lobby-leader-${slug}`);
      if (!currentLeader && socket.id) {
        localStorage.setItem(`lobby-leader-${slug}`, socket.id);
        // Request to become leader
        setTimeout(() => {
          socket.emit(SOCKET_EVENTS.CHANGE_LEADER, { slug, newLeaderId: socket.id });
        }, 500);
      }

      console.log('GamePage: My socket ID is', socket.id);
      setHasJoinedLobby(true);
    }
  }, [socket, isConnected, slug]);

  // Handle reconnection - rejoin lobby when connection is restored
  useEffect(() => {
    if (isConnected && hasJoinedLobby && slug) {
      // Tell context to rejoin this lobby if we reconnect
      rejoinLobby(slug);
    }
  }, [isConnected, hasJoinedLobby, slug, rejoinLobby]);

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
    setLobbyPlayers(lobbyData.players || []);
    setLeaderId(lobbyData.leaderId || '');
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
  socket.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
  socket.on(SOCKET_EVENTS.GAME_STATE_UPDATED, handleGameStateUpdated);
  socket.on(SOCKET_EVENTS.LOBBY_UPDATED, handleLobbyUpdated);
  socket.on(SOCKET_EVENTS.NO_GAME_RUNNING, handleNoGameRunning);
  socket.on(SOCKET_EVENTS.ERROR, handleError);
  socket.on(WAR_EVENTS.WAR_ERROR, handleWarError);
  socket.on(DICE_FACTORY_EVENTS.ERROR, handleDiceFactoryError);

  return () => {
    socket.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socket.off(SOCKET_EVENTS.GAME_STATE_UPDATED, handleGameStateUpdated);
    socket.off(SOCKET_EVENTS.LOBBY_UPDATED, handleLobbyUpdated);
    socket.off(SOCKET_EVENTS.NO_GAME_RUNNING, handleNoGameRunning);
    socket.off(SOCKET_EVENTS.ERROR, handleError);
    socket.off(WAR_EVENTS.WAR_ERROR, handleWarError);
    socket.off(DICE_FACTORY_EVENTS.ERROR, handleDiceFactoryError);
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
    return localStorage.getItem(`player-name-${slug}`) || 'Unknown Player';
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

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header with player list and navigation */}
      <GameHeader
        gameType={gameState.type}
        gameTitle={
          gameState.type === 'war'
            ? (gameState as WarGameState).variantDisplayName || 'War'
            : gameState.type === 'dice-factory'
            ? 'Dice Factory'
            : gameState.type === 'heist-city'
            ? 'Heist City'
            : gameState.type === 'henhur'
            ? 'HenHur'
            : gameState.type === 'kill-team-draft'
            ? 'Kill Team Draft'
            : gameState.type
        }
        players={lobbyPlayers}
        currentPlayerId={socket?.id || ''}
        leaderId={leaderId}
        isLeader={isLeader}
        onNameChange={handleNameChange}
        onTransferLeadership={handleTransferLeadership}
        onHome={handleHome}
      />

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
          <>
            {(gameState as any).version === 'v0.2.1' ? (
              <DiceFactoryGameV021
                gameState={gameState as any}
                socket={socket!}
                isLeader={isLeader}
              />
            ) : (
              <DiceFactoryGameV015
                gameState={gameState as any}
                socket={socket!}
                isLeader={isLeader}
              />
            )}
          </>
        )}

        {gameState.type === 'henhur' && slug && (
          <HenHurGame
            variant={(gameState as any).variant || 'standard'}
            socket={socket}
            slug={slug}
            playerName={playerName}
            isLeader={isLeader}
            gameState={gameState}
          />
        )}

        {gameState.type === 'kill-team-draft' && (
          <KillTeamDraftGame
            socket={socket!}
            slug={slug!}
            isLeader={isLeader}
          />
        )}

        {gameState.type === 'heist-city' && slug && socket && (
          <HeistCityGame
            socket={socket}
            lobbyId={slug}
            playerId={socket.id || ''}
          />
        )}

        {/* Fallback for unknown game types */}
        {gameState.type !== 'war' && gameState.type !== 'dice-factory' && gameState.type !== 'henhur' && gameState.type !== 'kill-team-draft' && gameState.type !== 'heist-city' && (
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