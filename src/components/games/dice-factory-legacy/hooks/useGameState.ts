// 1001 Game Nights - Enhanced Game State Hook
// Version: 2.1.0 - Always allow dice selection, enhanced action handling
// Updated: December 2024

import { useState, useCallback } from 'react';
import { ActionMode, MessageType } from '../types/DiceFactoryTypes';

interface UseGameStateReturn {
  selectedDice: string[];
  actionMode: ActionMode;
  message: string;
  messageType: MessageType;
  setSelectedDice: (dice: string[]) => void;
  showMessage: (text: string, type?: MessageType) => void;
  toggleDiceSelection: (dieId: string) => void;
  toggleActionMode: (mode: ActionMode) => void;
  clearSelection: () => void;
}

export const useGameState = (): UseGameStateReturn => {
  const [selectedDice, setSelectedDice] = useState<string[]>([]);
  const [actionMode, setActionMode] = useState<ActionMode>(null);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<MessageType>('info');

  const showMessage = useCallback((text: string, type: MessageType = 'info') => {
    setMessage(text);
    setMessageType(type);
    
    // Auto-clear message after 5 seconds
    setTimeout(() => {
      setMessage('');
    }, 5000);
  }, []);

  // Enhanced dice selection - always allow selection regardless of action mode
  const toggleDiceSelection = useCallback((dieId: string) => {
    setSelectedDice(prev => {
      if (prev.includes(dieId)) {
        return prev.filter(id => id !== dieId);
      } else {
        return [...prev, dieId];
      }
    });
  }, []);

  // Enhanced action mode toggle with validation
  const toggleActionMode = useCallback((mode: ActionMode) => {
    if (mode === actionMode) {
      // Deactivating current mode
      setActionMode(null);
    } else {
      // Activating new mode
      setActionMode(mode);
      
      // For recruit/promote modes, if dice are selected but invalid, clear selection
      if (mode === 'recruit' || mode === 'promote') {
        // This validation will be handled in the component level
        // since we need access to game state and helpers
      }
    }
  }, [actionMode]);

  const clearSelection = useCallback(() => {
    setSelectedDice([]);
  }, []);

  return {
    selectedDice,
    actionMode,
    message,
    messageType,
    setSelectedDice,
    showMessage,
    toggleDiceSelection,
    toggleActionMode,
    clearSelection
  };
};