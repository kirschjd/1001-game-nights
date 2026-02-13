import React, { useState } from 'react';
import { CharacterToken as CharacterTokenType } from '../types';
import {
  getStateInfo,
  canSelectAction,
  getActionCostDisplay,
  getActionDescription,
  getAvailableActions,
  isContinuationSlot,
  assignAction,
} from '../data/characters';

interface CharacterSelectionPanelProps {
  character: CharacterTokenType;
  onActionUpdate?: (characterId: string, actions: string[]) => void;
  onExhaustToggle?: (characterId: string) => void;
}

const CharacterSelectionPanel: React.FC<CharacterSelectionPanelProps> = ({
  character,
  onActionUpdate,
  onExhaustToggle,
}) => {
  const [expandedActionSlots, setExpandedActionSlots] = useState<Set<number>>(new Set());

  const handleActionChange = (slotIndex: number, actionName: string) => {
    if (!onActionUpdate) return;
    const newActions = assignAction(character.actions || [], slotIndex, actionName);
    onActionUpdate(character.id, newActions);
  };

  const stateInfo = getStateInfo(character.state);

  return (
    <div className="bg-purple-900/30 border border-purple-500/50 p-4 rounded-lg">
      {/* Name and Position Header */}
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-bold text-white">{character.name}</h3>
        <span className="text-xs text-gray-400">
          ({character.position.x.toFixed(1)}", {character.position.y.toFixed(1)}")
        </span>
      </div>

      {/* Character Stats Summary */}
      <div className="mb-3 p-2 bg-gray-800/50 rounded">
        <p className="text-xs font-semibold text-purple-400 mb-1">Stats:</p>
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">W:</span>
            <span className="text-white font-semibold">{character.stats.wounds}/{character.stats.maxWounds}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">M:</span>
            <span className="text-white font-semibold">{character.stats.movement}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">MS:</span>
            <span className="text-white font-semibold">{character.stats.meleeSkill}+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">BS:</span>
            <span className="text-white font-semibold">{character.stats.ballisticSkill}+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">D:</span>
            <span className="text-white font-semibold">{character.stats.defense}+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">H:</span>
            <span className="text-white font-semibold">{character.stats.hack}+</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">C:</span>
            <span className="text-white font-semibold">{character.stats.con}+</span>
          </div>
        </div>
      </div>

      {/* Character State Section */}
      <div className="mb-3 p-2 bg-gray-800/50 rounded">
        <div className="flex justify-between items-center mb-1">
          <p className="text-xs font-semibold text-purple-400">State:</p>
          <span className={`text-xs font-bold ${stateInfo.color}`}>{stateInfo.name}</span>
        </div>
        <div className="space-y-1">
          {stateInfo.abilities.map((ability, idx) => (
            <div key={idx} className="text-xs">
              <span className="text-xs text-gray-300 mb-1">{ability.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions Section */}
      <div className="space-y-2 mb-3">
        <p className="text-xs font-semibold text-purple-400">Actions:</p>

        {[0, 1, 2].map((slotIndex) => {
          const currentAction = character.actions?.[slotIndex] || '';
          const availableActions = getAvailableActions(character);
          const isContinuation = isContinuationSlot(character.actions || [], slotIndex);
          const isExpanded = expandedActionSlots.has(slotIndex);
          const actionDescription = currentAction ? getActionDescription(currentAction) : null;

          const toggleExpanded = () => {
            setExpandedActionSlots(prev => {
              const newSet = new Set(prev);
              if (newSet.has(slotIndex)) {
                newSet.delete(slotIndex);
              } else {
                newSet.add(slotIndex);
              }
              return newSet;
            });
          };

          if (isContinuation) {
            const parentAction = currentAction.replace(/^\[/, '').replace(/ cont\.]$/, '');
            return (
              <div
                key={slotIndex}
                className="w-full px-2 py-1.5 bg-gray-700 border border-yellow-500/50 rounded text-yellow-400 text-xs italic"
              >
                ↳ {parentAction} (continued)
              </div>
            );
          }

          return (
            <div key={slotIndex} className="space-y-1">
              <div className="flex gap-1">
                <select
                  value={currentAction}
                  onChange={(e) => {
                    handleActionChange(slotIndex, e.target.value);
                    setExpandedActionSlots(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(slotIndex);
                      return newSet;
                    });
                  }}
                  className="flex-1 px-2 py-1.5 bg-gray-800 border border-purple-500/30 rounded text-white text-xs hover:border-purple-500/50 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Action --</option>
                  {availableActions.map((action) => {
                    const costDisplay = getActionCostDisplay(action);
                    const canFit = canSelectAction(action, slotIndex, 3);
                    return (
                      <option
                        key={action}
                        value={action}
                        disabled={!canFit}
                        className={!canFit ? 'text-gray-500' : ''}
                      >
                        {action}{costDisplay ? ` ${costDisplay}` : ''}
                      </option>
                    );
                  })}
                </select>
                {currentAction && actionDescription && (
                  <button
                    onClick={toggleExpanded}
                    className="px-2 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors font-bold"
                    title={isExpanded ? 'Hide description' : 'Show description'}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                )}
              </div>
              {isExpanded && actionDescription && (
                <div className="px-2 py-1.5 bg-purple-900/50 border border-purple-500/30 rounded text-gray-300 text-xs italic">
                  {actionDescription}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Exhaust Button */}
      {onExhaustToggle && (
        <button
          onClick={() => onExhaustToggle(character.id)}
          className="w-full px-3 py-2 rounded-lg font-semibold text-white text-xs transition-all bg-purple-600 hover:bg-purple-700 active:scale-95"
        >
          {character.exhausted ? 'Unexhaust Character' : 'Exhaust Character'}
        </button>
      )}
    </div>
  );
};

export default CharacterSelectionPanel;
