// HenHur Deck Manager Component
// Shows deck stats and available cards for drafting

import React from 'react';
import { Card, PlayerDeck } from '../types/card.types';
import { getDeckStats } from '../utils/cardUtils';

interface DeckManagerProps {
  playerDeck: PlayerDeck;
  availableCards: Card[];
  currentLap: string;
  onDraftCard?: (cardId: string) => void;
  onDrawCards?: (count: number) => void;
  canDraw?: boolean;
  canDraft?: boolean;
}

const DeckManager: React.FC<DeckManagerProps> = ({
  playerDeck,
  availableCards,
  currentLap,
  onDraftCard,
  onDrawCards,
  canDraw = true,
  canDraft = false
}) => {
  const stats = getDeckStats(playerDeck);

  return (
    <div className="bg-payne-grey-light rounded-lg border border-amber-400/30 p-4">
      {/* Deck Stats */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-amber-400 mb-3">Your Deck</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-payne-grey rounded p-2">
            <div className="text-2xl font-bold text-white">{stats.handCount}</div>
            <div className="text-xs text-gray-400">In Hand</div>
          </div>
          <div className="bg-payne-grey rounded p-2">
            <div className="text-2xl font-bold text-white">{stats.deckCount}</div>
            <div className="text-xs text-gray-400">In Deck</div>
          </div>
          <div className="bg-payne-grey rounded p-2">
            <div className="text-2xl font-bold text-white">{stats.discardCount}</div>
            <div className="text-xs text-gray-400">Discard</div>
          </div>
          <div className="bg-payne-grey rounded p-2">
            <div className="text-2xl font-bold text-amber-400">{stats.totalCount}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
        </div>

        {/* Draw Cards Button */}
        {onDrawCards && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => onDrawCards(1)}
              disabled={!canDraw || stats.deckCount === 0}
              className="flex-1 px-3 py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 rounded text-amber-400 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Draw 1 Card
            </button>
            <button
              onClick={() => onDrawCards(3)}
              disabled={!canDraw || stats.deckCount === 0}
              className="flex-1 px-3 py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 rounded text-amber-400 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Draw 3 Cards
            </button>
          </div>
        )}
      </div>

      {/* Available Cards for Drafting */}
      {canDraft && availableCards.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-amber-400">
              Available Cards - {currentLap}
            </h3>
            <span className="text-xs text-gray-400">
              {availableCards.length} available
            </span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableCards.map((card) => (
              <div
                key={card.id}
                className="bg-payne-grey rounded-lg border border-payne-grey-light p-3 hover:border-amber-400/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white text-sm">{card.title}</h4>
                      <span className="text-xs text-gray-400">P{card.priority}</span>
                    </div>
                    <p className="text-xs text-gray-300 mb-2">{card.description}</p>
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-payne-grey-dark rounded text-gray-400">
                        T{card.trickNumber}
                      </span>
                      <span className="px-2 py-0.5 bg-payne-grey-dark rounded text-gray-400">
                        R{card.raceNumber}
                      </span>
                      {card.effect.length > 0 && (
                        <span className="px-2 py-0.5 bg-payne-grey-dark rounded text-amber-400">
                          ⚡{card.effect.length}
                        </span>
                      )}
                      {card.burnEffect.length > 0 && (
                        <span className="px-2 py-0.5 bg-payne-grey-dark rounded text-red-400">
                          🔥{card.burnEffect.length}
                        </span>
                      )}
                    </div>
                  </div>
                  {onDraftCard && (
                    <button
                      onClick={() => onDraftCard(card.id)}
                      className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-payne-grey-dark font-semibold text-xs rounded transition-colors whitespace-nowrap"
                    >
                      Draft
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No cards available message */}
      {canDraft && availableCards.length === 0 && (
        <div className="text-center py-4">
          <p className="text-gray-400 text-sm">No cards available for drafting</p>
        </div>
      )}
    </div>
  );
};

export default DeckManager;
