import React, { useState } from 'react';
import { CharacterToken, CharacterState } from '../types';
import { CHARACTER_DATA } from '../data/characterStats';

interface CharacterCardProps {
  character: CharacterToken;
  isOwnedByPlayer: boolean;
  onStatsUpdate: (characterId: string, updatedStats: CharacterToken['stats']) => void;
  onStateUpdate: (characterId: string, newState: CharacterState) => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, isOwnedByPlayer, onStatsUpdate, onStateUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStats, setEditedStats] = useState(character.stats);

  const characterInfo = CHARACTER_DATA[character.role];

  const handleSave = () => {
    onStatsUpdate(character.id, editedStats);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedStats(character.stats);
    setIsEditing(false);
  };

  const handleStatChange = (stat: keyof CharacterToken['stats'], value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setEditedStats(prev => ({
        ...prev,
        [stat]: numValue,
      }));
    }
  };

  const StatCell = ({ label, value, editValue, statKey }: {
    label: string;
    value: number;
    editValue: number;
    statKey: keyof CharacterToken['stats'];
  }) => (
    <div className="text-center">
      <div className="text-gray-400 text-xs font-medium mb-1">{label}</div>
      {isEditing ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => handleStatChange(statKey, e.target.value)}
          className="w-full px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm text-center"
        />
      ) : (
        <div className="text-white text-sm font-bold">{value}</div>
      )}
    </div>
  );

  const handleWoundChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      const updatedStats = {
        ...character.stats,
        wounds: Math.min(Math.max(0, numValue), character.stats.maxWounds),
      };
      onStatsUpdate(character.id, updatedStats);
    }
  };

  return (
    <div
      className="bg-gray-900 border-2 rounded-lg p-4 shadow-lg min-w-[300px]"
      style={{ borderColor: character.color }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <div>
          <h3 className="text-lg font-bold" style={{ color: character.color }}>
            {character.role}
          </h3>
          <p className="text-xs text-gray-500">{character.name}</p>
        </div>
        {isOwnedByPlayer && (
          <div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats - Two Rows */}
      <div className="space-y-2">
        {/* Row 1: Wounds, Movement, and State */}
        <div className="flex items-center gap-2">
          {/* Wounds - always editable */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs font-medium">W:</span>
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                value={character.stats.wounds}
                onChange={(e) => handleWoundChange(e.target.value)}
                className="w-8 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-center"
                min="0"
                max={character.stats.maxWounds}
              />
              <span className="text-gray-500 text-xs">/</span>
              {isEditing ? (
                <input
                  type="number"
                  value={editedStats.maxWounds}
                  onChange={(e) => handleStatChange('maxWounds', e.target.value)}
                  className="w-8 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-center"
                />
              ) : (
                <span className="text-white text-xs font-bold">{character.stats.maxWounds}</span>
              )}
            </div>
          </div>

          {/* Movement */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs font-medium">M:</span>
            {isEditing ? (
              <input
                type="number"
                value={editedStats.movement}
                onChange={(e) => handleStatChange('movement', e.target.value)}
                className="w-12 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-center"
              />
            ) : (
              <span className="text-white text-xs font-bold">{character.stats.movement}</span>
            )}
          </div>

          {/* State */}
          <div className="flex items-center gap-1 flex-1">
            <span className="text-gray-400 text-xs font-medium">S:</span>
            <select
              value={character.state}
              onChange={(e) => onStateUpdate(character.id, e.target.value as CharacterState)}
              className="flex-1 min-w-0 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs"
            >
              <option value="Overt">Overt</option>
              <option value="Hidden">Hidden</option>
              <option value="Disguised">Disguised</option>
            </select>
          </div>
        </div>

        {/* Row 2: MS, BS, D, H, C */}
        <div className="grid grid-cols-5 gap-2">
          <StatCell label="MS" value={character.stats.meleeSkill} editValue={editedStats.meleeSkill} statKey="meleeSkill" />
          <StatCell label="BS" value={character.stats.ballisticSkill} editValue={editedStats.ballisticSkill} statKey="ballisticSkill" />
          <StatCell label="D" value={character.stats.defense} editValue={editedStats.defense} statKey="defense" />
          <StatCell label="H" value={character.stats.hack} editValue={editedStats.hack} statKey="hack" />
          <StatCell label="C" value={character.stats.con} editValue={editedStats.con} statKey="con" />
        </div>
      </div>

      {/* Equipment Slots */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Equipment</h4>
        <div className="space-y-1">
          {[1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="h-6 bg-gray-800 border border-gray-700 rounded text-xs text-gray-500 flex items-center justify-center"
            >
              Slot {slot}
            </div>
          ))}
        </div>
      </div>

      {/* Abilities (Always Visible) */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Abilities</h4>
        <div className="space-y-2">
          {characterInfo.abilities.map((ability, index) => (
            <div key={index} className="bg-gray-800 p-2 rounded">
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs font-bold text-white">{ability.name}</span>
                <span className="text-xs text-purple-400 font-semibold">
                  {ability.actionCost} Action{ability.actionCost > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-xs text-gray-400">{ability.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;
