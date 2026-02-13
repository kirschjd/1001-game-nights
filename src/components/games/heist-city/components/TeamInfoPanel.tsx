import React, { useMemo } from 'react';
import { CharacterToken } from '../types';
import { getEquipmentByIds } from '../data/equipmentLoader';

interface TeamInfoPanelProps {
  playerNumber: 1 | 2;
  playerName: string;
  characters: CharacterToken[];
  onVPUpdate: (characterId: string, victoryPoints: number) => void;
  onShowLoadoutModal: (type: 'save' | 'load' | 'export') => void;
}

const TeamInfoPanel: React.FC<TeamInfoPanelProps> = ({
  playerNumber,
  playerName,
  characters,
  onVPUpdate,
  onShowLoadoutModal,
}) => {
  const color = playerNumber === 1 ? 'blue' : 'red';

  const victoryPoints = useMemo(() =>
    characters.reduce((total, char) => total + (char.victoryPoints || 0), 0),
    [characters]
  );

  const gearPoints = useMemo(() =>
    characters.reduce((total, char) => {
      const equipment = getEquipmentByIds(char.equipment || []);
      return total + equipment.reduce((sum, item) => sum + item.Cost, 0);
    }, 0),
    [characters]
  );

  return (
    <>
      {/* Victory Points - Per Character */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className={`text-${color}-400 text-sm font-semibold`}>{playerName} VP:</span>
          <span className={`text-${color}-400 text-lg font-bold`}>{victoryPoints}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {characters.map(char => (
            <div key={char.id} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded">
              <span className="text-gray-300 text-xs">{char.role}:</span>
              <input
                type="number"
                value={char.victoryPoints || 0}
                onChange={(e) => onVPUpdate(char.id, parseInt(e.target.value) || 0)}
                className={`w-12 px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white text-xs text-center focus:outline-none focus:ring-1 focus:ring-${color}-500`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Gear Points */}
      <div className="flex items-center justify-between">
        <span className={`text-${color}-400 text-sm font-semibold`}>{playerName} Gear Points:</span>
        <span className="text-amber-400 text-sm font-bold">{gearPoints}</span>
      </div>

      {/* Equipment Loadout Buttons */}
      <div className="flex items-center gap-2">
        <span className={`text-${color}-400 text-xs w-16`}>{playerName}:</span>
        <button
          onClick={() => onShowLoadoutModal('save')}
          className={`px-2 py-1 text-xs bg-${color}-600 hover:bg-${color}-700 text-white rounded`}
        >
          Save
        </button>
        <button
          onClick={() => onShowLoadoutModal('load')}
          className={`px-2 py-1 text-xs bg-${color}-600 hover:bg-${color}-700 text-white rounded`}
        >
          Load
        </button>
        <button
          onClick={() => onShowLoadoutModal('export')}
          className={`px-2 py-1 text-xs bg-${color}-600 hover:bg-${color}-700 text-white rounded`}
        >
          Export
        </button>
      </div>
    </>
  );
};

export default TeamInfoPanel;
