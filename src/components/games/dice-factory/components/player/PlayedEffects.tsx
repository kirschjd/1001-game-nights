// src/components/games/dice-factory/components/player/PlayedEffects.tsx
// Shows active played effects near the dice pool

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface PlayedEffect {
  id: string;
  name: string;
  description: string;
  cost: number;
}

interface PlayedEffectsProps {
  socket: Socket | null;
  currentPlayer: any;
  gameState: any;
}

const PlayedEffects: React.FC<PlayedEffectsProps> = ({ 
  socket, 
  currentPlayer, 
  gameState
}) => {
  const [playedEffects, setPlayedEffects] = useState<PlayedEffect[]>([]);

  useEffect(() => {
    if (socket && currentPlayer?.id) {
      socket.emit('dice-factory-get-player-factory-items', { 
        playerId: currentPlayer.id 
      });
    }
  }, [socket, currentPlayer?.id, gameState?.round]);

  useEffect(() => {
    if (!socket) return;

    const handlePlayerFactoryItems = (data: any) => {
      setPlayedEffects(data.effects || []);
    };

    socket.on('player-factory-items-update', handlePlayerFactoryItems);
    return () => {
      socket.off('player-factory-items-update', handlePlayerFactoryItems);
    };
  }, [socket]);

  if (playedEffects.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-uranian-blue/20">
      <div className="text-sm font-medium text-gray-300 mb-2">
        ✨ Active Effects ({playedEffects.length})
      </div>
      <div className="space-y-1">
        {playedEffects.map((effect, index) => (
          <div 
            key={`${effect.id}-${index}`}
            className="bg-gray-600/20 border border-gray-500/20 rounded p-2 text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-300">
                {effect.name}
              </span>
              <span className="text-xs text-gray-500">
                Active
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {effect.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayedEffects;