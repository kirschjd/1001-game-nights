// 1001 Game Nights - Active Factory Modifications Component
// Version: 2.1.0 - Implemented bidding interface for modifications
// Updated: December 2024

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import AuctionModal from './AuctionModal';

interface ModificationCard {
  id: string; // unique instance id
  modTypeId: string; // type id
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
  reservations: Array<{ playerId: string; playerName: string }>;
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
  const [activeAuctions, setActiveAuctions] = useState<any[]>([]);
  const [showAuctionModal, setShowAuctionModal] = useState(false);

  // Request current turn modifications when component mounts or game state changes
  useEffect(() => {
    if (socket && gameState?.type === 'dice-factory') {
      socket.emit('dice-factory-get-turn-modifications');
    }
  }, [socket, gameState?.round, gameState?.type]);

  // Socket event listeners
  useEffect(() => {

    if (!socket) {
      
      return;
    }

    

    const handleTurnModificationsUpdate = (data: { 
      modifications: ModificationCard[], 
      deckStatus: DeckStatus 
    }) => {

      setCurrentTurnModifications(data.modifications);
      setDeckStatus(data.deckStatus);
      
    };

    const handleModificationBidPlaced = (data: { 
      playerId: string, 
      modificationId: string 
    }) => {
      // Update UI to show someone placed a bid (but not the amount)
      setCurrentTurnModifications(prev => prev.map(mod => {
        if (mod.id === data.modificationId) {
          // Just increment bid count, actual bid data comes from server
          return { ...mod };
        }
        return mod;
      }));
    };

    const handleAuctionPhaseStart = (data: { auctions: any[] }) => {
      setActiveAuctions(data.auctions);
      setShowAuctionModal(true);
    };

    const handleModificationPurchased = (data: { 
      modification: any, 
      source: string 
    }) => {
      // Show notification that modification was purchased
      
    };

    socket.on('turn-modifications-update', handleTurnModificationsUpdate);
    socket.on('modification-bid-placed', handleModificationBidPlaced);
    socket.on('auction-phase-start', handleAuctionPhaseStart);
    socket.on('modification-purchased', handleModificationPurchased);

    

    return () => {
      
      socket.off('turn-modifications-update', handleTurnModificationsUpdate);
      socket.off('modification-bid-placed', handleModificationBidPlaced);
      socket.off('auction-phase-start', handleAuctionPhaseStart);
      socket.off('modification-purchased', handleModificationPurchased);
    };
  }, [socket]);

  useEffect(() => {
  
  }, [currentTurnModifications]);

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

  const canAffordAction = (cost: number) => {
    if (!currentPlayer) return false;
    
    const hasCorporateDebt = currentPlayer.modifications?.includes('corporate_debt');
    const minimumPips = hasCorporateDebt ? -20 : 0;
    
    return currentPlayer.freePips - cost >= minimumPips;
  };

  const handleReserve = (modificationId: string) => {
    if (!socket || !canTakeActions()) return;
    const hasCorporateDebt = currentPlayer.modifications?.includes('corporate_debt');
    const minimumPips = hasCorporateDebt ? -20 : 0;
    if (currentPlayer.freePips - getModificationCost(9) < minimumPips) {
      alert('Not enough pips to reserve modification');
      return;
    }
    socket.emit('dice-factory-reserve-modification', { modificationId });
  };

  const handleUndoReserve = (modificationId: string) => {
    if (!socket || !canTakeActions()) return;
    socket.emit('dice-factory-undo-reserve-modification', { modificationId });
  };

  if (!currentPlayer) {
    return (
      <div className="bg-midnight-green/50 p-4 rounded-lg border border-lion/30">
        <h3 className="text-lg font-semibold mb-3 text-lion">
          🔧 Factory Modifications
        </h3>
        <div className="text-sm text-gray-400 italic">
          Waiting for game to start...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-midnight-green/50 p-4 rounded-lg border border-lion/30">
      <h3 className="text-lg font-semibold mb-3 text-lion">
        🔧 Factory Modifications
      </h3>
      
      <div className="space-y-4">
        {/* Deck Status */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Deck: {deckStatus.cardsRemaining} / {deckStatus.totalCards} cards
          </span>
          <span className="text-sm text-gray-400">
            Your Pips: <span className="text-lion font-bold">{currentPlayer.freePips}</span>
          </span>
        </div>

        {/* Current Turn Modifications */}
        <div className="space-y-3">
          <h4 className="font-semibold text-lion">Available This Turn:</h4>
          {currentTurnModifications.length === 0 ? (
            <div className="text-sm text-gray-400 italic">
              No modifications available this turn.
            </div>
          ) : currentTurnModifications.map((modCard) => {
            const actualCost = getModificationCost(modCard.modification.cost);
            const isReservedByCurrent = modCard.reservations?.some(r => r.playerId === currentPlayer.id);
            const hasCorporateDebt = currentPlayer.modifications?.includes('corporate_debt');
            const minimumPips = hasCorporateDebt ? -20 : 0;
            const canAffordReservation = currentPlayer.freePips - actualCost >= minimumPips;
            const canReserve = canTakeActions() && !modCard.winner && !isReservedByCurrent && canAffordReservation;



            return (
              <div 
                key={modCard.id} 
                className="bg-payne-grey/70 p-3 rounded border border-lion/20 hover:border-lion/40 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-white">{modCard.modification.name}</div>
                    <div className="text-xs text-gray-400">
                      Base cost: {modCard.modification.cost} pips
                      {actualCost !== modCard.modification.cost && (
                        <span className="text-lion"> → {actualCost} pips</span>
                      )}
                    </div>
                  </div>
                  {modCard.winner && (
                    <div className="text-xs px-2 py-1 rounded bg-lion/20 text-lion">
                      Won
                    </div>
                  )}
                </div>
                
                <div className="text-sm text-gray-300 mb-3">
                  {modCard.modification.description}
                </div>
                
                {/* Reservation Markers */}
                {modCard.reservations && modCard.reservations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {modCard.reservations.map(r => (
                      <span key={r.playerId} className={`text-xs px-2 py-1 rounded ${r.playerId === currentPlayer.id ? 'bg-uranian-blue/40 text-uranian-blue' : 'bg-lion/20 text-lion'}`}>{r.playerName}</span>
                    ))}
                  </div>
                )}
                
                {/* Action Buttons */}
                {canReserve && (
                  <button
                    onClick={() => handleReserve(modCard.id)}
                    disabled={!canReserve}
                    className="w-full text-xs bg-lion hover:bg-lion-light disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded text-white transition-colors"
                  >
                    Reserve
                  </button>
                )}
                {!canReserve && !modCard.winner && (
                  <div className="text-xs text-gray-500 text-center py-2">
                    {isReservedByCurrent ? 'Reserved' : 'Unavailable'}
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
                disabled={!canAffordAction(getModificationCost(9)) || deckStatus.cardsRemaining === 0}
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

      {/* Auction Modal */}
      {showAuctionModal && activeAuctions.length > 0 && (
        <AuctionModal
          socket={socket}
          auctions={activeAuctions}
          currentPlayer={currentPlayer}
          onComplete={() => {
            setShowAuctionModal(false);
            setActiveAuctions([]);
          }}
        />
      )}
    </div>
  );
};

export default ActiveFactoryModifications;