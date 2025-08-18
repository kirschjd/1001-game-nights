// HenHur Game React Component
// Created: August 2025
import React from 'react';
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
}

const HenHurGame: React.FC<HenHurProps> = ({ variant = 'standard', socket, slug, playerName, isLeader }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full py-8 relative">
      <div className="w-full max-w-3xl mx-auto px-2 flex flex-col items-center">
        <RaceMat />
        <CardPool />
        <PlayerMat />
      </div>
      <PlayerHandSheet />
      <PlayerStatusDrawer />
      {/* Left drawer: variant-dependent content */}
  <LeftInfoDrawer variant={variant} socket={socket} slug={slug} playerName={playerName} isLeader={isLeader} />
    </div>
  );
};

export default HenHurGame;
