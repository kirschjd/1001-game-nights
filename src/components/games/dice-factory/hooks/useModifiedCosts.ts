// 1001 Game Nights - Modified Costs Hook
// Version: 1.0.0 - Manages modified pip costs based on player modifications
// Updated: December 2024

import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface ModifiedCosts {
  increase: number;
  decrease: number;
  reroll: number;
}

interface UseModifiedCostsProps {
  socket: Socket | null;
  currentPlayer: any; // Player object from game state
}

export const useModifiedCosts = ({ socket, currentPlayer }: UseModifiedCostsProps) => {
  const [costs, setCosts] = useState<ModifiedCosts>({
    increase: 4, // Default costs
    decrease: 3,
    reroll: 2
  });

  const fetchModifiedCosts = useCallback(() => {
    if (!socket) return;
    
    socket.emit('dice-factory-get-modified-costs');
  }, [socket]);

  useEffect(() => {
    // Fetch costs when component mounts or player changes
    fetchModifiedCosts();
  }, [fetchModifiedCosts, currentPlayer?.modifications]);

  useEffect(() => {
    if (!socket) return;

    const handleModifiedCostsUpdate = (updatedCosts: ModifiedCosts) => {
      console.log('💰 Received modified costs:', updatedCosts);
      setCosts(updatedCosts);
    };

    socket.on('modified-costs-update', handleModifiedCostsUpdate);

    return () => {
      socket.off('modified-costs-update', handleModifiedCostsUpdate);
    };
  }, [socket]);

  return {
    costs,
    fetchModifiedCosts
  };
}; 