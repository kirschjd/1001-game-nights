import React from 'react';

interface GameStartButtonProps {
  isLeader: boolean;
  gameType: string;
  selectedVariant?: string;
  onStartGame: () => void;
}

const GameStartButton: React.FC<GameStartButtonProps> = ({
  isLeader,
  gameType,
  selectedVariant = 'regular',
  onStartGame,
}) => {
  if (!isLeader) return null;

  const getButtonText = () => {
    if (gameType === 'war') {
      return `Start ${selectedVariant === 'aces-high' ? 'Aces High' : 'Regular War'}`;
    }
    return 'Start Game';
  };

  return (
    <button
      onClick={onStartGame}
      className="w-full bg-lion hover:bg-lion-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
    >
      {getButtonText()}
    </button>
  );
};

export default GameStartButton;
