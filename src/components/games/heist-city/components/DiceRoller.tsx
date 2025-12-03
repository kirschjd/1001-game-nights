import React, { useEffect, useState } from 'react';

interface DiceRollerProps {
  onRoll?: (dice1: number, dice2: number, total: number) => void;
  lastRoll?: { dice1: number; dice2: number; total: number; roller?: string } | null;
}

const DiceRoller: React.FC<DiceRollerProps> = ({ onRoll, lastRoll }) => {
  const [rolling, setRolling] = useState(false);

  const handleRoll = () => {
    if (rolling) return;

    setRolling(true);

    // Simulate rolling animation
    setTimeout(() => {
      const dice1 = Math.floor(Math.random() * 6) + 1;
      const dice2 = Math.floor(Math.random() * 6) + 1;
      const total = dice1 + dice2;

      onRoll?.(dice1, dice2, total);
      setRolling(false);
    }, 500);
  };

  const renderDie = (value: number | null, isRolling: boolean) => {
    if (isRolling || value === null) {
      return (
        <div className="w-16 h-16 bg-white border-2 border-gray-400 rounded-lg flex items-center justify-center shadow-lg">
          <div className="text-3xl font-bold text-gray-400 animate-pulse">?</div>
        </div>
      );
    }

    return (
      <div className="w-16 h-16 bg-white border-2 border-gray-800 rounded-lg flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
        <div className="text-4xl font-bold text-gray-900">{value}</div>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-bold text-white mb-4">Dice Roller</h3>

      {/* Dice Display */}
      <div className="flex gap-4 justify-center mb-4">
        {renderDie(lastRoll?.dice1 ?? null, rolling)}
        {renderDie(lastRoll?.dice2 ?? null, rolling)}
      </div>

      {/* Total Display */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-purple-400">
          Total: {rolling || !lastRoll ? '?' : lastRoll.total}
        </div>
      </div>

      {/* Roll Button */}
      <button
        onClick={handleRoll}
        disabled={rolling}
        className={`w-full px-4 py-3 rounded-lg font-semibold text-white transition-all ${
          rolling
            ? 'bg-gray-600 cursor-not-allowed'
            : 'bg-purple-600 hover:bg-purple-700 active:scale-95'
        }`}
      >
        {rolling ? 'Rolling...' : 'Roll 2d6'}
      </button>
    </div>
  );
};

export default DiceRoller;
