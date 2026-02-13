import React from 'react';
import { MapItem as MapItemType } from '../types';
import { isEnemyUnit, getEnemyStats } from '../data/characters';

interface EnemyInfoPanelProps {
  item: MapItemType;
}

const EnemyInfoPanel: React.FC<EnemyInfoPanelProps> = ({ item }) => {
  if (!isEnemyUnit(item.type)) return null;

  const enemyStats = getEnemyStats(item.type);
  if (!enemyStats) return null;

  return (
    <div className="bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
      {/* Name and Position Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-sm font-bold text-white">{enemyStats.name}</h3>
        <span className="text-xs text-gray-400">
          ({item.position.x.toFixed(1)}", {item.position.y.toFixed(1)}")
        </span>
      </div>

      {/* Stats Display */}
      <div className="space-y-1 text-xs text-white">
        {enemyStats.movement !== null && (
          <div className="flex justify-between">
            <span className="text-gray-400">M:</span>
            <span className="font-semibold">{enemyStats.movement}</span>
          </div>
        )}
        {enemyStats.meleeSkill !== null && (
          <div className="flex justify-between">
            <span className="text-gray-400">MS:</span>
            <span className="font-semibold">{enemyStats.meleeSkill}</span>
          </div>
        )}
        {enemyStats.ballisticSkill !== null && (
          <div className="flex justify-between">
            <span className="text-gray-400">BS:</span>
            <span className="font-semibold">{enemyStats.ballisticSkill}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">W:</span>
          <span className="font-semibold">{enemyStats.wounds}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Def:</span>
          <span className="font-semibold">{enemyStats.defense}</span>
        </div>
        {enemyStats.range !== null && (
          <div className="flex justify-between">
            <span className="text-gray-400">Range:</span>
            <span className="font-semibold">{enemyStats.range}"</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-400">Dam:</span>
          <span className="font-semibold">{enemyStats.damage}</span>
        </div>
      </div>
    </div>
  );
};

export default EnemyInfoPanel;
