import React from 'react';

interface KillTeamDraftOptionsProps {
  packSize: number;
  totalPacks: number;
  playerCount: number;
  isLeader: boolean;
  onPackSizeChange: (size: number) => void;
  onTotalPacksChange: (packs: number) => void;
}

const KillTeamDraftOptions: React.FC<KillTeamDraftOptionsProps> = ({
  packSize,
  totalPacks,
  playerCount,
  isLeader,
  onPackSizeChange,
  onTotalPacksChange,
}) => {
  if (!isLeader) return null;

  const totalCardsNeeded = playerCount * packSize * totalPacks;

  return (
    <div className="mb-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Pack Size</label>
        <input
          type="number"
          min="3"
          max="30"
          value={packSize}
          onChange={(e) => onPackSizeChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
        />
        <p className="text-xs text-gray-400 mt-1">Number of cards in each pack</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Total Packs</label>
        <input
          type="number"
          min="1"
          max="10"
          value={totalPacks}
          onChange={(e) => onTotalPacksChange(parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
        />
        <p className="text-xs text-gray-400 mt-1">Number of packs each player will draft from</p>
      </div>

      <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded">
        <div className="text-sm text-gray-300">
          <strong>Total cards needed:</strong> {playerCount} players x {packSize} cards x {totalPacks} packs = {totalCardsNeeded} cards
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Available: 100 unique placeholder cards (A-E, 1-20)
          {totalCardsNeeded > 100 && (
            <span className="text-yellow-400"> Warning: Will generate duplicates</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default KillTeamDraftOptions;
