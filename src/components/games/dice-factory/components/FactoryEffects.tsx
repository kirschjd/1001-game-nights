// 1001 Game Nights - Factory Effects Component
// Version: 2.0.0 - Modular refactor
// Updated: December 2024

import React from 'react';
import { FactoryEffect } from '../types/DiceFactoryTypes';

interface FactoryEffectsProps {
  activeEffects: FactoryEffect[];
}

const FactoryEffects: React.FC<FactoryEffectsProps> = ({ activeEffects }) => {
  if (activeEffects.length === 0) {
    return null;
  }

  return (
    <div className="bg-payne-grey/50 p-4 rounded-lg border border-uranian-blue/30">
      <h3 className="text-lg font-semibold mb-3 text-uranian-blue">
        🏭 Active Factory Effects
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {activeEffects.map((effect, index) => (
          <div 
            key={index} 
            className="bg-payne-grey/70 p-3 rounded border border-uranian-blue/20"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-lion">{effect.name}</div>
              <div className={`text-xs px-2 py-1 rounded ${
                effect.type === 'effect' 
                  ? 'bg-uranian-blue/20 text-uranian-blue' 
                  : 'bg-lion/20 text-lion'
              }`}>
                {effect.type === 'effect' ? 'Effect' : 'Modification'}
              </div>
            </div>
            
            <div className="text-sm text-gray-300 mb-2">
              {effect.description}
            </div>
            
            <div className="text-xs text-gray-500">
              Cost: {effect.cost} pips
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FactoryEffects;