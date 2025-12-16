import React from 'react';

interface HenHurRulesProps {
  gameColorClasses: string;
}

const HenHurRules: React.FC<HenHurRulesProps> = ({ gameColorClasses }) => {
  return (
    <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
      <h2 className="text-2xl font-bold mb-4 text-amber-400">HenHur</h2>
      <p className="text-lg font-semibold text-amber-400 mb-4">
        This is a placeholder for the HenHur game. Rules and features will be added soon!
      </p>
      <div className="space-y-4 text-gray-300">
        <p className="text-lg">A new game framework. Stay tuned for updates and gameplay details.</p>
      </div>
    </div>
  );
};

export default HenHurRules;
