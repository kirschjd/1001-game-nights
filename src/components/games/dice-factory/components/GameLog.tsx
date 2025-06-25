// 1001 Game Nights - Game Log Component
// Version: 2.0.0 - Modular refactor
// Updated: December 2024

import React, { useEffect, useRef } from 'react';
import { GameLogEntry } from '../types/DiceFactoryTypes';

interface GameLogProps {
  gameLog: GameLogEntry[];
  maxEntries?: number;
}

const GameLog: React.FC<GameLogProps> = ({ gameLog, maxEntries = 20 }) => {
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [gameLog]);

  const getEntryClassName = (actionType: string) => {
    switch (actionType) {
      case 'error':
        return 'text-red-400';
      case 'score':
        return 'text-lion';
      case 'system':
        return 'text-yellow-400';
      case 'action':
        return 'text-uranian-blue';
      default:
        return 'text-gray-300';
    }
  };

  const getEntryIcon = (actionType: string) => {
    switch (actionType) {
      case 'error':
        return '❌';
      case 'score':
        return '🎯';
      case 'system':
        return '⚙️';
      case 'action':
        return '🎲';
      default:
        return '💬';
    }
  };

  const recentEntries = gameLog.slice(-maxEntries);

  return (
    <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
      <h3 className="text-lg font-semibold mb-3 text-uranian-blue">
        📜 Game Log
        <span className="text-sm text-gray-400 ml-2">
          ({gameLog.length} entries)
        </span>
      </h3>
      
      <div 
        ref={logRef}
        className="bg-payne-grey/70 p-3 rounded max-h-64 overflow-y-auto border border-uranian-blue/20 space-y-1"
      >
        {recentEntries.length === 0 ? (
          <div className="text-gray-500 italic text-center py-4">
            No log entries yet...
          </div>
        ) : (
          recentEntries.map((entry, index) => (
            <div 
              key={index} 
              className={`text-sm flex items-start space-x-2 ${getEntryClassName(entry.actionType)}`}
            >
              <span className="text-xs mt-0.5 opacity-75">
                {getEntryIcon(entry.actionType)}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-gray-500 text-xs">
                  [{entry.timestamp}]
                </span>
                <span className="font-semibold ml-1">
                  {entry.player}:
                </span>
                <span className="ml-1 break-words">
                  {entry.message}
                </span>
                {entry.round && (
                  <span className="text-xs text-gray-500 ml-2">
                    (Round {entry.round})
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {gameLog.length > maxEntries && (
        <div className="text-xs text-gray-500 mt-2 text-center">
          Showing last {maxEntries} of {gameLog.length} entries
        </div>
      )}
    </div>
  );
};

export default GameLog;