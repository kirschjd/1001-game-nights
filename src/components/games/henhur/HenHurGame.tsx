// HenHur Game React Component
// Created: August 2025
import React, { useState, useEffect } from 'react';
import RaceMat from './components/RaceMat';
import CardPool from './components/CardPool';
import PlayerMat from './components/PlayerMat';
import PlayerHandSheet from './components/PlayerHandSheet';
import PlayerStatusDrawer from './components/PlayerStatusDrawer';
import LeftInfoDrawer from './components/LeftInfoDrawer';

interface HenHurProps {
  variant?: 'standard' | 'debug';
  socket?: any;
  slug?: string;
  playerName?: string;
  isLeader?: boolean;
  gameState?: any;
}

interface GameState {
  myDeck?: {
    hand: any[];
    deckCount: number;
    discardCount: number;
    stats: {
      deckCount: number;
      handCount: number;
      discardCount: number;
      totalCount: number;
    };
  };
  otherDecks?: Record<string, {
    handCount: number;
    deckCount: number;
    discardCount: number;
  }>;
}

const HenHurGame: React.FC<HenHurProps> = ({ variant = 'standard', socket, slug, playerName, isLeader, gameState: initialGameState }) => {
  const [gameState, setGameState] = useState<GameState>(initialGameState || {});

  // Update state when initialGameState prop changes
  useEffect(() => {
    if (initialGameState) {
      console.log('HenHur: Received initial game state', initialGameState);
      console.log('HenHur: myDeck data:', initialGameState.myDeck);
      setGameState(initialGameState);
    }
  }, [initialGameState]);

  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data: any) => {
      console.log('HenHur: Game started event', data);
      setGameState(data);
    };

    const handleGameUpdated = (data: any) => {
      console.log('HenHur: Game updated event', data);
      setGameState(data);
    };

    socket.on('game-started', handleGameStarted);
    socket.on('game-state-updated', handleGameUpdated);

    return () => {
      socket.off('game-started', handleGameStarted);
      socket.off('game-state-updated', handleGameUpdated);
    };
  }, [socket]);

  return (
    <div className="flex flex-col items-center justify-center w-full py-8 pb-40 relative">
      <div className="w-full max-w-3xl mx-auto px-2 flex flex-col items-center">
        <RaceMat />
        <CardPool />
        <PlayerMat deckInfo={gameState.myDeck} />
      </div>
      <PlayerHandSheet hand={gameState.myDeck?.hand || []} />
      <PlayerStatusDrawer />
      {/* Left drawer: variant-dependent content */}
  <LeftInfoDrawer variant={variant} socket={socket} slug={slug} playerName={playerName} isLeader={isLeader} />
    </div>
  );
};

export default HenHurGame;
