// 1001 Game Nights - Fixed Dice Actions Hook
// Version: 2.1.0 - Fixed undo handler and improved dice selection
// Updated: December 2024

import { useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { 
  DiceFactoryGameState, 
  ActionMode, 
  Die, 
  DiceActionHandlers,
  GameStateHelpers 
} from '../types/DiceFactoryTypes';

interface UseDiceActionsProps {
  gameState: DiceFactoryGameState;
  socket: Socket | null;
  selectedDice: string[];
  actionMode: ActionMode;
  setSelectedDice: (dice: string[]) => void;
  setActionMode: (mode: ActionMode) => void;
  showMessage: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const useDiceActions = ({
  gameState,
  socket,
  selectedDice,
  actionMode,
  setSelectedDice,
  setActionMode,
  showMessage
}: UseDiceActionsProps): DiceActionHandlers & GameStateHelpers => {

  const { currentPlayer, phase, exhaustedDice } = gameState;

  // Helper functions
  const canTakeActions = useCallback((): boolean => {
    return !!(currentPlayer && !currentPlayer.hasFled && !currentPlayer.isReady && phase === 'playing');
  }, [currentPlayer, phase]);

  const isExhausted = useCallback((dieId: string) => {
    return exhaustedDice?.includes(dieId) || false;
  }, [exhaustedDice]);

  // FIXED: Always allow selection, but provide context for action validation
  const isDieSelectable = useCallback((die: Die, currentActionMode: ActionMode): boolean => {
    if (!canTakeActions() || isExhausted(die.id) || die.value === null) return false;

    // For action-specific validation (used for styling/hints, not blocking selection)
    switch (currentActionMode) {
      case 'recruit':
        // Check for outsourcing modification - allows any die to recruit
        const hasOutsourcing = currentPlayer?.modifications?.includes('outsourcing');
        if (hasOutsourcing) {
          return true; // Any die can be selected for recruitment with outsourcing
        }
        
        // Check for diversification modification - allows d4s to recruit on 2 as well as 1
        const hasDiversification = currentPlayer?.modifications?.includes('diversification');
        const recruitTable: Record<number, number[]> = {
          4: hasDiversification ? [1, 2] : [1],
          6: [1, 2],
          8: [1, 2, 3],
          10: [1, 2, 3, 4],
          12: [1, 2, 3, 4, 5]
        };
        return recruitTable[die.sides]?.includes(die.value!);
      
      case 'promote':
        return die.value === die.sides;
      
      case 'process':
        return true; // Any die can be processed
      
      case 'freepips':
        return true; // Any die can be modified with pips (but actions require exactly 1)
      
      case 'score':
        return true; // Any die can be part of scoring combinations
      
      default:
        return true; // Allow selection for all other modes
    }
  }, [canTakeActions, isExhausted, currentPlayer?.modifications]);

  // Socket action handlers
  const handlePromoteDice = useCallback(() => {
    if (!socket || selectedDice.length === 0) return;
    
    socket.emit('dice-factory-promote', {
      diceIds: selectedDice
    });
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`Promoting ${selectedDice.length} dice`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleRecruitDice = useCallback(() => {
    if (!socket || selectedDice.length === 0) return;
    
    socket.emit('dice-factory-recruit', {
      diceIds: selectedDice
    });
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`Recruiting with ${selectedDice.length} dice`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleScoreStraight = useCallback(() => {
    if (!socket || selectedDice.length < 3) return;
    
    socket.emit('dice-factory-score-straight', {
      diceIds: selectedDice
    });
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`Scoring straight with ${selectedDice.length} dice`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleScoreSet = useCallback(() => {
    if (!socket || selectedDice.length < 4) return;
    
    socket.emit('dice-factory-score-set', {
      diceIds: selectedDice
    });
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`Scoring set with ${selectedDice.length} dice`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleScore = useCallback(() => {
    if (!socket || selectedDice.length < 3) return;
    
    // Calculate preview first to determine best scoring option
    socket.emit('dice-factory-calculate-score-preview', {
      diceIds: selectedDice
    });
    
    // Listen for the preview response and then score
    const handlePreviewResponse = (preview: any) => {
      if (preview.straight) {
        socket.emit('dice-factory-score-straight', { diceIds: selectedDice });
        showMessage(`Scoring straight with ${selectedDice.length} dice`, 'info');
      } else if (preview.set) {
        socket.emit('dice-factory-score-set', { diceIds: selectedDice });
        showMessage(`Scoring set with ${selectedDice.length} dice`, 'info');
      } else {
        showMessage('No valid scoring combination available', 'error');
      }
      
      setSelectedDice([]);
      setActionMode(null);
      socket.off('score-preview-calculated', handlePreviewResponse);
    };
    
    socket.on('score-preview-calculated', handlePreviewResponse);
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleProcessDice = useCallback((diceIds?: string[], arbitrageChoice?: 'pips' | 'points') => {
    const ids = diceIds ?? selectedDice;
    if (!socket || ids.length === 0) return;
    socket.emit('dice-factory-process', {
      diceIds: ids,
      arbitrageChoice
    });
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`Processing ${ids.length} dice for ${arbitrageChoice === 'points' ? 'points' : 'pips'}`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handlePipAction = useCallback((actionType: 'increase' | 'decrease' | 'reroll') => {
    if (!socket || selectedDice.length !== 1) return;
    
    socket.emit('dice-factory-action', {
      action: 'pip-action',
      actionType,
      diceIds: selectedDice
    });
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage(`${actionType} die`, 'info');
  }, [socket, selectedDice, setSelectedDice, setActionMode, showMessage]);

  const handleFactoryAction = useCallback((actionType: 'effect' | 'modification') => {
    if (!socket) return;
    
    socket.emit('dice-factory-action', {
      action: 'factory-action',
      actionType
    });
    
    showMessage(`Purchasing factory ${actionType}`, 'info');
  }, [socket, showMessage]);

  const handleEndTurn = useCallback((dividendChoice?: 'pips' | 'points') => {
    if (!socket) return;
    
    socket.emit('dice-factory-end-turn', dividendChoice ? { dividendChoice } : {});
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage('Ending turn...', 'info');
  }, [socket, setSelectedDice, setActionMode, showMessage]);

  // FIXED: Correct undo handler using the right socket event
  const handleUndo = useCallback(() => {
    console.log('🟠 FRONTEND: Undo button clicked'); // DEBUG
    if (!socket) {
      console.log('❌ FRONTEND: No socket available for undo'); // DEBUG
      return;
    }
    
    console.log('🟠 FRONTEND: Emitting dice-factory-undo event'); // DEBUG
    socket.emit('dice-factory-undo');
    
    setSelectedDice([]);
    setActionMode(null);
    showMessage('Undoing last action...', 'info');
  }, [socket, setSelectedDice, setActionMode, showMessage]);

  const handleFlee = useCallback(() => {
    if (!socket) return;
    
    socket.emit('dice-factory-flee');
    
    showMessage('Fleeing the factory...', 'info');
  }, [socket, showMessage]);

  const handleRerollAllDice = useCallback(() => {
    if (!socket) return;
    socket.emit('dice-factory-reroll-all');
    showMessage('Rerolling all dice...', 'info');
  }, [socket, showMessage]);

  const handleIncreaseDicePool = useCallback(() => {
    if (!socket) return;
    socket.emit('dice-factory-increase-dice-pool');
    showMessage('Increasing dice pool by 1...', 'info');
  }, [socket, showMessage]);

  return {
    // Action handlers
    handlePromoteDice,
    handleRecruitDice,
    handleScoreStraight,
    handleScoreSet,
    handleScore,
    handleProcessDice,
    handlePipAction,
    handleFactoryAction,
    handleEndTurn,
    handleUndo,
    handleFlee,
    handleRerollAllDice,
    handleIncreaseDicePool,
    // Helper functions
    canTakeActions,
    isExhausted,
    isDieSelectable,
    showMessage
  };
};