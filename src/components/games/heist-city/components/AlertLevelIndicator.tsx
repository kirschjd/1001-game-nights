import React from 'react';
import { CharacterToken } from '../types';

interface AlertLevelIndicatorProps {
  characters: CharacterToken[];
  alertModifier: number;
  onAlertModifierChange: (value: number) => void;
}

interface AlertLevelInfo {
  level: number;
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

const ALERT_LEVELS: AlertLevelInfo[] = [
  {
    level: 0,
    name: 'Unaware',
    description: 'Guards all passive',
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
  },
  {
    level: 1,
    name: 'Suspicious',
    description: 'Enemies attack overt units, they get 1 action',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-900/30',
  },
  {
    level: 2,
    name: 'Alert',
    description: 'Enemies attack overt units, they get 2 actions',
    color: 'text-orange-400',
    bgColor: 'bg-orange-900/30',
  },
  {
    level: 3,
    name: 'Lockdown',
    description: 'All previous, plus SWAT mob spawns on all security portals',
    color: 'text-red-400',
    bgColor: 'bg-red-900/30',
  },
];

function getAlertLevel(unitsRevealed: number, alertModifier: number): AlertLevelInfo {
  const total = unitsRevealed + alertModifier;

  if (total <= 2) return ALERT_LEVELS[0];
  if (total <= 5) return ALERT_LEVELS[1];
  if (total <= 7) return ALERT_LEVELS[2];
  return ALERT_LEVELS[3];
}

const AlertLevelIndicator: React.FC<AlertLevelIndicatorProps> = ({
  characters,
  alertModifier,
  onAlertModifierChange,
}) => {
  // Count units that are Overt, Stunned, or Unconscious
  const unitsRevealed = characters.filter(
    (char) => char.state === 'Overt' || char.state === 'Stunned' || char.state === 'Unconscious'
  ).length;

  const alertLevel = getAlertLevel(unitsRevealed, alertModifier);
  const totalAlert = unitsRevealed + alertModifier;

  return (
    <div className={`${alertLevel.bgColor} border border-gray-700 rounded-lg p-2`}>
      {/* Header with Level Name */}
      <div className="flex items-center justify-between mb-1">
        <div className={`text-sm font-bold ${alertLevel.color}`}>{alertLevel.name}</div>
        <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${alertLevel.color} bg-black/30`}>
          Lv {alertLevel.level}
        </div>
      </div>

      {/* Description */}
      <div className="text-[10px] text-gray-400 leading-tight mb-2">{alertLevel.description}</div>

      {/* Stats Row - Units Revealed and Alert Modifier side by side */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Units Revealed */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">Revealed:</span>
          <span className="text-white font-semibold">{unitsRevealed}</span>
        </div>

        {/* Alert Modifier */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAlertModifierChange(alertModifier - 1)}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center text-xs font-bold transition-colors"
          >
            -
          </button>
          <span className="w-6 text-center text-white font-semibold text-xs">
            {alertModifier >= 0 ? `+${alertModifier}` : alertModifier}
          </span>
          <button
            onClick={() => onAlertModifierChange(alertModifier + 1)}
            className="w-5 h-5 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center justify-center text-xs font-bold transition-colors"
          >
            +
          </button>
        </div>

        {/* Total */}
        <div className="flex items-center gap-1">
          <span className="text-gray-500">=</span>
          <span className={`font-bold ${alertLevel.color}`}>{totalAlert}</span>
        </div>
      </div>

      {/* Level Thresholds Reference */}
      <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-700/50">
        <span className="text-[9px] text-gray-600">Thresholds:</span>
        <div className="flex gap-1 text-[9px]">
          <span className="text-green-400">0-2</span>
          <span className="text-gray-600">|</span>
          <span className="text-yellow-400">3-5</span>
          <span className="text-gray-600">|</span>
          <span className="text-orange-400">6-7</span>
          <span className="text-gray-600">|</span>
          <span className="text-red-400">8+</span>
        </div>
      </div>
    </div>
  );
};

export default AlertLevelIndicator;
