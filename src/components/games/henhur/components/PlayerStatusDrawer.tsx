import React, { useState } from 'react';
import { PlayerPublicState, TokenPool, BurnSlot } from '../types/game.types';

interface PlayerStatusDrawerProps {
  players?: PlayerPublicState[];
  readyPlayers?: string[];
}

const PlayerStatusDrawer: React.FC<PlayerStatusDrawerProps> = ({
  players = [],
  readyPlayers = []
}) => {
  const [open, setOpen] = useState(true);

  // Get token display - only show tokens with count > 0
  const getActiveTokens = (tokens: TokenPool) => {
    return (Object.entries(tokens) as [string, number][])
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => ({ type, count }));
  };

  // Get burn slot status
  const getBurnSlotStatus = (burnSlots: BurnSlot[]) => {
    const filled = burnSlots.filter(s => s.card !== null).length;
    return { filled, total: burnSlots.length };
  };

  return (
    <>
      <div
        className={`fixed right-0 w-72 bg-gray-800 border-l-2 border-amber-400 shadow-lg z-40 flex flex-col transition-transform duration-300`}
        style={{ top: '72px', height: 'calc(100vh - 72px - 280px)', transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <button
          className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-full z-0 bg-amber-400 text-gray-900 px-2 py-2 rounded-l-lg shadow-lg focus:outline-none font-bold"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Hide player drawer' : 'Show player drawer'}
        >
          {open ? '>' : '<'}
        </button>

        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-amber-400">Players ({players.length})</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {players.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">No other players</div>
          ) : (
            players.map(player => {
              const isReady = readyPlayers.includes(player.playerId);
              const activeTokens = getActiveTokens(player.tokens);
              const burnStatus = getBurnSlotStatus(player.burnSlots);

              return (
                <div
                  key={player.playerId}
                  className={`bg-gray-900 rounded-lg p-3 border ${
                    isReady ? 'border-green-500' : player.isConnected ? 'border-gray-700' : 'border-red-500/50'
                  }`}
                >
                  {/* Player Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${player.isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className="font-semibold text-white">{player.playerName}</span>
                      {isReady && <span className="text-green-400 text-xs">Ready</span>}
                    </div>
                  </div>

                  {/* Position */}
                  <div className="bg-gray-800 rounded p-2 mb-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Position:</span>
                      <span className="text-white font-medium">
                        Lap {player.position.lap} - Space {player.position.space}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Moved {player.distanceMoved} total
                    </div>
                  </div>

                  {/* Burn Slots */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">Burn:</span>
                    <div className="flex gap-1">
                      {player.burnSlots.map((slot, idx) => (
                        <div
                          key={idx}
                          className={`w-5 h-5 rounded border ${
                            slot.card ? 'bg-orange-600 border-orange-400' : 'bg-gray-700 border-gray-600'
                          }`}
                          title={slot.card ? slot.card.title : 'Empty'}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      ({burnStatus.filled}/{burnStatus.total})
                    </span>
                  </div>

                  {/* Tokens */}
                  {activeTokens.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {activeTokens.map(({ type, count }) => (
                        <span
                          key={type}
                          className="px-1.5 py-0.5 bg-amber-600/30 border border-amber-500 rounded text-xs text-amber-300"
                        >
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Card Counts */}
                  <div className="grid grid-cols-3 gap-1 text-xs text-center">
                    <div className="bg-gray-800 rounded p-1">
                      <div className="text-gray-500">Hand</div>
                      <div className="text-white font-medium">{player.handCount}</div>
                    </div>
                    <div className="bg-gray-800 rounded p-1">
                      <div className="text-gray-500">Deck</div>
                      <div className="text-white font-medium">{player.deckCount}</div>
                    </div>
                    <div className="bg-gray-800 rounded p-1">
                      <div className="text-gray-500">Discard</div>
                      <div className="text-white font-medium">{player.discardCount}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

export default PlayerStatusDrawer;
