// 1001 Game Nights - Active Factory Modifications Component
// Version: 2.1.0 - Implemented bidding interface for modifications
// Updated: December 2024

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface ModificationCard {
  id: string;
  modification: {
    id: string;
    name: string;
    description: string;
    cost: number;
    stackable: boolean;
  };
  bids: Array<{
    playerId: string;
    playerName: string;
    amount: number;
  }>;
  winner: string | null;
}

interface DeckStatus {
  cardsRemaining: number;
  totalCards: number;
}

interface ActiveFactoryModificationsProps {
  socket: Socket | null;
  currentPlayer: any;
  gameState: any;
}

const ActiveFactoryModifications: React.FC<ActiveFactoryModificationsProps> = ({ 
  socket, 
  currentPlayer, 
  gameState 
}) => {
  const [currentTurnModifications, setCurrentTurnModifications] = useState<ModificationCard[]>([]);
  const [deckStatus, setDeckStatus] = useState<DeckStatus>({ cardsRemaining: 44, totalCards: 44 });
  const [bidAmounts, setBidAmounts] = useState<Record<string, number>>({});
  const [showBidModal, setShowBidModal] = useState<string | null>(null);
  const [pendingBid, setPendingBid] = useState<number>(0);

  // Request current turn modifications when component mounts or game state changes
  useEffect(() => {
    if (socket && gameState?.type === 'dice-factory') {
      socket.emit('dice-factory-get-turn-modifications');
    }
  }, [socket, gameState?.round]);

  // Listen for turn modifications updates
  useEffect(() => {
    if (!socket) return;

    const handleTurnModificationsUpdate = (data: { modifications: ModificationCard[], deckStatus: DeckStatus }) => {
      setCurrentTurnModifications(data.modifications);
      setDeckStatus(data.deckStatus);
    };

    const handleModificationBidPlaced = (data: { playerId: string, modificationId: string }) => {
      // Update UI to show that someone bid on this modification
      setCurrentTurnModifications(prev => 
        prev.map(mod => {
          if (mod.id === data.modificationId) {
            // Don't show the actual bid amount, just indicate a bid was placed
            return {
              ...mod,
              bids: [...mod.bids.filter(bid => bid.playerId !== data.playerId), {
                playerId: data.playerId,
                playerName: 'Hidden Bid',
                amount: 0 // Hidden during bidding
              }]
            };
          }
          return mod;
        })
      );
    };

    socket.on('turn-modifications-update', handleTurnModificationsUpdate);
    socket.on('modification-bid-placed', handleModificationBidPlaced);

    return () => {
      socket.off('turn-modifications-update', handleTurnModificationsUpdate);
      socket.off('modification-bid-placed', handleModificationBidPlaced);
    };
  }, [socket]);

  const canTakeActions = () => {
    return currentPlayer && 
           !currentPlayer.hasFled && 
           !currentPlayer.isReady && 
           gameState?.phase === 'playing';
  };

  const handlePlaceBid = (modificationId: string) => {
    setShowBidModal(modificationId);
    setPendingBid(0);
  };

  const submitBid = () => {
    if (!socket || !showBidModal || pendingBid < 0) return;

    socket.emit('dice-factory-bid-modification', {
      modificationId: showBidModal,
      bidAmount: pendingBid
    });

    setBidAmounts(prev => ({
      ...prev,
      [showBidModal]: pendingBid
    }));

    setShowBidModal(null);
    setPendingBid(0);
  };

  const handleBuyRandom = () => {
    if (!socket || !canTakeActions()) return;

    if (currentPlayer.freePips < 9) {
      alert('Not enough pips to buy random modification (need 9 pips)');
      return;
    }

    if (deckStatus.cardsRemaining === 0) {
      alert('Modification deck is empty');
      return;
    }

    socket.emit('dice-factory-buy-random-modification');
  };

  const getPlayerBid = (modificationId: string) => {
    return bidAmounts[modificationId] || null;
  };

  const hasOtherBids = (modificationId: string) => {
    const mod = currentTurnModifications.find(m => m.id === modificationId);
    if (!mod) return false;
    
    return mod.bids.some(bid => bid.playerId !== currentPlayer?.id);
  };

  const getModificationCost = (baseCost: number) => {
    // Apply Market Manipulation discount
    const hasMarketManipulation = currentPlayer?.modifications?.includes('market_manipulation');
    return hasMarketManipulation ? Math.max(0, baseCost - 4) : baseCost;
  };

  if (currentTurnModifications.length === 0) {
    return (
      <div className="bg-payne-grey/50 p-4 rounded-lg border border-lion/30">
        <h3 className="text-lg font-semibold mb-3 text-lion">
          🔧 Factory Modifications - This Turn
        </h3>
        <div className="text-sm text-gray-400 italic">
          Loading modifications for this turn...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-payne-grey/50 p-4 rounded-lg border border-lion/30">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-lion">
            🔧 Factory Modifications - This Turn
          </h3>
          <div className="text-sm text-gray-400">
            Deck: {deckStatus.cardsRemaining}/{deckStatus.totalCards} cards
          </div>
        </div>
        
        {/* Current Turn Modifications */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {currentTurnModifications.map((modCard) => {
            const playerBid = getPlayerBid(modCard.id);
            const otherBids = hasOtherBids(modCard.id);
            const actualCost = getModificationCost(modCard.modification.cost);
            
            return (
              <div 
                key={modCard.id} 
                className="bg-payne-grey/70 p-4 rounded border border-lion/20 hover:border-lion/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-lion">{modCard.modification.name}</div>
                  <div className="text-xs px-2 py-1 rounded bg-lion/20 text-lion">
                    Base: {modCard.modification.cost} pips
                  </div>
                </div>
                
                <div className="text-sm text-gray-300 mb-3 min-h-[3rem]">
                  {modCard.modification.description}
                </div>
                
                {/* Bidding Status */}
                <div className="mb-3">
                  {playerBid !== null ? (
                    <div className="text-xs bg-uranian-blue/20 text-uranian-blue px-2 py-1 rounded">
                      Your bid: {playerBid} pips
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      No bid placed
                    </div>
                  )}
                  
                  {otherBids && (
                    <div className="text-xs text-yellow-400 mt-1">
                      ⚠️ Other players have bid
                    </div>
                  )}
                </div>
                
                {/* Action Button */}
                {canTakeActions() ? (
                  <button
                    onClick={() => handlePlaceBid(modCard.id)}
                    disabled={currentPlayer.freePips < actualCost}
                    className="w-full text-xs bg-lion hover:bg-lion-light disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded text-white transition-colors"
                  >
                    {playerBid !== null ? 'Change Bid' : 'Place Bid'}
                  </button>
                ) : (
                  <div className="text-xs text-gray-500 text-center py-2">
                    Bidding closed
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Buy Random from Deck */}
        <div className="border-t border-lion/20 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-semibold text-lion mb-1">Buy Random from Deck</h4>
              <p className="text-sm text-gray-400">
                Purchase a random modification (9 pips{getModificationCost(9) !== 9 ? ` → ${getModificationCost(9)} pips` : ''})
              </p>
            </div>
            {canTakeActions() ? (
              <button
                onClick={handleBuyRandom}
                disabled={currentPlayer.freePips < getModificationCost(9) || deckStatus.cardsRemaining === 0}
                className="bg-lion hover:bg-lion-light disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-white transition-colors"
              >
                Buy Random
              </button>
            ) : (
              <div className="text-sm text-gray-500">
                {deckStatus.cardsRemaining === 0 ? 'Deck Empty' : 'Action Unavailable'}
              </div>
            )}
          </div>
        </div>

        {/* Bidding Instructions */}
        <div className="mt-4 text-xs text-gray-400 bg-payne-grey/30 p-3 rounded">
          <h5 className="font-semibold mb-1">Bidding Rules:</h5>
          <ul className="space-y-1">
            <li>• Bid any amount of pips on available modifications</li>
            <li>• If only you bid on a card, you get it automatically</li>
            <li>• Multiple bidders trigger a blind auction at turn end</li>
            <li>• Tied auction bids result in card being discarded</li>
            <li>• Auction losers get their pips refunded</li>
          </ul>
        </div>
      </div>

      {/* Bid Modal */}
      {showBidModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-lion">
            <h2 className="text-xl font-bold mb-4 text-lion">Place Bid</h2>
            
            <div className="mb-4">
              <div className="font-semibold text-white mb-2">
                {currentTurnModifications.find(m => m.id === showBidModal)?.modification.name}
              </div>
              <div className="text-sm text-gray-400 mb-4">
                {currentTurnModifications.find(m => m.id === showBidModal)?.modification.description}
              </div>
              
              <div className="text-sm text-gray-300 mb-2">
                Your available pips: <span className="text-uranian-blue font-bold">{currentPlayer.freePips}</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bid Amount (pips)
              </label>
              <input
                type="number"
                min="0"
                max={currentPlayer.freePips}
                value={pendingBid}
                onChange={(e) => setPendingBid(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-payne-grey/50 border border-lion/30 rounded text-white focus:outline-none focus:ring-2 focus:ring-lion"
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={submitBid}
                disabled={pendingBid < 0 || pendingBid > currentPlayer.freePips}
                className="flex-1 bg-lion hover:bg-lion-dark disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-white transition-colors"
              >
                Place Bid
              </button>
              <button
                onClick={() => setShowBidModal(null)}
                className="flex-1 bg-payne-grey-light hover:bg-payne-grey text-white px-4 py-2 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveFactoryModifications;