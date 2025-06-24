import React from 'react';
import { useNavigate } from 'react-router-dom';

interface GameInfo {
  id: string;
  name: string;
  players: string;
  duration: string;
  description: string;
  rules: string[];
  status: 'available' | 'coming-soon';
}

const ExplorePage: React.FC = () => {
  const navigate = useNavigate();

  const games: GameInfo[] = [
    {
      id: 'war',
      name: 'War',
      players: '2-8 players',
      duration: '5-10 minutes',
      description: 'A simple card game where the highest card wins the round.',
      rules: [
        'Each player receives one card from a standard deck',
        'Players choose to either Play or Fold their card',
        'If you Fold, you lose 1 point automatically',
        'If you Play, the player with the highest card wins 1 point',
        'All other players who played lose 1 point',
        'Game continues for multiple rounds'
      ],
      status: 'available'
    },
    {
      id: 'dice-factory',
      name: 'Dice Factory',
      players: '3-5 players',
      duration: '45-60 minutes',
      description: 'Manage your dice production facility to score points through clever combinations before the factory collapses.',
      rules: [
        'Start with 4 four-sided dice (d4)',
        'Roll dice each turn and perform actions:',
        '• Score Straights: 3+ consecutive dice values',
        '• Score Sets: 4+ dice of the same value',
        '• Promote dice to larger sizes using pip values',
        '• Recruit new dice by rolling specific values',
        'Factory effects modify gameplay rules',
        'When collapse begins, decide to flee with points or risk staying',
        'Crushed players score 0 points!'
      ],
      status: 'available'
    }
  ];

  const generateLobbySlug = (): string => {
    const words = [
      'horse', 'hat', 'wickerbasket', 'blue', 'mountain', 'river', 'coffee', 'laptop',
      'sunset', 'garden', 'book', 'candle', 'forest', 'ocean', 'pizza', 'guitar',
      'rainbow', 'cloud', 'bicycle', 'camera', 'thunder', 'whisper', 'diamond', 'feather'
    ];
    
    const shuffled = words.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).join('-');
  };

  const createLobbyWithGame = (gameId: string) => {
    const slug = generateLobbySlug();
    // In a full implementation, you'd pass the game type to the lobby
    navigate(`/lobby/${slug}?game=${gameId}`);
  };

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header */}
      <header className="p-6 border-b border-payne-grey relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src="/assets/icon-home.jpg" 
              alt="Home Icon"
              className="w-12 h-12 rounded-lg mr-4 border-2 border-lion"
            />
            <div>
              <h1 className="text-4xl font-bold mb-2 text-lion-light">🎯 Explore Games</h1>
              <p className="text-gray-300">Discover available games and create lobbies</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-payne-grey hover:bg-payne-grey-light px-6 py-3 rounded-lg transition-colors border border-payne-grey-light"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Games List */}
      <main className="container mx-auto px-6 py-8 max-w-6xl relative z-10">
        <div className="grid gap-8">
          {games.map((game) => {
            const gameColor = game.id === 'war' ? 'tea-rose' : 'uranian-blue';
            const gameBorderColor = game.id === 'war' ? 'border-tea-rose/30' : 'border-uranian-blue/30';
            const gameAccentColor = game.id === 'war' ? 'bg-tea-rose/20' : 'bg-uranian-blue/20';
            
            return (
              <div
                key={game.id}
                className={`bg-payne-grey/20 backdrop-blur-md rounded-2xl p-8 hover:bg-payne-grey/30 transition-all duration-300 border border-payne-grey/30 ${gameBorderColor}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  {/* Game Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <img 
                        src={`/assets/icon-${game.id}.jpg`} 
                        alt={`${game.name} Icon`}
                        className={`w-16 h-16 rounded-lg border-2 border-${gameColor}`}
                      />
                      <div>
                        <h2 className={`text-3xl font-bold text-${gameColor}`}>{game.name}</h2>
                        <span
                          className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                            game.status === 'available'
                              ? `${gameAccentColor} text-${gameColor} border border-${gameColor}/30`
                              : 'bg-payne-grey text-gray-300 border border-payne-grey'
                          }`}
                        >
                          {game.status === 'available' ? 'Available' : 'Coming Soon'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-6 mb-4 text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">👥</span>
                        <span>{game.players}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">⏱️</span>
                        <span>{game.duration}</span>
                      </div>
                    </div>

                    <p className="text-lg text-gray-200 mb-6">{game.description}</p>

                    {/* Rules */}
                    <div>
                      <h3 className="text-xl font-semibold mb-3 text-lion-light">📋 How to Play</h3>
                      <ul className="space-y-2">
                        {game.rules.map((rule, index) => (
                          <li key={index} className="text-gray-300 flex items-start gap-2">
                            <span className={`text-${gameColor} font-bold mt-1`}>•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="lg:ml-8">
                    {game.status === 'available' ? (
                      <button
                        onClick={() => createLobbyWithGame(game.id)}
                        className={`bg-gradient-to-r from-lion to-lion-light hover:from-lion-dark hover:to-lion px-8 py-4 rounded-lg text-xl font-semibold transition-all duration-300 hover:transform hover:scale-105 shadow-lg whitespace-nowrap text-white`}
                      >
                        Create {game.name} Lobby
                      </button>
                    ) : (
                      <div className="text-center">
                        <div className="bg-payne-grey px-8 py-4 rounded-lg text-xl font-semibold text-gray-300 whitespace-nowrap border border-payne-grey">
                          Coming Soon
                        </div>
                        <p className="text-sm text-gray-400 mt-2">
                          In Development
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Game Suggestion */}
        <div className="mt-12 text-center">
          <div className="bg-payne-grey/20 rounded-2xl p-8 border border-payne-grey/30">
            <h3 className="text-2xl font-bold mb-4 text-lion-light">🎲 Want to see a specific game?</h3>
            <p className="text-gray-300 mb-6">
              We're always looking to add new games to the platform. 
              Share your suggestions using the feedback button on the home page!
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-lion hover:bg-lion-dark px-6 py-3 rounded-lg transition-colors text-white font-semibold"
            >
              Submit Game Suggestion
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 border-t border-payne-grey relative z-10">
        <p>Game development powered by community feedback</p>
      </footer>
    </div>
  );
};

export default ExplorePage;