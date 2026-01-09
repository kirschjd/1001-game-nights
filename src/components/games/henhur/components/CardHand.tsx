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
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

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

  // Minimized state - just show a bar with card count and expand button
  if (isMinimized) {
    return (
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="text-gray-300 text-sm">
          Hand: {cards.length} card{cards.length !== 1 ? 's' : ''}
        </div>
        <button
          onClick={() => setIsMinimized(false)}
          className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-payne-grey-dark font-semibold text-xs rounded transition-colors"
        >
          Show Hand
        </button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute top-2 right-2 z-10 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
        >
          Minimize
        </button>
        <div className="flex items-center justify-center p-8 bg-payne-grey-light/30 rounded-lg border border-payne-grey">
          <p className="text-gray-400 text-sm">No cards in hand</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Minimize Button */}
      <button
        onClick={() => setIsMinimized(true)}
        className="absolute top-2 right-2 z-10 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
      >
        Minimize
      </button>

      {/* Cards Container - horizontal scroll, no wrap */}
      <div className="flex flex-nowrap gap-3 p-4 overflow-x-auto" style={{ scrollbarWidth: 'thin' }}>
      {cards.map((card, index) => {
        const isSelected = selectedCardId === card.id;
        const isHovered = hoveredCardId === card.id;

        return (
          <div
            key={`${card.id}-${index}`}
            className={`relative group transition-all duration-200 flex-shrink-0 ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            } ${isSelected ? 'transform scale-105' : ''}`}
            onMouseEnter={() => !disabled && setHoveredCardId(card.id)}
            onMouseLeave={() => setHoveredCardId(null)}
            onClick={() => handleCardClick(card.id)}
          >
            {/* Card */}
            <div
              className={`w-48 h-64 rounded-lg border-2 p-3 flex flex-col transition-all ${
                isSelected
                  ? 'border-amber-400 bg-amber-400/20 shadow-lg shadow-amber-400/30'
                  : isHovered
                  ? 'border-amber-400/50 bg-payne-grey-light/80'
                  : 'border-payne-grey bg-payne-grey-light/50'
              }`}
            >
              {/* Card Header */}
              <div className="mb-2">
                <div className="flex items-start justify-between gap-1">
                  <h3 className="font-bold text-white text-sm leading-tight">{card.title}</h3>
                  <span
                    className={`px-1.5 py-0.5 rounded text-white text-[10px] flex-shrink-0 ${
                      card.deckType === 'base'
                        ? 'bg-gray-600'
                        : card.deckType === 'lap1'
                        ? 'bg-green-600'
                        : card.deckType === 'lap2'
                        ? 'bg-blue-600'
                        : 'bg-purple-600'
                    }`}
                  >
                    {card.description}
                  </span>
                </div>
                <div className="flex gap-1 mt-1 text-xs">
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    {`P${typeof card.priority === 'number' ? card.priority : `${card.priority.base}+${card.priority.dice}`}`}
                  </span>
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    {`T${card.trickNumber}`}
                  </span>
                  <span className="px-1.5 py-0.5 bg-payne-grey rounded text-gray-300">
                    {`R${card.raceNumber}`}
                  </span>
                </div>
              </div>

              {/* Effect Text */}
              <div className="flex-1 overflow-y-auto space-y-2">
                {(card.effectText || card.effect.length > 0) && (
                  <div className="text-xs">
                    <div className="text-gray-400 font-semibold mb-0.5">Effect:</div>
                    <p className="text-gray-300 leading-snug">
                      {card.effectText || `Move ${card.raceNumber} spaces`}
                    </p>
                  </div>
                )}
                {(card.burnEffectText || card.burnEffect.length > 0) && (
                  <div className="text-xs">
                    <div className="text-orange-400 font-semibold mb-0.5">Burn:</div>
                    <p className="text-orange-300 leading-snug">
                      {card.burnEffectText || 'Special burn effect'}
                    </p>
                  </div>
                )}
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
    </div>
  );
};

export default CardHand;
