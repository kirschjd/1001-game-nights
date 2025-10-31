// src/components/games/dice-factory/components/player/OwnedModifications.tsx
// Shows permanent modifications owned by the player

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface Modification {
  id: string;
  name: string;
  description: string;
  cost: number;
  stackable: boolean;
}

interface OwnedModificationsProps {
  socket: Socket | null;
  currentPlayer: any;
  gameState: any;
}

const OwnedModifications: React.FC<OwnedModificationsProps> = ({ 
  socket, 
  currentPlayer, 
  gameState
}) => {
  const [modifications, setModifications] = useState<Modification[]>([]);

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
      setModifications(data.modifications || []);
    };


    socket.on('player-factory-items-update', handlePlayerFactoryItems);
    return () => {
      socket.off('player-factory-items-update', handlePlayerFactoryItems);
    };
  }, [socket]);

  return (
    <div className="bg-payne-grey/30 border border-uranian-blue/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-md font-semibold text-uranian-blue">
          🏭 Factory Items Owned
        </h4>
      </div>

      {modifications.length === 0 ? (
        <p className="text-gray-400 text-sm italic">No modifications owned</p>
      ) : (
        <div className="space-y-2">
          <div className="text-sm text-uranian-blue mb-2">
            🔧 Modifications ({modifications.length})
          </div>
          {modifications.map((mod, index) => (
            <div 
              key={`${mod.id}-${index}`}
              className="bg-uranian-blue/10 border border-uranian-blue/20 rounded p-2"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-uranian-blue-light">
                  {mod.name}
                </span>
              </div>
              <p className="text-sm text-gray-300 mt-1">
                {mod.description}
              </p>
              {mod.stackable && (
                <span className="text-xs text-uranian-blue bg-uranian-blue/20 px-2 py-1 rounded mt-1 inline-block">
                  Stackable
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnedModifications;