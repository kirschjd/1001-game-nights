// src/components/games/war/hooks/useWarGame.ts
// React hook for War game state management

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { WarGameState, WarPlayer, GameAction } from '../types/WarTypes';

interface UseWarGameProps {
  socket: Socket;
  gameState: WarGameState;
  isLeader: boolean;
}

interface UseWarGameReturn {
  // State
  selectedAction: GameAction | null;
  gameError: string | null;
  isProcessingAction: boolean;
  
  // Actions
  handlePlayerAction: (action: GameAction) => void;
  handleNextRound: () => void;
  clearError: () => void;
  
  // Computed properties
  canAct: boolean;
  currentPlayer: WarPlayer | null;
  isGameComplete: boolean;
  canStartNextRound: boolean;
}

export default function useWarGame({ socket, gameState, isLeader }: UseWarGameProps): UseWarGameReturn {
  const [selectedAction, setSelectedAction] = useState<GameAction | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Reset selected action when game state changes
  useEffect(() => {
    if (gameState.phase !== 'playing') {
      setSelectedAction(null);
      setIsProcessingAction(false);
    }
  }, [gameState.phase, gameState.round]);

  // Listen for game errors
  useEffect(() => {
    const handleWarError = (data: { error: string }) => {
      setGameError(data.error);
      setIsProcessingAction(false);
      setSelectedAction(null);
    };

    socket.on('war-error', handleWarError);
    
    return () => {
      socket.off('war-error', handleWarError);
    };
  }, [socket]);

  // Computed properties
  const currentPlayer = gameState.currentPlayer || null;
  const canAct = gameState.phase === 'playing' && 
                 currentPlayer && 
                 !currentPlayer.action && 
                 !isProcessingAction;
  const isGameComplete = gameState.phase === 'complete';
  const canStartNextRound = isLeader && 
                           gameState.phase === 'revealing' && 
                           !gameState.winner;

  // Handle player action
  const handlePlayerAction = useCallback((action: GameAction) => {
    if (!canAct) return;

    setSelectedAction(action);
    setIsProcessingAction(true);
    setGameError(null);

    socket.emit('enhanced-war-action', { action });

    // Timeout in case server doesn't respond
    setTimeout(() => {
      setIsProcessingAction(false);
    }, 5000);
  }, [socket, canAct]);

  // Handle next round
  const handleNextRound = useCallback(() => {
    if (!canStartNextRound) return;

    setGameError(null);
    socket.emit('enhanced-war-next-round');
  }, [socket, canStartNextRound]);

  // Clear error
  const clearError = useCallback(() => {
    setGameError(null);
  }, []);

  return {
    // State
    selectedAction,
    gameError,
    isProcessingAction,
    
    // Actions
    handlePlayerAction,
    handleNextRound,
    clearError,
    
    // Computed properties
    canAct: !!canAct,
    currentPlayer,
    isGameComplete,
    canStartNextRound: !!canStartNextRound
  };
}