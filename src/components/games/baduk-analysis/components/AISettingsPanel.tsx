// AI Settings Panel Component
// Configure AI opponent settings (enable/disable, color, skill level)

import React, { useEffect } from 'react';
import { AIOpponentSettings, SkillLevelOption } from '../types/baduk.types';

interface AISettingsPanelProps {
  aiSettings: AIOpponentSettings;
  skillLevels: SkillLevelOption[];
  onConfigure: (settings: { enabled?: boolean; color?: 'black' | 'white'; skillLevel?: string }) => void;
  onRequestSkillLevels: () => void;
  kataGoAvailable: boolean;
  disabled?: boolean;
}

const AISettingsPanel: React.FC<AISettingsPanelProps> = ({
  aiSettings,
  skillLevels,
  onConfigure,
  onRequestSkillLevels,
  kataGoAvailable,
  disabled = false
}) => {
  // Request skill levels on mount
  useEffect(() => {
    if (skillLevels.length === 0) {
      onRequestSkillLevels();
    }
  }, [skillLevels.length, onRequestSkillLevels]);

  // Default skill levels if not loaded from server
  const defaultSkillLevels: SkillLevelOption[] = [
    { id: '30k', name: '30 Kyu (Beginner)', description: 'Just learning' },
    { id: '20k', name: '20 Kyu', description: 'DDK' },
    { id: '10k', name: '10 Kyu', description: 'Strong DDK' },
    { id: '5k', name: '5 Kyu', description: 'Mid SDK' },
    { id: '1k', name: '1 Kyu', description: 'Almost dan' },
    { id: '1d', name: '1 Dan', description: 'Amateur dan' },
    { id: '3d', name: '3 Dan', description: 'Strong amateur' },
    { id: '5d', name: '5 Dan', description: 'Very strong' },
    { id: 'max', name: 'Maximum', description: 'Full strength' }
  ];

  const levels = skillLevels.length > 0 ? skillLevels : defaultSkillLevels;

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">Play vs AI</h3>
        {aiSettings.isThinking && (
          <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded animate-pulse">
            Thinking...
          </span>
        )}
      </div>

      {/* KataGo not available message */}
      {!kataGoAvailable && (
        <div className="mb-3 p-2 bg-yellow-900/50 rounded text-xs text-yellow-400">
          AI requires KataGo to be configured on the server.
        </div>
      )}

      {/* Enable/Disable toggle */}
      <div className="mb-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={aiSettings.enabled}
            onChange={(e) => onConfigure({ enabled: e.target.checked })}
            disabled={disabled || !kataGoAvailable}
            className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
          />
          <span className="text-sm text-gray-300">Enable AI opponent</span>
        </label>
      </div>

      {/* AI Color selection */}
      {aiSettings.enabled && (
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">AI plays as:</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onConfigure({ color: 'black' })}
              disabled={disabled}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                aiSettings.color === 'black'
                  ? 'bg-gray-900 text-white border-2 border-blue-500'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-600" />
                Black
              </div>
            </button>
            <button
              type="button"
              onClick={() => onConfigure({ color: 'white' })}
              disabled={disabled}
              className={`flex-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                aiSettings.color === 'white'
                  ? 'bg-white text-gray-900 border-2 border-blue-500'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white border border-gray-300" />
                White
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Skill Level selection */}
      {aiSettings.enabled && (
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">Skill level:</label>
          <select
            value={aiSettings.skillLevel}
            onChange={(e) => onConfigure({ skillLevel: e.target.value })}
            disabled={disabled}
            className="w-full px-3 py-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.name}
              </option>
            ))}
          </select>
          {levels.find(l => l.id === aiSettings.skillLevel) && (
            <p className="mt-1 text-xs text-gray-500">
              {levels.find(l => l.id === aiSettings.skillLevel)?.description}
            </p>
          )}
        </div>
      )}

      {/* Info text */}
      {aiSettings.enabled && (
        <div className="text-xs text-gray-500">
          <p>
            You play as {aiSettings.color === 'black' ? 'White' : 'Black'}.
            The AI will automatically respond to your moves.
          </p>
        </div>
      )}

      {/* Thinking indicator when AI is thinking */}
      {aiSettings.enabled && aiSettings.isThinking && (
        <div className="mt-3 flex items-center gap-2 text-sm text-blue-400">
          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          AI is thinking...
        </div>
      )}
    </div>
  );
};

export default AISettingsPanel;
