// Enhanced Player Mat - Shows deck stats, burn slots, tokens, and lap

import React from 'react';
import { BurnSlots, TokenPool } from '../types/game.types';

interface EnhancedPlayerMatProps {
  deckCount: number;
  handCount: number;
  discardCount: number;
  burnSlots: BurnSlots;
  tokens: TokenPool;
  maxTokens: number;
  currentLap: number;
}

const TOKEN_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  'P+': { name: 'Priority +1', emoji: '⚡', color: 'text-yellow-400' },
  'R+': { name: 'Race +1', emoji: '🏃', color: 'text-blue-400' },
  'A+': { name: 'Auction +1', emoji: '💰', color: 'text-purple-400' },
  'W+': { name: 'Wild +1', emoji: '🌟', color: 'text-green-400' },
  'P+3': { name: 'Priority +3', emoji: '⚡⚡⚡', color: 'text-yellow-500' },
  'D': { name: 'Damage', emoji: '💀', color: 'text-red-400' }
};

const EnhancedPlayerMat: React.FC<EnhancedPlayerMatProps> = ({
  deckCount,
  handCount,
  discardCount,
  burnSlots,
  tokens,
  maxTokens,
  currentLap
}) => {
  const totalCards = deckCount + handCount + discardCount;
  const totalTokens = Object.values(tokens).reduce((sum, count) => sum + count, 0);

  return (
    <div className="w-full bg-gray-800 border-2 border-gray-700 rounded-lg p-4 space-y-4">
      {/* Header with Lap */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl text-white font-bold">Your Player Mat</h3>
        <div className="bg-blue-600 px-3 py-1 rounded-lg">
          <span className="text-white font-bold">Lap {currentLap}/3</span>
        </div>
      </div>

      {/* Deck Stats */}
      <div>
        <h4 className="text-gray-400 text-sm font-semibold mb-2">Deck Status</h4>
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-2 text-center">
            <div className="text-2xl font-bold text-blue-400">{deckCount}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Deck</div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 p-2 text-center">
            <div className="text-2xl font-bold text-green-400">{handCount}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Hand</div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-gray-700 p-2 text-center">
            <div className="text-2xl font-bold text-purple-400">{discardCount}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Discard</div>
          </div>

          <div className="bg-gray-900 rounded-lg border border-blue-600 p-2 text-center">
            <div className="text-2xl font-bold text-white">{totalCards}</div>
            <div className="text-xs text-gray-400 font-semibold mt-1">Total</div>
          </div>
        </div>
      </div>

      {/* Burn Slots */}
      <div>
        <h4 className="text-gray-400 text-sm font-semibold mb-2">
          Burn Slots 🔥 (Permanent)
        </h4>
        <div className="grid grid-cols-3 gap-2">
          {burnSlots.map((slot, index) => (
            <div
              key={index}
              className={`
                rounded-lg border-2 p-3 min-h-[80px] flex flex-col items-center justify-center
                ${slot.card
                  ? 'bg-orange-900 border-orange-600'
                  : 'bg-gray-900 border-gray-700 border-dashed'
                }
              `}
            >
              {slot.card ? (
                <>
                  <div className="text-orange-400 font-semibold text-sm text-center">
                    {slot.card.title}
                  </div>
                  <div className="text-orange-300 text-xs mt-1">
                    {`P:${typeof slot.card.priority === 'number' ? slot.card.priority : `${slot.card.priority.base}+${slot.card.priority.dice}`} M:${slot.card.raceNumber}`}
                  </div>
                </>
              ) : (
                <div className="text-gray-600 text-xs text-center">
                  Empty Slot {index + 1}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Token Pool */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-gray-400 text-sm font-semibold">
            Token Pool
          </h4>
          <div className="text-gray-400 text-xs">
            {totalTokens}/{maxTokens}
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {Object.entries(TOKEN_INFO).map(([tokenType, info]) => {
            const count = tokens[tokenType as keyof TokenPool] || 0;

            return (
              <div
                key={tokenType}
                className={`
                  bg-gray-900 rounded-lg border p-2 text-center
                  ${count > 0 ? 'border-gray-600' : 'border-gray-800 opacity-50'}
                `}
                title={info.name}
              >
                <div className="text-xl">{info.emoji}</div>
                <div className={`text-xs font-bold ${info.color}`}>
                  {tokenType}
                </div>
                <div className="text-white font-bold text-sm">
                  ×{count}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EnhancedPlayerMat;
