import React, { useState, useEffect } from 'react';

// Import ability decks data
import ABILITY_DECKS from './games/dice-factory-v0.2.1/data/abilityDecks.json';

interface AbilitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAbilityIds: string[];
  onSave: (abilityIds: string[]) => void;
}

const AbilitySelectionModal: React.FC<AbilitySelectionModalProps> = ({
  isOpen,
  onClose,
  selectedAbilityIds,
  onSave
}) => {
  const [localSelected, setLocalSelected] = useState<string[]>(selectedAbilityIds);

  // Update local state when modal opens with new selection
  useEffect(() => {
    if (isOpen) {
      setLocalSelected(selectedAbilityIds);
    }
  }, [isOpen, selectedAbilityIds]);

  if (!isOpen) return null;

  const allAbilities = [
    ...ABILITY_DECKS.tier1,
    ...ABILITY_DECKS.tier2,
    ...ABILITY_DECKS.tier3,
    ...ABILITY_DECKS.tier4
  ];

  const toggleAbility = (abilityId: string) => {
    setLocalSelected(prev =>
      prev.includes(abilityId)
        ? prev.filter(id => id !== abilityId)
        : [...prev, abilityId]
    );
  };

  const selectAll = () => {
    setLocalSelected(allAbilities.map(a => a.id));
  };

  const deselectAll = () => {
    setLocalSelected([]);
  };

  const handleSave = () => {
    onSave(localSelected);
    onClose();
  };

  const getTierColor = (tier: number) => {
    switch (tier) {
      case 1: return 'bg-sky-600';
      case 2: return 'bg-amber-700';
      case 3: return 'bg-amber-700';
      case 4: return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Configure Abilities</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>
          <p className="text-gray-400 mt-2">
            Select which abilities will be available in the game ({localSelected.length} selected)
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={selectAll}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-medium"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {[1, 2, 3, 4].map(tier => {
            const tierAbilities = allAbilities.filter(a => a.tier === tier);
            return (
              <div key={tier} className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">
                  Tier {tier}
                  <span className="text-sm text-gray-400 ml-2">
                    ({tierAbilities.filter(a => localSelected.includes(a.id)).length}/{tierAbilities.length} selected)
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {tierAbilities.map(ability => {
                    const isSelected = localSelected.includes(ability.id);
                    return (
                      <div
                        key={ability.id}
                        onClick={() => toggleAbility(ability.id)}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-all border-2
                          ${isSelected
                            ? `${getTierColor(tier)} border-white shadow-lg`
                            : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                          }
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-bold text-white text-sm">{ability.name}</div>
                            <div className="text-xs text-gray-300 mt-1">
                              Cost: {ability.costCount} {ability.costCount === 1 ? 'die' : 'dice'}
                            </div>
                          </div>
                          <div className={`
                            w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ml-2
                            ${isSelected ? 'bg-white text-gray-800' : 'bg-gray-600 text-gray-400'}
                          `}>
                            {isSelected ? '✓' : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded font-medium"
          >
            Save Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbilitySelectionModal;
