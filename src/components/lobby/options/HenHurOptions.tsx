import React from 'react';

interface HenHurOptionsProps {
  selectedVariant: string;
  selectedCardCount: number;
  totalCardCount: number;
  isLeader: boolean;
  onVariantChange: (variant: string) => void;
  onOpenCardSelection: () => void;
}

const HenHurOptions: React.FC<HenHurOptionsProps> = ({
  selectedVariant,
  selectedCardCount,
  totalCardCount,
  isLeader,
  onVariantChange,
  onOpenCardSelection,
}) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">HenHur Mode</label>
        <select
          value={selectedVariant}
          onChange={(e) => onVariantChange(e.target.value)}
          disabled={!isLeader}
          className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-lion"
        >
          <option value="standard">Standard</option>
          <option value="debug">Debug</option>
        </select>
        <p className="text-xs text-gray-400 mt-1">Standard: normal play. Debug: additional logs and controls for testing.</p>
      </div>

      {/* Card Selection Button */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Card Selection</label>
        <button
          onClick={onOpenCardSelection}
          disabled={!isLeader}
          className="w-full px-4 py-2 bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/30 rounded-lg text-amber-400 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Configure Cards ({selectedCardCount}/{totalCardCount})
        </button>
        <p className="text-xs text-gray-400 mt-1">Select which cards will be available in this game</p>
      </div>
    </>
  );
};

export default HenHurOptions;
