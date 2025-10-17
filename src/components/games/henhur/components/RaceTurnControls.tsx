// Race Turn Controls - Card selection, burn option, token usage, ready button

import React, { useState, useEffect } from 'react';
import { Card, TokenType, TokenPool } from '../types/game.types';
import TokenSelector from './TokenSelector';

interface RaceTurnControlsProps {
  hand: Card[];
  tokens: TokenPool;
  burnSlotsAvailable: number;
  onSelectCard: (cardId: string, willBurn: boolean, tokensToUse: TokenType[]) => void;
  isReady: boolean;
}

const RaceTurnControls: React.FC<RaceTurnControlsProps> = ({
  hand,
  tokens,
  burnSlotsAvailable,
  onSelectCard,
  isReady
}) => {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [willBurn, setWillBurn] = useState(false);
  const [selectedTokens, setSelectedTokens] = useState<TokenType[]>([]);

  // Reset when ready state changes (new turn)
  useEffect(() => {
    if (!isReady) {
      setSelectedCard(null);
      setWillBurn(false);
      setSelectedTokens([]);
    }
  }, [isReady]);

  const handleCardClick = (card: Card) => {
    setSelectedCard(card);
    // Reset burn if no slots available
    if (burnSlotsAvailable === 0) {
      setWillBurn(false);
    }
  };

  const handleToggleToken = (tokenType: TokenType) => {
    setSelectedTokens(prev => {
      if (prev.includes(tokenType)) {
        // Remove token
        const index = prev.indexOf(tokenType);
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      } else {
        // Add token
        return [...prev, tokenType];
      }
    });
  };

  const handleReady = () => {
    if (!selectedCard) return;
    onSelectCard(selectedCard.id, willBurn, selectedTokens);
  };

  const calculateTotalPriority = (): number => {
    if (!selectedCard) return 0;
    let priority = selectedCard.priority;
    selectedTokens.forEach(token => {
      if (token === 'P+' || token === 'W+') priority += 1;
      if (token === 'P+3') priority += 3;
    });
    return priority;
  };

  const calculateTotalMovement = (): number => {
    if (!selectedCard) return 0;
    let movement = selectedCard.raceNumber;
    selectedTokens.forEach(token => {
      if (token === 'R+' || token === 'W+') movement += 1;
    });
    return movement;
  };

  if (isReady) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-green-600">
        <div className="text-center">
          <div className="text-green-400 font-bold text-lg mb-2">✅ Ready!</div>
          <div className="text-gray-400 text-sm">Waiting for other players...</div>
          {selectedCard && (
            <div className="mt-4 p-3 bg-gray-900 rounded-lg">
              <div className="text-white font-semibold">{selectedCard.title}</div>
              <div className="text-gray-400 text-sm mt-1">{selectedCard.description}</div>
              <div className="flex justify-around mt-2 text-xs">
                <div>
                  <div className="text-gray-500">Priority</div>
                  <div className="text-white font-bold">{calculateTotalPriority()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Movement</div>
                  <div className="text-white font-bold">{calculateTotalMovement()}</div>
                </div>
                {willBurn && (
                  <div>
                    <div className="text-orange-400">🔥 Burning</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
      <div className="text-center">
        <h2 className="text-white font-bold text-lg">🏎️  Race Turn</h2>
        <p className="text-gray-400 text-sm">Select a card to play</p>
      </div>

      {/* Card Selection */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-2">Your Hand</h3>
        <div className="grid grid-cols-3 gap-2">
          {hand.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className={`
                p-3 rounded-lg border-2 transition-all text-left
                ${selectedCard?.id === card.id
                  ? 'bg-blue-600 border-blue-400 shadow-lg scale-105'
                  : 'bg-gray-700 border-gray-600 hover:bg-gray-600 hover:border-gray-500'
                }
              `}
            >
              <div className="text-white font-semibold text-sm">{card.title}</div>
              <div className="flex justify-between mt-1 text-xs">
                <span className="text-gray-300">P: {card.priority}</span>
                <span className="text-gray-300">M: {card.raceNumber}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Card Details */}
      {selectedCard && (
        <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
          <div className="text-white font-semibold mb-1">{selectedCard.title}</div>
          <div className="text-gray-400 text-sm mb-2">{selectedCard.description}</div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-2">
            <div className="bg-gray-800 px-2 py-1 rounded">
              <span className="text-gray-500">Base Priority:</span>
              <span className="text-white font-bold ml-1">{selectedCard.priority}</span>
            </div>
            <div className="bg-gray-800 px-2 py-1 rounded">
              <span className="text-gray-500">Base Movement:</span>
              <span className="text-white font-bold ml-1">{selectedCard.raceNumber}</span>
            </div>
          </div>

          {/* Burn Option */}
          {burnSlotsAvailable > 0 && (
            <label className="flex items-center space-x-2 cursor-pointer p-2 bg-gray-800 rounded hover:bg-gray-750">
              <input
                type="checkbox"
                checked={willBurn}
                onChange={(e) => setWillBurn(e.target.checked)}
                className="form-checkbox h-4 w-4 text-orange-600"
              />
              <span className="text-white text-sm">
                🔥 Burn this card
                {selectedCard.burnEffect.length > 0 && (
                  <span className="text-orange-400 ml-1">(has burn effect)</span>
                )}
              </span>
            </label>
          )}

          {burnSlotsAvailable === 0 && (
            <div className="text-red-400 text-xs">
              ⚠️ No burn slots available
            </div>
          )}
        </div>
      )}

      {/* Token Selector */}
      {selectedCard && (
        <>
          <TokenSelector
            availableTokens={tokens}
            selectedTokens={selectedTokens}
            onToggleToken={handleToggleToken}
            mode="priority"
          />

          {/* Summary */}
          <div className="bg-gray-900 rounded-lg p-3 border border-blue-600">
            <div className="text-white font-semibold mb-2">Turn Summary</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-400 text-xs">Total Priority</div>
                <div className="text-white font-bold text-lg">{calculateTotalPriority()}</div>
                <div className="text-gray-500 text-xs">
                  {selectedCard.priority}
                  {selectedTokens.filter(t => t === 'P+' || t === 'W+').length > 0 &&
                    ` + ${selectedTokens.filter(t => t === 'P+' || t === 'W+').length}`}
                  {selectedTokens.includes('P+3') && ' + 3'}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs">Total Movement</div>
                <div className="text-white font-bold text-lg">{calculateTotalMovement()}</div>
                <div className="text-gray-500 text-xs">
                  {selectedCard.raceNumber}
                  {selectedTokens.filter(t => t === 'R+' || t === 'W+').length > 0 &&
                    ` + ${selectedTokens.filter(t => t === 'R+' || t === 'W+').length}`}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Ready Button */}
      <button
        onClick={handleReady}
        disabled={!selectedCard}
        className={`
          w-full py-3 rounded-lg font-bold text-lg transition-all
          ${selectedCard
            ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }
        `}
      >
        {selectedCard ? '✅ Ready!' : 'Select a card first'}
      </button>
    </div>
  );
};

export default RaceTurnControls;
