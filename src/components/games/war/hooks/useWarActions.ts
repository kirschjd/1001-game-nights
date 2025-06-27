// src/components/games/war/hooks/useWarActions.ts
// React hook for War game action handlers

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { BotConfig, WarVariant, BotStyle } from '../types/WarTypes';

interface UseWarActionsProps {
  socket: Socket;
  lobbySlug: string;
  isLeader: boolean;
}

interface UseWarActionsReturn {
  // Bot management
  availableBotStyles: BotStyle[];
  selectedBots: BotConfig[];
  addBot: (style: string) => void;
  removeBot: (style: string) => void;
  
  // Variant management
  availableVariants: WarVariant[];
  selectedVariant: string;
  setSelectedVariant: (variant: string) => void;
  
  // Game actions
  startEnhancedWar: (variant: string, bots: BotConfig[]) => void;
  
  // Loading states
  isLoadingVariants: boolean;
  isLoadingBotStyles: boolean;
  isStartingGame: boolean;
  
  // Error handling
  actionError: string | null;
  clearActionError: () => void;
}

export default function useWarActions({ socket, lobbySlug, isLeader }: UseWarActionsProps): UseWarActionsReturn {
  const [availableBotStyles, setAvailableBotStyles] = useState<BotStyle[]>([]);
  const [selectedBots, setSelectedBots] = useState<BotConfig[]>([]);
  const [availableVariants, setAvailableVariants] = useState<WarVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState('regular');
  
  const [isLoadingVariants, setIsLoadingVariants] = useState(true);
  const [isLoadingBotStyles, setIsLoadingBotStyles] = useState(true);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Load variants and bot styles on mount
  useEffect(() => {
    if (isLeader) {
      socket.emit('get-war-variants');
      socket.emit('get-bot-styles');
    }
  }, [socket, isLeader]);

  // Listen for variants response
  useEffect(() => {
    const handleVariants = (data: { variants: WarVariant[] }) => {
      setAvailableVariants(data.variants);
      setIsLoadingVariants(false);
    };

    const handleBotStyles = (data: { styles: BotStyle[] }) => {
      setAvailableBotStyles(data.styles);
      setIsLoadingBotStyles(false);
    };

    const handleError = (data: { message: string }) => {
      setActionError(data.message);
      setIsStartingGame(false);
    };

    socket.on('war-variants', handleVariants);
    socket.on('bot-styles', handleBotStyles);
    socket.on('error', handleError);

    return () => {
      socket.off('war-variants', handleVariants);
      socket.off('bot-styles', handleBotStyles);
      socket.off('error', handleError);
    };
  }, [socket]);

  // Add bot
  const addBot = useCallback((style: string) => {
    const existingBot = selectedBots.find(b => b.style === style);
    if (existingBot) {
      setSelectedBots(bots => 
        bots.map(b => 
          b.style === style 
            ? { ...b, count: Math.min(b.count + 1, 4) }
            : b
        )
      );
    } else {
      setSelectedBots(bots => [...bots, { style, count: 1 }]);
    }
  }, [selectedBots]);

  // Remove bot
  const removeBot = useCallback((style: string) => {
    setSelectedBots(bots => 
      bots.map(b => 
        b.style === style 
          ? { ...b, count: Math.max(b.count - 1, 0) }
          : b
      ).filter(b => b.count > 0)
    );
  }, []);

  // Start enhanced war game
  const startEnhancedWar = useCallback((variant: string) => {
    if (!isLeader) return;
    
    setIsStartingGame(true);
    setActionError(null);
    
    socket.emit('start-enhanced-war', {
      slug: lobbySlug,
      variant
      // Removed: bots parameter - use existing lobby bots only
    });
  
    // Timeout in case server doesn't respond
    setTimeout(() => {
      setIsStartingGame(false);
    }, 10000);
  }, [socket, lobbySlug, isLeader]);

  // Clear error
  const clearActionError = useCallback(() => {
    setActionError(null);
  }, []);

  return {
    // Bot management
    availableBotStyles,
    selectedBots,
    addBot,
    removeBot,
    
    // Variant management
    availableVariants,
    selectedVariant,
    setSelectedVariant,
    
    // Game actions
    startEnhancedWar,
    
    // Loading states
    isLoadingVariants,
    isLoadingBotStyles,
    isStartingGame,
    
    // Error handling
    actionError,
    clearActionError
  };
}