// Custom hook for HenHur game state and socket communication

import { useState, useEffect, useCallback } from 'react';
import { HenHurPlayerView, TokenType } from '../types/game.types';

interface UseHenHurGameOptions {
  socket: any;
  slug: string;
  initialState?: HenHurPlayerView;
}

export function useHenHurGame({ socket, slug, initialState }: UseHenHurGameOptions) {
  const [gameState, setGameState] = useState<HenHurPlayerView | null>(initialState || null);
  const [error, setError] = useState<string | null>(null);

  // Listen for game state updates
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: HenHurPlayerView) => {
      console.log('🎮 HenHur game started:', data);
      setGameState(data);
      setError(null);
    };

    const handleGameState = (data: HenHurPlayerView) => {
      console.log('📡 HenHur game state update:', data);
      setGameState(data);
      setError(null);
    };

    const handleError = (data: { message: string }) => {
      console.error('❌ HenHur error:', data.message);
      setError(data.message);

      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    };

    socket.on('game-started', handleGameStarted);
    socket.on('henhur:game-state', handleGameState);
    socket.on('error', handleError);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('henhur:game-state', handleGameState);
      socket.off('error', handleError);
    };
  }, [socket]);

  // Request current state
  const requestState = useCallback(() => {
    if (!socket || !slug) return;

    console.log('🔄 Requesting game state...');
    socket.emit('henhur:request-state', { slug });
  }, [socket, slug]);

  // Select card for race turn
  const selectRaceCard = useCallback((cardId: string, willBurn: boolean, tokensToUse: TokenType[]) => {
    if (!socket || !slug) return;

    console.log('🏎️  Selecting race card:', { cardId, willBurn, tokensToUse });
    socket.emit('henhur:select-race-card', {
      slug,
      cardId,
      willBurn,
      tokensToUse
    });
  }, [socket, slug]);

  // Select card for auction turn
  const selectAuctionCard = useCallback((cardId: string, willBurn: boolean, tokensToUse: TokenType[]) => {
    if (!socket || !slug) return;

    console.log('🎪 Selecting auction bid:', { cardId, willBurn, tokensToUse });
    socket.emit('henhur:select-auction-card', {
      slug,
      cardId,
      willBurn,
      tokensToUse
    });
  }, [socket, slug]);

  // Draft card during auction
  const draftCard = useCallback((cardId: string) => {
    if (!socket || !slug) return;

    console.log('📦 Drafting card:', cardId);
    socket.emit('henhur:draft-card', {
      slug,
      cardId
    });
  }, [socket, slug]);

  // Debug: Give tokens
  const debugGiveTokens = useCallback((tokenType: TokenType, count: number) => {
    if (!socket || !slug) return;

    console.log('🐞 Debug: Give tokens:', { tokenType, count });
    socket.emit('henhur:debug-give-tokens', {
      slug,
      tokenType,
      count
    });
  }, [socket, slug]);

  // Debug: Set position
  const debugSetPosition = useCallback((space: number, lap: number) => {
    if (!socket || !slug) return;

    console.log('🐞 Debug: Set position:', { space, lap });
    socket.emit('henhur:debug-set-position', {
      slug,
      space,
      lap
    });
  }, [socket, slug]);

  // Debug: Draw cards
  const debugDrawCards = useCallback((count: number) => {
    if (!socket || !slug) return;

    console.log('🐞 Debug: Draw cards:', count);
    socket.emit('henhur:debug-draw-cards', {
      slug,
      count
    });
  }, [socket, slug]);

  return {
    gameState,
    error,
    actions: {
      requestState,
      selectRaceCard,
      selectAuctionCard,
      draftCard,
      debugGiveTokens,
      debugSetPosition,
      debugDrawCards
    }
  };
}
