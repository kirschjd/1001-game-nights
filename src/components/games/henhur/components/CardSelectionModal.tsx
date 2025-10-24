// HenHur Card Selection Modal
// Allows lobby leader to select which cards are available for the game

import React, { useState, useEffect } from 'react';
import { ALL_CARDS } from '../data/cards';
import { Card, DeckType } from '../types/card.types';

interface CardSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCardIds: string[];
  onSave: (cardIds: string[]) => void;
}

const CardSelectionModal: React.FC<CardSelectionModalProps> = ({
  isOpen,
  onClose,
  selectedCardIds,
  onSave
}) => {
  const [localSelection, setLocalSelection] = useState<Set<string>>(new Set(selectedCardIds));

  useEffect(() => {
    setLocalSelection(new Set(selectedCardIds));
  }, [selectedCardIds, isOpen]);

  if (!isOpen) return null;

  const groupedCards = ALL_CARDS.reduce((acc, card) => {
    if (!acc[card.deckType]) {
      acc[card.deckType] = [];
    }
    acc[card.deckType].push(card);
    return acc;
  }, {} as Record<DeckType, Card[]>);

  const handleToggle = (cardId: string) => {
    const newSelection = new Set(localSelection);
    if (newSelection.has(cardId)) {
      newSelection.delete(cardId);
    } else {
      newSelection.add(cardId);
    }
    setLocalSelection(newSelection);
  };

  const handleToggleAll = (deckType: DeckType) => {
    const deckCards = groupedCards[deckType];
    const allSelected = deckCards.every(card => localSelection.has(card.id));

    const newSelection = new Set(localSelection);
    if (allSelected) {
      deckCards.forEach(card => newSelection.delete(card.id));
    } else {
      deckCards.forEach(card => newSelection.add(card.id));
    }
    setLocalSelection(newSelection);
  };

  const handleSave = () => {
    onSave(Array.from(localSelection));
    onClose();
  };

  const deckTypeLabels: Record<DeckType, string> = {
    base: 'Base Cards',
    lap1: 'Lap 1 Cards',
    lap2: 'Lap 2 Cards',
    lap3: 'Lap 3 Cards'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-payne-grey rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-amber-400/30 flex flex-col">
        {/* Header */}
        <div className="bg-amber-400/10 border-b border-amber-400/30 p-6">
          <h2 className="text-2xl font-bold text-amber-400">Select Cards for Game</h2>
          <p className="text-gray-300 text-sm mt-2">
            Choose which cards will be available during this game session
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {(['base', 'lap1', 'lap2', 'lap3'] as DeckType[]).map(deckType => {
              const cards = groupedCards[deckType] || [];
              const selectedCount = cards.filter(card => localSelection.has(card.id)).length;

              return (
                <div key={deckType} className="bg-payne-grey-light rounded-lg border border-payne-grey p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-amber-400">
                        {deckTypeLabels[deckType]}
                      </h3>
                      <p className="text-xs text-gray-400">
                        {selectedCount} of {cards.length} selected
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleAll(deckType)}
                      className="px-3 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-400 rounded text-sm transition-colors border border-amber-400/30"
                    >
                      {cards.every(card => localSelection.has(card.id)) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {cards.map(card => (
                      <label
                        key={card.id}
                        className={`flex items-start p-3 rounded-lg border cursor-pointer transition-all ${
                          localSelection.has(card.id)
                            ? 'bg-amber-400/10 border-amber-400/50'
                            : 'bg-payne-grey border-payne-grey-light hover:border-amber-400/30'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={localSelection.has(card.id)}
                          onChange={() => handleToggle(card.id)}
                          className="mt-1 mr-3 accent-amber-400"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{card.title}</span>
                            <span className="text-xs text-gray-400">
                              {`P${typeof card.priority === 'number' ? card.priority : `${card.priority.base}+${card.priority.dice}`}`}
                            </span>
                            {card.copies && card.copies > 1 && (
                              <span className="text-xs px-1.5 py-0.5 bg-amber-400/20 text-amber-400 rounded border border-amber-400/30">
                                ×{card.copies}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 mb-2">{card.description}</p>
                          <div className="flex gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-payne-grey rounded text-gray-400">
                              T{card.trickNumber}
                            </span>
                            <span className="px-2 py-0.5 bg-payne-grey rounded text-gray-400">
                              R{card.raceNumber}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-payne-grey-light border-t border-payne-grey p-6 flex justify-between items-center">
          <div className="text-sm text-gray-300">
            <strong>{localSelection.size}</strong> of <strong>{ALL_CARDS.length}</strong> cards selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-payne-grey hover:bg-payne-grey-dark rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-amber-400 hover:bg-amber-500 rounded-lg text-payne-grey-dark font-semibold transition-colors"
            >
              Save Selection
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardSelectionModal;
