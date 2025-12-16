import React from 'react';

interface LobbyHeaderProps {
  gameType: string;
  title: string;
  gameColor: string;
  gameColorClasses: string;
  onBack: () => void;
}

const getGameDisplayName = (gameType: string): string => {
  switch (gameType) {
    case 'war':
      return 'War';
    case 'dice-factory':
      return 'Dice Factory';
    case 'henhur':
      return 'HenHur';
    case 'heist-city':
      return 'Heist City';
    case 'kill-team-draft':
      return 'Kill Team Draft';
    default:
      return gameType;
  }
};

const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  gameType,
  title,
  gameColor,
  gameColorClasses,
  onBack,
}) => {
  return (
    <header className={`p-4 border-b ${gameColorClasses} relative z-10`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <img
            src={`/assets/icon-${gameType}.jpg`}
            alt={gameType}
            className={`w-12 h-12 rounded-lg mr-4 border-2 border-${gameColor}`}
          />
          <div>
            <h1 className="text-3xl font-bold mb-1 text-lion-light">
              {title}
            </h1>
            <p className="text-gray-300">
              Playing: {getGameDisplayName(gameType)}
            </p>
          </div>
        </div>
        <button
          onClick={onBack}
          className="bg-payne-grey hover:bg-payne-grey-light px-4 py-2 rounded-lg transition-colors border border-payne-grey-light text-white"
        >
          ← Back to Home
        </button>
      </div>
    </header>
  );
};

export default LobbyHeader;
