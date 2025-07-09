// 1001 Game Nights - Game Header Component
// Version: 2.0.1 - Fixed unused variable warning
// Updated: December 2024

import React from 'react';
import { DiceFactoryGameState } from '../../types/DiceFactoryTypes';

interface GameHeaderProps {
  gameState: DiceFactoryGameState;
}

const GameHeader: React.FC<GameHeaderProps> = ({ gameState }) => {
  const { 
    turnCounter, 
    round,
    collapseStarted, 
    lastCollapseRoll, 
    phase, 
    winner,
    variant
  } = gameState;

  // Game completion message
  if (phase === 'complete' && winner) {
    return (
      <div className="bg-lion/20 border border-lion p-6 rounded-lg text-center">
        <h2 className="text-3xl font-bold text-lion mb-2">🏆 Game Complete!</h2>
        <p className="text-xl text-white">Winner: <strong>{winner}</strong></p>
      </div>
    );
  }

  // Experimental mode header
  if (variant === 'experimental') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className="text-2xl font-bold text-uranian-blue">{round} / 11</div>
            <div className="text-sm text-gray-400">Round</div>
          </div>
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-pink-400/30">
            <div className="text-2xl font-bold text-pink-400">Experimental Mode</div>
            <div className="text-sm text-gray-400">11 Rounds Max</div>
          </div>
          <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
            <div className="text-2xl font-bold text-lion">Highest Score Wins</div>
            <div className="text-sm text-gray-400">No Collapse</div>
          </div>
        </div>
        <div className="bg-pink-900/40 border border-pink-400 p-4 rounded-lg text-center">
          <span className="text-pink-300 font-semibold">Experimental mode: The game ends after 11 rounds. The player with the most points wins. The collapse system is disabled.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Game Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
          <div className="text-2xl font-bold text-uranian-blue">{turnCounter}</div>
          <div className="text-sm text-gray-400">Turn</div>
        </div>
        
        <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
          <div className={`text-2xl font-bold ${
            collapseStarted ? 'text-red-400' : 'text-green-400'
          }`}>
            {collapseStarted ? 'COLLAPSING!' : 'STABLE'}
          </div>
          <div className="text-sm text-gray-400">Factory Status</div>
        </div>
        
        <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
          <div className="text-2xl font-bold text-yellow-400">
            {lastCollapseRoll || 'None'}
          </div>
          <div className="text-sm text-gray-400">Last Roll</div>
        </div>
      </div>

      {/* Collapse Warning */}
      {collapseStarted && (
        <div className="bg-red-900/50 border border-red-400 p-4 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-red-400 text-xl">⚠️</span>
            <div>
              <h3 className="text-red-400 font-bold">Factory Collapse in Progress!</h3>
              <p className="text-white">
                The factory is collapsing! Players can choose to flee and lock in their scores,
                or risk staying for more points. Remaining players are crushed if the turn counter reaches 0.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameHeader;