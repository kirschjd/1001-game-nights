/**
 * AdvisorPanel — Advisor Entries with Muting Controls
 */

import React from 'react';
import { AdvisorConfig, AdvisorEntry, RuleCategory, AdvisorSeverity, muteCategory, unmuteCategory } from '../engine/advisor';

export interface AdvisorPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  entries: AdvisorEntry[];
  config: AdvisorConfig;
  onConfigChange: (config: AdvisorConfig) => void;
  onClear: () => void;
}

const SEVERITY_ICONS: Record<string, { icon: string; color: string }> = {
  info: { icon: 'i', color: 'text-blue-400' },
  warning: { icon: '!', color: 'text-yellow-400' },
  error: { icon: 'x', color: 'text-red-400' },
};

const AdvisorPanel: React.FC<AdvisorPanelProps> = ({
  enabled, onToggle, entries, config, onConfigChange, onClear,
}) => {
  const mutedArray = Array.from(config.mutedCategories);

  const handleMute = (category: RuleCategory) => {
    onConfigChange(muteCategory(config, category));
  };

  const handleUnmute = (category: RuleCategory) => {
    onConfigChange(unmuteCategory(config, category));
  };

  const handleSeverityChange = (severity: AdvisorSeverity) => {
    onConfigChange({ ...config, minSeverity: severity });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white">Rules Advisor</h3>
        <div className="flex items-center gap-2">
          <select
            value={config.minSeverity}
            onChange={e => handleSeverityChange(e.target.value as AdvisorSeverity)}
            className="bg-gray-700 text-white text-[10px] rounded px-1 py-0.5 border border-gray-600"
          >
            <option value="info">All</option>
            <option value="warning">Warnings+</option>
            <option value="error">Errors</option>
          </select>
          <button
            onClick={() => onToggle(!enabled)}
            className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
              enabled
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            {enabled ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {enabled && (
        <>
          {mutedArray.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              <span className="text-[10px] text-gray-500">Muted:</span>
              {mutedArray.map(cat => (
                <span key={cat} className="bg-gray-700 text-gray-400 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  {cat}
                  <button onClick={() => handleUnmute(cat)} className="text-gray-500 hover:text-white">x</button>
                </span>
              ))}
            </div>
          )}

          <div className="space-y-1 max-h-40 overflow-y-auto mb-2">
            {entries.length === 0 ? (
              <div className="text-xs text-gray-500 italic">No advisories</div>
            ) : (
              entries.map(entry => {
                const sev = SEVERITY_ICONS[entry.severity] || SEVERITY_ICONS.info;
                return (
                  <div key={entry.id} className="bg-gray-900 rounded px-2 py-1.5 text-xs">
                    <div className="flex items-start gap-1.5">
                      <span className={`${sev.color} font-bold text-[10px] mt-0.5`}>{sev.icon}</span>
                      <div className="flex-1">
                        <div className="text-gray-200">{entry.message}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <button
                            onClick={() => handleMute(entry.category)}
                            className="text-[10px] text-gray-500 hover:text-gray-300"
                          >
                            {entry.category}
                          </button>
                          <span className="text-[10px] text-gray-600">{entry.severity}</span>
                          {entry.characterName && (
                            <span className="text-[10px] text-gray-500">{entry.characterName}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex items-center justify-between">
            <button onClick={onClear} className="text-[10px] text-gray-500 hover:text-gray-300">
              Clear All
            </button>
            <span className="text-[10px] text-gray-600">{entries.length} entries</span>
          </div>
        </>
      )}
    </div>
  );
};

export default AdvisorPanel;
