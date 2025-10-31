// 1001 Game Nights - Player List Component
// Version: 2.1.0 - Removed dice floor indicator per specifications
// Updated: December 2024

import React from 'react';
import { Player } from '../../types/DiceFactoryTypes';

interface PlayerListProps {
  players: Player[];
  currentPlayerId: string;
  phase: string;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerId, phase }) => {
  const otherPlayers = players.filter(p => p.id !== currentPlayerId);

  if (phase === 'complete' || otherPlayers.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xl font-semibold text-uranian-blue">Other Players</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {otherPlayers.map(player => (
          <div 
            key={player.id} 
            className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/20"
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold text-white">{player.name}</h4>
              <div className="text-sm space-x-2">
                {player.isReady && (
                  <span className="text-green-400">✓ Ready</span>
                )}
                {player.hasFled && (
                  <span className="text-red-400">🚪 Fled</span>
                )}
                {!player.isReady && !player.hasFled && (
                  <span className="text-yellow-400">⏳ Playing</span>
                )}
              </div>
            </div>
            
            <div className="text-sm text-gray-400 space-y-1">
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="text-lion font-semibold">{player.score}</span>
              </div>
              <div className="flex justify-between">
                <span>Free Pips:</span>
                <span className="text-uranian-blue">{player.freePips}</span>
              </div>
              <div className="flex justify-between">
                <span>Dice Pool:</span>
                <span className="text-purple-400">{player.dicePool.length}</span>
              </div>
              {/* REMOVED: Dice Floor indicator */}
            </div>

            {/* Dice Pool Summary */}
            <div className="mt-3 pt-2 border-t border-uranian-blue/20">
              <div className="text-xs text-gray-500 mb-1">Dice Types:</div>
              <div className="flex flex-wrap gap-1">
                {[4, 6, 8, 10, 12].map(sides => {
                  const count = player.dicePool.filter(die => die.sides === sides).length;
                  if (count === 0) return null;
                  
                  return (
                    <span 
                      key={sides} 
                      className="text-xs bg-payne-grey/70 px-2 py-1 rounded border border-uranian-blue/30"
                    >
                      {count}d{sides}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Turn Actions Indicator - REMOVED per specifications */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerList;