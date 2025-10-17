// Game Phase Indicator - Shows current turn, round, phase

import React from 'react';
import { GamePhase, TurnType } from '../types/game.types';

interface GamePhaseIndicatorProps {
  roundNumber: number;
  turnNumber: number;
  turnType: TurnType;
  phase: GamePhase;
  readyCount: number;
  totalPlayers: number;
}

const GamePhaseIndicator: React.FC<GamePhaseIndicatorProps> = ({
  roundNumber,
  turnNumber,
  turnType,
  phase,
  readyCount,
  totalPlayers
}) => {
  const getTurnTypeColor = () => {
    return turnType === 'race' ? 'bg-blue-600' : 'bg-purple-600';
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'waiting':
        return 'Waiting to start...';
      case 'race_selection':
        return 'Select your card and tokens';
      case 'race_reveal':
        return 'Cards revealed! Resolving...';
      case 'race_resolution':
        return 'Executing cards...';
      case 'auction_selection':
        return 'Select your bid card';
      case 'auction_reveal':
        return 'Bids revealed! Determining order...';
      case 'auction_drafting':
        return 'Drafting cards';
      case 'game_over':
        return 'Game Over!';
      default:
        return 'Playing...';
    }
  };

  const getPhaseIcon = () => {
    switch (phase) {
      case 'race_selection':
      case 'auction_selection':
        return '🎯';
      case 'race_reveal':
      case 'auction_reveal':
        return '👁️';
      case 'race_resolution':
        return '⚡';
      case 'auction_drafting':
        return '📦';
      case 'game_over':
        return '🏆';
      default:
        return '🎮';
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-4 mb-4">
      <div className="bg-gray-800 rounded-lg shadow-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          {/* Left: Turn info */}
          <div className="flex items-center space-x-4">
            <div className="text-gray-400 text-sm">
              <div className="font-semibold">Round {roundNumber}</div>
              <div>Turn {turnNumber}/8</div>
            </div>

            <div className={`px-4 py-2 rounded-lg ${getTurnTypeColor()} text-white font-bold uppercase text-sm`}>
              {turnType === 'race' ? '🏎️  Race' : '🎪 Auction'}
            </div>
          </div>

          {/* Center: Phase */}
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getPhaseIcon()}</span>
            <span className="text-white font-medium">{getPhaseText()}</span>
          </div>

          {/* Right: Ready count */}
          {(phase === 'race_selection' || phase === 'auction_selection') && (
            <div className="text-right">
              <div className="text-gray-400 text-sm">Ready</div>
              <div className="text-white font-bold">
                {readyCount}/{totalPlayers}
              </div>
              {readyCount < totalPlayers && (
                <div className="text-yellow-400 text-xs animate-pulse">
                  Waiting...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePhaseIndicator;
