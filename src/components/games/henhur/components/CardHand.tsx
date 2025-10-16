// HenHur Card Hand Component
// Displays player's hand and allows card selection/playing

import React, { useState } from 'react';
import { Card } from '../types/card.types';

interface CardHandProps {
  cards: Card[];
  onPlayCard?: (cardId: string) => void;
  onSelectCard?: (cardId: string) => void;
  selectedCardId?: string | null;
  disabled?: boolean;
}

const CardHand: React.FC<CardHandProps> = ({
  cards,
  onPlayCard,
  onSelectCard,
  selectedCardId,
  disabled = false
}) => {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);

  const handleCardClick = (cardId: string) => {
    if (disabled) return;

    if (onSelectCard) {
      onSelectCard(cardId);
    }
  };

  const handlePlayClick = (e: React.MouseEvent, cardId: string) => {
    e.stopPropagation();
    if (disabled) return;

    if (onPlayCard) {
      onPlayCard(cardId);
    }
  };

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 bg-payne-grey-light/30 rounded-lg border border-payne-grey">
        <p className="text-gray-400 text-sm">No cards in hand</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3 p-4">
      {cards.map((card, index) => {
        const isSelected = selectedCardId === card.id;
        const isHovered = hoveredCardId === card.id;

        return (
          <div
            key={`${card.id}-${index}`}
            className={`relative group transition-all duration-200 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${isSelected ? 'transform scale-105' : ''}`}
            onMouseEnter={() => !disabled && setHoveredCardId(card.id)}
            onMouseLeave={() => setHoveredCardId(null)}
            onClick={() => handleCardClick(card.id)}
          >
            {/* Card */}
            <div
              className={`w-40 h-56 rounded-lg border-2 p-3 flex flex-col transition-all ${
                isSelected
                  ? 'border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/30'
                  : isHovered
                  ? 'border-amber-400/50 bg-payne-grey-light/80'
                  : 'border-payne-grey bg-payne-grey-light/50'
              }`}
            >
              {/* Card Header */}
              <div className="mb-2">
                <h3 className="font-bold text-white text-sm truncate">{card.title}</h3>
                <div className="flex gap-1 mt-1 text-xs">
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    P{card.priority}
                  </span>
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    T{card.trickNumber}
                  </span>
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    R{card.raceNumber}
                  </span>
                </div>
              </div>

              {/* Card Description */}
              <div className="flex-1 overflow-y-auto mb-2">
                <p className="text-xs text-gray-300 leading-relaxed">{card.description}</p>
              </div>

              {/* Effects Count */}
              <div className="text-xs text-gray-400 mb-2">
                {card.effect.length > 0 && (
                  <div className="flex items-center gap-1">
                    <span>⚡</span>
                    <span>{card.effect.length} effect{card.effect.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                {card.burnEffect.length > 0 && (
                  <div className="flex items-center gap-1 text-red-400">
                    <span>🔥</span>
                    <span>Burn: {card.burnEffect.length}</span>
                  </div>
                )}
              </div>

              {/* Deck Type Badge */}
              <div className="text-xs">
                <span
                  className={`px-2 py-1 rounded text-white ${
                    card.deckType === 'base'
                      ? 'bg-gray-600'
                      : card.deckType === 'lap1'
                      ? 'bg-green-600'
                      : card.deckType === 'lap2'
                      ? 'bg-blue-600'
                      : 'bg-purple-600'
                  }`}
                >
                  {card.deckType === 'base'
                    ? 'Base'
                    : card.deckType === 'lap1'
                    ? 'Lap 1'
                    : card.deckType === 'lap2'
                    ? 'Lap 2'
                    : 'Lap 3'}
                </span>
              </div>
            </div>

            {/* Play Button (appears on hover) */}
            {onPlayCard && !disabled && (
              <button
                onClick={(e) => handlePlayClick(e, card.id)}
                className={`absolute bottom-2 left-1/2 transform -translate-x-1/2
                  px-4 py-1 bg-amber-400 hover:bg-amber-500 text-payne-grey-dark
                  font-semibold text-xs rounded shadow-lg transition-all
                  ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}
                `}
              >
                Play Card
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default CardHand;
