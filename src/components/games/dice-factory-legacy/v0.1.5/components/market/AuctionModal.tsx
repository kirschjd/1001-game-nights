// 1001 Game Nights - Auction Modal Component
// Version: 1.0.0 - Blind bidding modal for Factory Modifications
// Updated: December 2024

import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface AuctionItem {
  modificationId: string;
  modification: {
    id: string;
    name: string;
    description: string;
    cost: number;
  };
  bidders: Array<{
    playerId: string;
    playerName: string;
    amount: number;
  }>;
}

interface AuctionModalProps {
  socket: Socket | null;
  auctions: AuctionItem[];
  currentPlayer: any;
  onComplete: () => void;
}

const AuctionModal: React.FC<AuctionModalProps> = ({ 
  socket, 
  auctions, 
  currentPlayer,
  onComplete 
}) => {
  const [currentAuctionIndex, setCurrentAuctionIndex] = useState(0);
  const [bidAmount, setBidAmount] = useState(0);
  const [auctionResults, setAuctionResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const currentAuction = auctions[currentAuctionIndex];
  const isInvolved = currentAuction?.bidders.some(bid => bid.playerId === currentPlayer?.id);

  useEffect(() => {
    if (!socket) return;

    // Listen for auction results
    const handleAuctionResults = (data: { results: any[] }) => {
      setAuctionResults(data.results);
      setShowResults(true);
      
      // Close modal after showing results
      setTimeout(() => {
        onComplete();
      }, 5000);
    };

    socket.on('auction-results', handleAuctionResults);

    return () => {
      socket.off('auction-results', handleAuctionResults);
    };
  }, [socket, onComplete]);

  const submitBid = () => {
    if (!socket || !currentAuction || !isInvolved) return;

    // Submit the bid
    socket.emit('dice-factory-auction-bid', {
      modificationId: currentAuction.modificationId,
      bidAmount: bidAmount
    });

    // Move to next auction or wait for results
    if (currentAuctionIndex < auctions.length - 1) {
      setCurrentAuctionIndex(prev => prev + 1);
      setBidAmount(0);
    } else {
      // All bids submitted, wait for results
      setCurrentAuctionIndex(-1);
    }
  };

  const skipAuction = () => {
    // Player not involved in this auction, move to next
    if (currentAuctionIndex < auctions.length - 1) {
      setCurrentAuctionIndex(prev => prev + 1);
    } else {
      // No more auctions for this player
      setCurrentAuctionIndex(-1);
    }
  };

  // Show results
  if (showResults) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-payne-grey p-6 rounded-xl max-w-2xl w-full mx-4 border border-lion max-h-[80vh] overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4 text-lion">Auction Results</h2>
          
          <div className="space-y-4">
            {auctionResults.map((result, index) => (
              <div key={index} className="bg-midnight-green/50 p-4 rounded border border-lion/30">
                <h3 className="font-bold text-lg mb-2">{result.modification.name}</h3>
                
                {result.winner ? (
                  <div>
                    <p className="text-green-400 mb-2">
                      Winner: {result.winner.playerName} with {result.winner.bidAmount} pips
                    </p>
                    <div className="text-sm text-gray-400">
                      <div>All bids:</div>
                      <div>
                        {Object.entries(result.allBids).map(([playerId, amount]) => (
                          <div key={playerId} className="ml-4">
                            {`• ${playerId === currentPlayer.id ? 'You' : 'Opponent'}: ${amount} pips`}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-400">
                    No winner - tied bids or no valid bids
                  </p>
                )}
              </div>
            ))}
          </div>
          
          <p className="text-center text-gray-400 mt-4">Closing automatically...</p>
        </div>
      </div>
    );
  }

  // Waiting for results
  if (currentAuctionIndex === -1) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-lion">
          <h2 className="text-xl font-bold mb-4 text-lion">Waiting for Auction Results...</h2>
          <p className="text-gray-400">All players are submitting their blind bids.</p>
        </div>
      </div>
    );
  }

  // Not involved in any remaining auctions
  if (!isInvolved && currentAuction) {
    skipAuction();
    return null;
  }

  if (!currentAuction) return null;

  const myOriginalBid = currentAuction.bidders.find(bid => bid.playerId === currentPlayer.id)?.amount || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-lion">
        <h2 className="text-xl font-bold mb-4 text-lion">Blind Auction</h2>
        
        <div className="mb-4">
          <h3 className="font-bold text-lg mb-2">{currentAuction.modification.name}</h3>
          <p className="text-sm text-gray-400 mb-4">{currentAuction.modification.description}</p>
          
          <div className="bg-midnight-green/50 p-3 rounded mb-4">
            <p className="text-sm">
              <span className="font-semibold">Your original bid:</span> {myOriginalBid} pips
            </p>
            <p className="text-sm">
              <span className="font-semibold">Other bidders:</span> {currentAuction.bidders.length - 1}
            </p>
            <p className="text-sm">
              <span className="font-semibold">Available pips:</span> {currentPlayer.freePips}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Your Blind Bid:</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max={currentPlayer.freePips}
              value={bidAmount}
              onChange={(e) => setBidAmount(Math.max(0, Math.min(currentPlayer.freePips, parseInt(e.target.value) || 0)))}
              className="flex-1 bg-midnight-green text-white border border-lion/30 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-lion placeholder-gray-400"
            />
            <span className="text-gray-400">pips</span>
          </div>
        </div>

        <div className="text-xs text-gray-400 mb-4 bg-midnight-green/30 p-3 rounded">
          <p className="mb-1">• This is a blind auction - you won't see other bids</p>
          <p className="mb-1">• Highest bidder wins the modification</p>
          <p className="mb-1">• Tied bids result in no winner</p>
          <p>• Losers get their pips refunded</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={submitBid}
            className="flex-1 bg-lion hover:bg-lion-light px-4 py-2 rounded text-white transition-colors"
          >
            Submit Bid ({currentAuctionIndex + 1}/{auctions.length})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionModal;