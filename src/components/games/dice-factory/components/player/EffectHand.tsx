// src/components/games/dice-factory/components/player/EffectHand.tsx
// Shows effects in hand with play buttons

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Effect {
  id: string;
  name: string;
  description: string;
  cost: number;
}

interface EffectHandProps {
  socket: Socket | null;
  currentPlayer: any;
  gameState: any;
  canTakeActions: () => boolean;
}

const EffectHand: React.FC<EffectHandProps> = ({ 
  socket, 
  currentPlayer, 
  gameState,
  canTakeActions
}) => {
  const [effectsInHand, setEffectsInHand] = useState<Effect[]>([]);

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
      setEffectsInHand(data.hand || []);
    };

    socket.on('player-factory-items-update', handlePlayerFactoryItems);
    return () => {
      socket.off('player-factory-items-update', handlePlayerFactoryItems);
    };
  }, [socket]);

  const handlePlayEffect = (effectId: string) => {
    if (!socket || !canTakeActions()) return;
    socket.emit('dice-factory-play-effect', { effectId });
  };

  const totalValue = effectsInHand.reduce((sum, effect) => sum + effect.cost, 0);

  return (
    <div className="bg-payne-grey/30 border border-lion/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-lion">
          🎴 Hand
        </h4>
        <div className="text-sm text-gray-400">
          Value: {totalValue}🪙
        </div>
      </div>

      {effectsInHand.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No effects in hand</p>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-lion mb-2">
            Effects ({effectsInHand.length})
          </div>
          {effectsInHand.map((effect, index) => (
            <div 
              key={`${effect.id}-${index}`}
              className="bg-lion/10 border border-lion/20 rounded p-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-lion-light">
                  {effect.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {effect.cost}🪙
                  </span>
                  {canTakeActions() && (
                    <button
                      onClick={() => handlePlayEffect(effect.id)}
                      className="bg-lion hover:bg-lion-dark text-white px-2 py-1 text-xs rounded transition-colors"
                    >
                      Play
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                {effect.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EffectHand;