import React, { useState, useMemo } from 'react';
import { CharacterToken, CharacterState, EquipmentItem, CharacterStats } from '../types';
import { CHARACTER_DATA } from '../data/characters';
import { getAllEquipment, getEquipmentByIds, getEquipmentStatBonuses } from '../data/equipmentLoader';

interface CharacterCardProps {
  character: CharacterToken;
  isOwnedByPlayer: boolean;
  onStatsUpdate: (characterId: string, updatedStats: CharacterToken['stats']) => void;
  onStateUpdate: (characterId: string, newState: CharacterState) => void;
  onEquipmentUpdate: (characterId: string, equipment: string[]) => void;
  onExperienceUpdate?: (characterId: string, experience: number) => void;
}

/**
 * Calculate level from experience points
 * Level 1: 0-5 XP
 * Level 2: 6-14 XP
 * Level 3: 15-25 XP
 * Level 4+: Every 15 XP thereafter
 */
function calculateLevel(experience: number): number {
  if (experience <= 5) return 1;
  if (experience <= 14) return 2;
  if (experience <= 25) return 3;
  // After level 3, new levels every 15 XP (26-40 = L4, 41-55 = L5, etc.)
  return 4 + Math.floor((experience - 26) / 15);
}

/**
 * Get XP thresholds for a level
 */
function getLevelThresholds(level: number): { min: number; max: number } {
  if (level === 1) return { min: 0, max: 5 };
  if (level === 2) return { min: 6, max: 14 };
  if (level === 3) return { min: 15, max: 25 };
  // Level 4+: starts at 26, each level is 15 XP
  const min = 26 + (level - 4) * 15;
  const max = min + 14;
  return { min, max };
}

const CharacterCard: React.FC<CharacterCardProps> = ({ character, isOwnedByPlayer, onStatsUpdate, onStateUpdate, onEquipmentUpdate, onExperienceUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedStats, setEditedStats] = useState(character.stats);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [equipmentSearch, setEquipmentSearch] = useState('');

  const characterInfo = CHARACTER_DATA[character.role];
  const baseStats = characterInfo.stats;
  const allEquipment = getAllEquipment();
  const equippedItems = getEquipmentByIds(character.equipment || []);

  // Calculate equipment bonuses and effective stats
  const equipmentBonuses = useMemo(
    () => getEquipmentStatBonuses(character.equipment || []),
    [character.equipment]
  );

  // Effective stats = current stats + equipment bonuses
  const effectiveStats: CharacterStats = useMemo(() => ({
    movement: character.stats.movement + (equipmentBonuses.movement || 0),
    meleeSkill: character.stats.meleeSkill + (equipmentBonuses.meleeSkill || 0),
    ballisticSkill: character.stats.ballisticSkill + (equipmentBonuses.ballisticSkill || 0),
    wounds: character.stats.wounds, // Current wounds not affected by equipment
    maxWounds: character.stats.maxWounds + (equipmentBonuses.maxWounds || 0),
    defense: character.stats.defense + (equipmentBonuses.defense || 0),
    hack: character.stats.hack + (equipmentBonuses.hack || 0),
    con: character.stats.con + (equipmentBonuses.con || 0),
  }), [character.stats, equipmentBonuses]);

  // Helper to get stat modification info
  // For "lower is better" stats (MS, BS, D, H, C): green if improved (lower), red if worse (higher)
  // For "higher is better" stats (W, M): green if improved (higher), red if worse (lower)
  const getStatModification = (
    currentValue: number,
    baseValue: number,
    lowerIsBetter: boolean
  ): { color: string; indicator: string } | null => {
    if (currentValue === baseValue) {
      return null; // No modification
    }

    const isImproved = lowerIsBetter
      ? currentValue < baseValue
      : currentValue > baseValue;

    return {
      color: isImproved ? 'text-green-400' : 'text-red-400',
      indicator: isImproved ? '(+)' : '(-)',
    };
  };

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

  const StatCell = ({ label, value, editValue, statKey, baseValue, lowerIsBetter = true }: {
    label: string;
    value: number;
    editValue: number;
    statKey: keyof CharacterToken['stats'];
    baseValue: number;
    lowerIsBetter?: boolean;
  }) => {
    const modification = getStatModification(value, baseValue, lowerIsBetter);

    return (
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
          <div className={`text-sm font-bold ${modification ? modification.color : 'text-white'}`}>
            {value}{modification ? ` ${modification.indicator}` : ''}
          </div>
        )}
      </div>
    );
  };

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

  const handleEquipItem = (slot: number, itemId: string) => {
    const currentEquipment = character.equipment || [];
    const newEquipment = [...currentEquipment];
    newEquipment[slot] = itemId;
    onEquipmentUpdate(character.id, newEquipment);
    setShowEquipmentSelector(false);
    setSelectedSlot(null);
    setEquipmentSearch('');
  };

  const handleRemoveItem = (slot: number) => {
    const currentEquipment = character.equipment || [];
    const newEquipment = currentEquipment.filter((_, index) => index !== slot);
    onEquipmentUpdate(character.id, newEquipment);
  };

  const openEquipmentSelector = (slot: number) => {
    setSelectedSlot(slot);
    setShowEquipmentSelector(true);
  };

  const renderEquipmentStats = (item: EquipmentItem) => {
    const parts: string[] = [];

    if (item.type === 'Ranged' || item.type === 'Melee') {
      if (item.Attacks) parts.push(`Att: ${item.Attacks}`);
      if (item.Damage) parts.push(`Dmg: ${item.Damage}`);
      if (item.Range) parts.push(`Rng: ${item.Range}`);
    }

    if (item.type === 'Thrown') {
      if (item.Range) parts.push(`Rng: ${item.Range}`);
      if (item.Size) parts.push(`Size: ${item.Size}`);
      if (item.Damage) parts.push(`Dmg: ${item.Damage}`);
    }

    return parts.join(' • ');
  };

  return (
    <div
      className="bg-gray-900 border-2 rounded-lg p-4 shadow-lg min-w-[300px]"
      style={{
        borderColor: character.color,
        opacity: character.exhausted ? 0.6 : 1,
        filter: character.exhausted ? 'grayscale(0.7)' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold" style={{ color: character.color }}>
              {character.role}
            </h3>
            <p className="text-xs text-gray-500">{character.name}</p>
          </div>
          {/* Level Badge */}
          <div className="flex items-center gap-2">
            <div
              className="px-2 py-1 bg-purple-700 rounded text-white text-xs font-bold"
              title={`Level ${calculateLevel(character.experience || 0)}`}
            >
              L{calculateLevel(character.experience || 0)}
            </div>
            {/* XP Counter */}
            <div className="flex items-center gap-1">
              {onExperienceUpdate && (
                <button
                  onClick={() => onExperienceUpdate(character.id, Math.max(0, (character.experience || 0) - 1))}
                  className="w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex items-center justify-center"
                  title="Decrease XP"
                >
                  −
                </button>
              )}
              <div
                className="px-2 py-1 bg-gray-800 rounded text-amber-400 text-xs font-medium min-w-[40px] text-center"
                title={`${character.experience || 0} XP - Next level at ${getLevelThresholds(calculateLevel(character.experience || 0) + 1).min} XP`}
              >
                {character.experience || 0} XP
              </div>
              {onExperienceUpdate && (
                <button
                  onClick={() => onExperienceUpdate(character.id, (character.experience || 0) + 1)}
                  className="w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded flex items-center justify-center"
                  title="Increase XP"
                >
                  +
                </button>
              )}
            </div>
          </div>
        </div>
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
      </div>

      {/* Stats - Two Rows */}
      <div className="space-y-2">
        {/* Row 1: Wounds, Movement, and State */}
        <div className="flex items-center gap-2">
          {/* Wounds - always editable (higher maxWounds is better) */}
          <div className="flex items-center gap-1">
            <span className="text-gray-400 text-xs font-medium">W:</span>
            <div className="flex items-center gap-0.5">
              <input
                type="number"
                value={character.stats.wounds}
                onChange={(e) => handleWoundChange(e.target.value)}
                className="w-8 px-1 py-1 bg-gray-800 border border-gray-600 rounded text-white text-xs text-center"
                min="0"
                max={effectiveStats.maxWounds}
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
                (() => {
                  const maxWoundsMod = getStatModification(effectiveStats.maxWounds, baseStats.maxWounds, false);
                  return (
                    <span className={`text-xs font-bold ${maxWoundsMod ? maxWoundsMod.color : 'text-white'}`}>
                      {effectiveStats.maxWounds}{maxWoundsMod ? ` ${maxWoundsMod.indicator}` : ''}
                    </span>
                  );
                })()
              )}
            </div>
          </div>

          {/* Movement (higher is better) */}
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
              (() => {
                const movementMod = getStatModification(effectiveStats.movement, baseStats.movement, false);
                return (
                  <span className={`text-xs font-bold ${movementMod ? movementMod.color : 'text-white'}`}>
                    {effectiveStats.movement}{movementMod ? ` ${movementMod.indicator}` : ''}
                  </span>
                );
              })()
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
              <option value="Stunned">Stunned</option>
              <option value="Unconscious">Unconscious</option>
            </select>
          </div>
        </div>

        {/* Row 2: MS, BS, D, H, C (lower is better for all) - displays effective stats with equipment bonuses */}
        <div className="grid grid-cols-5 gap-2">
          <StatCell label="MS" value={effectiveStats.meleeSkill} editValue={editedStats.meleeSkill} statKey="meleeSkill" baseValue={baseStats.meleeSkill} lowerIsBetter={true} />
          <StatCell label="BS" value={effectiveStats.ballisticSkill} editValue={editedStats.ballisticSkill} statKey="ballisticSkill" baseValue={baseStats.ballisticSkill} lowerIsBetter={true} />
          <StatCell label="D" value={effectiveStats.defense} editValue={editedStats.defense} statKey="defense" baseValue={baseStats.defense} lowerIsBetter={true} />
          <StatCell label="H" value={effectiveStats.hack} editValue={editedStats.hack} statKey="hack" baseValue={baseStats.hack} lowerIsBetter={true} />
          <StatCell label="C" value={effectiveStats.con} editValue={editedStats.con} statKey="con" baseValue={baseStats.con} lowerIsBetter={true} />
        </div>
      </div>

      {/* Equipment Slots */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">
          Equipment
          {(equipmentBonuses.inventorySlots || 0) > 0 && (
            <span className="text-green-400 ml-1">
              ({3 + (equipmentBonuses.inventorySlots || 0)} slots)
            </span>
          )}
        </h4>
        <div className="space-y-1">
          {Array.from({ length: 3 + (equipmentBonuses.inventorySlots || 0) }, (_, i) => i).map((slot) => {
            const equippedItem = equippedItems[slot];

            // Determine background color based on item type
            const getItemBgColor = (type: string) => {
              switch (type) {
                case 'Ranged': return 'bg-yellow-900/30 border-yellow-600/50';
                case 'Melee': return 'bg-green-900/30 border-green-600/50';
                case 'Thrown': return 'bg-orange-900/30 border-orange-600/50';
                case 'Tool': return 'bg-gray-800/50 border-gray-600/50';
                default: return 'bg-gray-800 border-gray-600';
              }
            };

            // Format stats for display
            const renderItemDetails = (item: EquipmentItem) => {
              const parts: string[] = [];

              if (item.type === 'Ranged') {
                // Ranged: Att, Dmg, Rng, notices, specials
                if (item.Attacks) parts.push(`Att:${item.Attacks}`);
                if (item.Damage) parts.push(`Dmg:${item.Damage}`);
                if (item.Range) parts.push(`Rng:${item.Range}`);

                const notices = [];
                if (item.Notice?.Hidden) notices.push('Hidden');
                if (item.Notice?.Disguised) notices.push('Disguised');
                if (notices.length > 0) parts.push(notices.join('/'));

                if (item.Special && Object.keys(item.Special).length > 0) {
                  parts.push(Object.keys(item.Special).join(', '));
                }
              } else if (item.type === 'Melee') {
                // Melee: Att, Dmg, notices, specials
                if (item.Attacks) parts.push(`Att:${item.Attacks}`);
                if (item.Damage) parts.push(`Dmg:${item.Damage}`);

                const notices = [];
                if (item.Notice?.Hidden) notices.push('Hidden');
                if (item.Notice?.Disguised) notices.push('Disguised');
                if (notices.length > 0) parts.push(notices.join('/'));

                if (item.Special && Object.keys(item.Special).length > 0) {
                  parts.push(Object.keys(item.Special).join(', '));
                }
              } else if (item.type === 'Thrown') {
                // Thrown: Rng, size, notices, description
                if (item.Range) parts.push(`Rng:${item.Range}`);
                if (item.Size) parts.push(`Size:${item.Size}`);

                const notices = [];
                if (item.Notice?.Hidden) notices.push('Hidden');
                if (item.Notice?.Disguised) notices.push('Disguised');
                if (notices.length > 0) parts.push(notices.join('/'));

                if (item.Description) parts.push(item.Description);
              } else if (item.type === 'Tool') {
                // Tool: description only
                if (item.Description) parts.push(item.Description);
              }

              return parts.join(' • ');
            };

            return (
              <div key={slot} className="relative">
                {equippedItem ? (
                  <div className={`border rounded p-2 ${getItemBgColor(equippedItem.type)}`}>
                    <div className="flex justify-between items-start mb-1">
                      <div className="text-xs font-bold text-white truncate flex-1">{equippedItem.id}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-amber-400">{equippedItem.Cost}</span>
                        <button
                          onClick={() => handleRemoveItem(slot)}
                          className="text-red-400 hover:text-red-300 text-xs leading-none"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <div className="text-[10px] text-gray-300 leading-relaxed">
                      {renderItemDetails(equippedItem)}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => openEquipmentSelector(slot)}
                    className="w-full h-8 border border-dashed rounded text-xs flex items-center justify-center border-gray-600 text-gray-500 hover:border-gray-500 hover:text-gray-400 cursor-pointer"
                  >
                    + Add Equipment
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment Selector Modal */}
      {showEquipmentSelector && selectedSlot !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border-2 border-purple-500 rounded-lg p-4 max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Select Equipment</h3>
              <button
                onClick={() => {
                  setShowEquipmentSelector(false);
                  setSelectedSlot(null);
                  setEquipmentSearch('');
                }}
                className="text-gray-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* Search Input */}
            <div className="mb-4">
              <input
                type="text"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                placeholder="Search equipment..."
                autoFocus
                className="w-full px-3 py-2 bg-gray-800 border border-purple-500/50 rounded text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-2 overflow-y-auto flex-1">
              {allEquipment
                .filter((item) => {
                  if (!equipmentSearch) return true;
                  const search = equipmentSearch.toLowerCase();
                  return (
                    item.id.toLowerCase().includes(search) ||
                    item.type.toLowerCase().includes(search) ||
                    (item.Description?.toLowerCase().includes(search) ?? false)
                  );
                })
                .map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleEquipItem(selectedSlot, item.id)}
                  className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded p-3 text-left transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{item.id}</div>
                      <div className="text-xs text-gray-400 mt-1">{item.type} • Cost: {item.Cost}</div>
                      {renderEquipmentStats(item) && (
                        <div className="text-xs text-blue-400 mt-1">{renderEquipmentStats(item)}</div>
                      )}
                      {item.Description && (
                        <div className="text-xs text-gray-500 mt-1 italic">{item.Description}</div>
                      )}
                      {(item.Notice?.Hidden || item.Notice?.Disguised) && (
                        <div className="text-xs text-green-400 mt-1">
                          {item.Notice.Hidden && 'Hidden'}
                          {item.Notice.Hidden && item.Notice.Disguised && ' • '}
                          {item.Notice.Disguised && 'Disguised'}
                        </div>
                      )}
                      {item.Special && Object.keys(item.Special).length > 0 && (
                        <div className="text-xs text-yellow-400 mt-1">
                          Special: {Object.keys(item.Special).join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
