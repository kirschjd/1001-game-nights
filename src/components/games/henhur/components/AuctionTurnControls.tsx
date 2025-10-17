// Auction Turn Controls - Bidding and drafting

import React, { useState, useEffect } from 'react';
import { Card, TokenType, TokenPool } from '../types/game.types';
import TokenSelector from './TokenSelector';

interface AuctionTurnControlsProps {
  phase: 'selection' | 'reveal' | 'drafting';
  hand: Card[];
  tokens: TokenPool;
  auctionPool: Card[];
  currentDrafter?: string;
  myPlayerId: string;
  onSelectBidCard: (cardId: string, willBurn: boolean, tokensToUse: TokenType[]) => void;
  onDraftCard: (cardId: string) => void;
  isReady: boolean;
}

const AuctionTurnControls: React.FC<AuctionTurnControlsProps> = ({
  phase,
  hand,
  tokens,
  auctionPool,
  currentDrafter,
  myPlayerId,
  onSelectBidCard,
  onDraftCard,
  isReady
}) => {
  const [selectedBidCard, setSelectedBidCard] = useState<Card | null>(null);
  const [willBurn, setWillBurn] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<TokenType[]>([]);

  // Reset when phase changes
  useEffect(() => {
    if (phase === 'selection' && !isReady) {
      setSelectedBidCard(null);
      setWillBurn(false);
      setSelectedTokens([]);
    }
  }, [phase, isReady]);

  const handleBidCardClick = (card: Card) => {
    setSelectedBidCard(card);
    // Can only burn if card has burn effects (@ symbol)
    if (card.burnEffect.length === 0) {
      setWillBurn(false);
    }
  };

  const handleToggleToken = (tokenType: TokenType) => {
    setSelectedTokens(prev => {
      if (prev.includes(tokenType)) {
        const index = prev.indexOf(tokenType);
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      } else {
        return [...prev, tokenType];
      }
    });
  };

  const handleReady = () => {
    if (!selectedBidCard) return;
    onSelectBidCard(selectedBidCard.id, willBurn, selectedTokens);
  };

  const handleDraftClick = (card: Card) => {
    onDraftCard(card.id);
  };

  const calculateTotalTrickValue = (): number => {
    if (!selectedBidCard) return 0;
    let value = selectedBidCard.trickNumber;
    selectedTokens.forEach(token => {
      if (token === 'A+' || token === 'W+') value += 1;
    });
    return value;
  };

  const isMyTurnToDraft = currentDrafter === myPlayerId;

  // SELECTION PHASE
  if (phase === 'selection') {
    if (isReady) {
      return (
        <div className="bg-gray-800 rounded-lg p-4 border border-green-600">
          <div className="text-center">
            <div className="text-green-400 font-bold text-lg mb-2">✅ Bid Placed!</div>
            <div className="text-gray-400 text-sm">Waiting for other players...</div>
            {selectedBidCard && (
              <div className="mt-4 p-3 bg-gray-900 rounded-lg">
                <div className="text-white font-semibold">{selectedBidCard.title}</div>
                <div className="text-gray-400 text-sm mt-1">Trick Value: {calculateTotalTrickValue()}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">🎪 Auction Turn</h2>
          <p className="text-gray-400 text-sm">Select a card to bid with</p>
        </div>

        {/* Available Cards to Draft */}
        {auctionPool.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-2">Available Cards</h3>
            <div className="grid grid-cols-3 gap-2">
              {auctionPool.map(card => (
                <div
                  key={card.id}
                  className="p-2 bg-gray-900 border border-purple-600 rounded-lg"
                >
                  <div className="text-white font-semibold text-xs">{card.title}</div>
                  <div className="text-gray-400 text-xs mt-1">{card.description}</div>
                  <div className="flex justify-between mt-1 text-xs">
                    <span className="text-purple-400">P: {card.priority}</span>
                    <span className="text-purple-400">M: {card.raceNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bid Card Selection */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">Your Bid (from hand)</h3>
          <div className="grid grid-cols-3 gap-2">
            {hand.map(card => (
              <button
                key={card.id}
                onClick={() => handleBidCardClick(card)}
                className={`
                  p-3 rounded-lg border-2 transition-all text-left
                  ${selectedBidCard?.id === card.id
                    ? 'bg-purple-600 border-purple-400 shadow-lg scale-105'
                    : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                  }
                `}
              >
                <div className="text-white font-semibold text-sm">{card.title}</div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-300">T: {card.trickNumber}</span>
                  {card.burnEffect.length > 0 && <span className="text-orange-400">@</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Bid Card Details */}
        {selectedBidCard && (
          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="text-white font-semibold mb-1">{selectedBidCard.title}</div>
            <div className="text-gray-400 text-sm mb-2">{selectedBidCard.description}</div>

            <div className="bg-gray-800 px-2 py-1 rounded mb-2">
              <span className="text-gray-500 text-xs">Base Trick Value:</span>
              <span className="text-white font-bold ml-1">{selectedBidCard.trickNumber}</span>
            </div>

            {/* Burn Option (only if has burn effect) */}
            {selectedBidCard.burnEffect.length > 0 && (
              <label className="flex items-center space-x-2 cursor-pointer p-2 bg-gray-800 rounded hover:bg-gray-750">
                <input
                  type="checkbox"
                  checked={willBurn}
                  onChange={(e) => setWillBurn(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-orange-600"
                />
                <span className="text-white text-sm">
                  🔥 Burn this card (has @ symbol)
                </span>
              </label>
            )}
          </div>
        )}

        {/* Token Selector */}
        {selectedBidCard && (
          <>
            <TokenSelector
              availableTokens={tokens}
              selectedTokens={selectedTokens}
              onToggleToken={handleToggleToken}
              mode="auction"
            />

            {/* Summary */}
            <div className="bg-gray-900 rounded-lg p-3 border border-purple-600">
              <div className="text-white font-semibold mb-2">Bid Summary</div>
              <div>
                <div className="text-gray-400 text-xs">Total Trick Value</div>
                <div className="text-white font-bold text-2xl">{calculateTotalTrickValue()}</div>
                <div className="text-gray-500 text-xs">
                  {selectedBidCard.trickNumber}
                  {selectedTokens.filter(t => t === 'A+' || t === 'W+').length > 0 &&
                    ` + ${selectedTokens.filter(t => t === 'A+' || t === 'W+').length}`}
                </div>
                <div className="text-purple-400 text-xs mt-1">
                  Higher value = earlier draft pick
                </div>
              </div>
            </div>
          </>
        )}

        {/* Ready Button */}
        <button
          onClick={handleReady}
          disabled={!selectedBidCard}
          className={`
            w-full py-3 rounded-lg font-bold text-lg transition-all
            ${selectedBidCard
              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {selectedBidCard ? '✅ Place Bid' : 'Select a bid card first'}
        </button>
      </div>
    );
  }

  // REVEAL PHASE
  if (phase === 'reveal') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-yellow-600">
        <div className="text-center">
          <div className="text-yellow-400 font-bold text-lg mb-2">👁️ Bids Revealed!</div>
          <div className="text-gray-400 text-sm">Determining draft order...</div>
          <div className="mt-4 animate-pulse text-2xl">🎲</div>
        </div>
      </div>
    );
  }

  // DRAFTING PHASE
  if (phase === 'drafting') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
        <div className="text-center">
          <h2 className="text-white font-bold text-lg">📦 Drafting Phase</h2>
          {isMyTurnToDraft ? (
            <p className="text-green-400 font-semibold">✨ Your turn to draft!</p>
          ) : (
            <p className="text-gray-400 text-sm">Waiting for other players to draft...</p>
          )}
        </div>

        {/* Available Cards */}
        <div>
          <h3 className="text-white font-semibold text-sm mb-2">
            Available Cards ({auctionPool.length} remaining)
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {auctionPool.map(card => (
              <button
                key={card.id}
                onClick={() => handleDraftClick(card)}
                disabled={!isMyTurnToDraft}
                className={`
                  p-3 rounded-lg border-2 transition-all text-left
                  ${isMyTurnToDraft
                    ? 'bg-purple-700 border-purple-500 hover:bg-purple-600 hover:border-purple-400 shadow-lg cursor-pointer'
                    : 'bg-gray-900 border-gray-700 cursor-not-allowed opacity-50'
                  }
                `}
              >
                <div className="text-white font-semibold text-sm">{card.title}</div>
                <div className="text-gray-300 text-xs mt-1">{card.description}</div>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-purple-300">P: {card.priority}</span>
                  <span className="text-purple-300">M: {card.raceNumber}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {!isMyTurnToDraft && (
          <div className="text-center text-gray-400 text-sm">
            ⏳ Waiting for current drafter...
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default AuctionTurnControls;
