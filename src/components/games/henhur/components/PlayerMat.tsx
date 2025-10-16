import React from 'react';

interface PlayerMatProps {
  deckInfo?: {
    hand: any[];
    deckCount: number;
    discardCount: number;
    stats: {
      deckCount: number;
      handCount: number;
      discardCount: number;
      totalCount: number;
    };
  };
}

const PlayerMat: React.FC<PlayerMatProps> = ({ deckInfo }) => {
  if (!deckInfo) {
    return (
      <div className="w-full h-32 bg-amber-50 border-4 border-amber-300 rounded-lg flex items-center justify-center mt-6">
        <span className="text-xl text-amber-600 font-bold">Waiting for game data...</span>
      </div>
    );
  }

  const { stats } = deckInfo;

  return (
    <div className="w-full bg-amber-50 border-4 border-amber-300 rounded-lg p-4 mt-6">
      <h3 className="text-xl text-amber-800 font-bold mb-3">Your Deck</h3>

      <div className="grid grid-cols-4 gap-3">
        {/* Deck */}
        <div className="bg-white rounded-lg border-2 border-amber-400 p-3 text-center">
          <div className="text-3xl font-bold text-amber-700">{stats.deckCount}</div>
          <div className="text-xs text-amber-600 font-semibold mt-1">In Deck</div>
        </div>

        {/* Hand */}
        <div className="bg-white rounded-lg border-2 border-amber-400 p-3 text-center">
          <div className="text-3xl font-bold text-amber-700">{stats.handCount}</div>
          <div className="text-xs text-amber-600 font-semibold mt-1">In Hand</div>
        </div>

        {/* Discard */}
        <div className="bg-white rounded-lg border-2 border-amber-400 p-3 text-center">
          <div className="text-3xl font-bold text-amber-700">{stats.discardCount}</div>
          <div className="text-xs text-amber-600 font-semibold mt-1">Discard</div>
        </div>

        {/* Total */}
        <div className="bg-amber-400 rounded-lg border-2 border-amber-600 p-3 text-center">
          <div className="text-3xl font-bold text-white">{stats.totalCount}</div>
          <div className="text-xs text-white font-semibold mt-1">Total Cards</div>
        </div>
      </div>
    </div>
  );
};

export default PlayerMat;
