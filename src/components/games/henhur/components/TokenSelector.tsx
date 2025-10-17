// Token Selector - Choose which tokens to use this turn

import React from 'react';
import { TokenType, TokenPool } from '../types/game.types';

interface TokenSelectorProps {
  availableTokens: TokenPool;
  selectedTokens: TokenType[];
  onToggleToken: (tokenType: TokenType) => void;
  mode: 'priority' | 'race' | 'auction'; // What context tokens are being used for
}

const TOKEN_INFO: Record<TokenType, { name: string; emoji: string; description: string }> = {
  'P+': { name: 'Priority +1', emoji: '⚡', description: 'Increase priority by 1' },
  'R+': { name: 'Race +1', emoji: '🏃', description: 'Move 1 extra space' },
  'A+': { name: 'Auction +1', emoji: '💰', description: 'Increase bid value by 1' },
  'W+': { name: 'Wild +1', emoji: '🌟', description: 'Add 1 to any value' },
  'P+3': { name: 'Priority +3', emoji: '⚡⚡⚡', description: 'Increase priority by 3' },
  'D': { name: 'Damage', emoji: '💀', description: 'Cannot be used' }
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
  availableTokens,
  selectedTokens,
  onToggleToken,
  mode
}) => {
  const canUseToken = (tokenType: TokenType): boolean => {
    // Damage tokens can't be used
    if (tokenType === 'D') return false;

    // Wild tokens can always be used
    if (tokenType === 'W+') return true;

    // Check if token is relevant for this mode
    if (mode === 'priority' && !['P+', 'P+3'].includes(tokenType)) return false;
    if (mode === 'race' && tokenType !== 'R+') return false;
    if (mode === 'auction' && tokenType !== 'A+') return false;

    return true;
  };

  const isTokenSelected = (tokenType: TokenType): boolean => {
    return selectedTokens.includes(tokenType);
  };

  const getTokenCount = (tokenType: TokenType): number => {
    return availableTokens[tokenType] || 0;
  };

  const getModeLabel = (): string => {
    switch (mode) {
      case 'priority': return 'Priority Bonus';
      case 'race': return 'Movement Bonus';
      case 'auction': return 'Bid Bonus';
    }
  };

  const calculateBonus = (): number => {
    let bonus = 0;
    selectedTokens.forEach(token => {
      if (mode === 'priority' && (token === 'P+' || token === 'W+')) bonus += 1;
      if (mode === 'priority' && token === 'P+3') bonus += 3;
      if (mode === 'race' && (token === 'R+' || token === 'W+')) bonus += 1;
      if (mode === 'auction' && (token === 'A+' || token === 'W+')) bonus += 1;
    });
    return bonus;
  };

  const tokensToShow: TokenType[] = ['P+', 'P+3', 'R+', 'A+', 'W+', 'D'];

  return (
    <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold text-sm">Use Tokens</h3>
        {selectedTokens.length > 0 && (
          <div className="text-green-400 font-bold">
            {getModeLabel()}: +{calculateBonus()}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {tokensToShow.map(tokenType => {
          const count = getTokenCount(tokenType);
          const info = TOKEN_INFO[tokenType];
          const usable = canUseToken(tokenType);
          const selected = isTokenSelected(tokenType);
          const available = count > selectedTokens.filter(t => t === tokenType).length;

          if (count === 0) return null;

          return (
            <button
              key={tokenType}
              onClick={() => usable && available && onToggleToken(tokenType)}
              disabled={!usable || !available}
              className={`
                px-3 py-2 rounded-lg border-2 transition-all
                ${selected
                  ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105'
                  : usable && available
                    ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500'
                    : 'bg-gray-900 border-gray-800 text-gray-600 cursor-not-allowed'
                }
              `}
              title={info.description}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{info.emoji}</span>
                <div className="text-right">
                  <div className="text-xs font-semibold">{tokenType}</div>
                  <div className="text-xs opacity-75">×{count}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTokens.length === 0 && (
        <div className="text-gray-500 text-xs text-center mt-2">
          Click tokens to use them this turn
        </div>
      )}
    </div>
  );
};

export default TokenSelector;
