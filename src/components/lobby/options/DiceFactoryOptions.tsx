import React from 'react';

interface DiceFactoryOptionsProps {
  selectedVariant: string;
  selectedAbilityCount: number;
  isLeader: boolean;
  onVariantChange: (variant: string) => void;
  onOpenAbilitySelection: () => void;
}

const DiceFactoryOptions: React.FC<DiceFactoryOptionsProps> = ({
  selectedVariant,
  selectedAbilityCount,
  isLeader,
  onVariantChange,
  onOpenAbilitySelection,
}) => {
  if (!isLeader) return null;

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        Game Version
      </label>
      <div className="flex gap-2">
        <select
          value={selectedVariant}
          onChange={(e) => onVariantChange(e.target.value)}
          className="flex-1 px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
        >
          <option value="v0.1.5">v0.1.5</option>
          <option value="v0.2.1">v0.2.1</option>
        </select>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        <strong>v0.1.5:</strong> Full game with factory mods, effects, and auctions. 11 rounds, no collapse.<br />
        <strong>v0.2.1:</strong> Slot-based ability system. Take 2 actions per turn, first to 10 VP wins.
      </div>

      {/* v0.2.1 Ability Selection */}
      {selectedVariant === 'v0.2.1' && (
        <div className="mt-3">
          <button
            onClick={onOpenAbilitySelection}
            className="w-full px-4 py-2 bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/30 rounded-lg text-cyan-400 font-medium transition-colors"
          >
            Configure Abilities ({selectedAbilityCount} selected)
          </button>
          <p className="text-xs text-gray-400 mt-1">Select which abilities will be available in this game</p>
        </div>
      )}
    </div>
  );
};

export default DiceFactoryOptions;
