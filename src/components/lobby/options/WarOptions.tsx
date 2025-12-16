import React from 'react';

interface WarOptionsProps {
  selectedVariant: string;
  isLeader: boolean;
  onVariantChange: (variant: string) => void;
}

const WarOptions: React.FC<WarOptionsProps> = ({
  selectedVariant,
  isLeader,
  onVariantChange,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-300 mb-2">
        War Variant
      </label>
      <select
        value={selectedVariant}
        onChange={(e) => onVariantChange(e.target.value)}
        disabled={!isLeader}
        className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-lion"
      >
        <option value="regular">Regular War</option>
        <option value="aces-high">Aces High</option>
      </select>
      <p className="text-xs text-gray-400 mt-1">
        {selectedVariant === 'aces-high'
          ? 'Aces always win, regardless of other cards'
          : 'Standard rules - highest card wins'}
      </p>
    </div>
  );
};

export default WarOptions;
