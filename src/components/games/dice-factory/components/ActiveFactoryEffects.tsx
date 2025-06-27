// 1001 Game Nights - Active Factory Effects Component
// Version: 2.1.0 - Split from combined panel, effects only
// Updated: December 2024

import React from 'react';
import { FactoryEffect } from '../types/DiceFactoryTypes';

interface ActiveFactoryEffectsProps {
  effects: FactoryEffect[];
}

const ActiveFactoryEffects: React.FC<ActiveFactoryEffectsProps> = ({ effects }) => {
  // Filter to only show effects (one-time use)
  const activeEffects = effects.filter(item => item.type === 'effect');

  if (activeEffects.length === 0) {
    return (
      <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
        <h3 className="text-lg font-semibold mb-3 text-uranian-blue">
          ⚡ Active Factory Effects
        </h3>
        <div className="text-sm text-gray-400 italic">
          No active effects. Purchase effects with 7 pips to use powerful one-time abilities.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
      <h3 className="text-lg font-semibold mb-3 text-uranian-blue">
        ⚡ Active Factory Effects
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeEffects.map((effect, index) => (
          <div 
            key={index} 
            className="bg-payne-grey/70 p-3 rounded border border-uranian-blue/20 hover:border-uranian-blue/40 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-lion">{effect.name}</div>
              <div className="text-xs px-2 py-1 rounded bg-uranian-blue/20 text-uranian-blue">
                One-Time
              </div>
            </div>
            
            <div className="text-sm text-gray-300 mb-2">
              {effect.description}
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Cost: {effect.cost} pips
              </div>
              <button className="text-xs bg-uranian-blue hover:bg-uranian-blue-light px-2 py-1 rounded text-white transition-colors">
                Use Effect
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActiveFactoryEffects;