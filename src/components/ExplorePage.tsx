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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">🎯 Explore Games</h1>
            <p className="text-gray-300">Discover available games and create lobbies</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      {/* Games Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <div
              key={game.id}
              className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all duration-200 hover:transform hover:scale-105"
            >
              {/* Game Header */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">{game.name}</h2>
                  {game.status === 'coming-soon' && (
                    <span className="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs font-medium">
                      Coming Soon
                    </span>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-3">{game.description}</p>
              </div>

              {/* Game Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div>
                  <span className="text-gray-400">Players:</span>
                  <div className="font-semibold">{game.players}</div>
                </div>
                <div>
                  <span className="text-gray-400">Duration:</span>
                  <div className="font-semibold">{game.duration}</div>
                </div>
              </div>

              {/* Rules */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2 text-gray-200">How to Play:</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {game.rules.slice(0, 3).map((rule, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-400 mr-2">•</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                  {game.rules.length > 3 && (
                    <li className="text-gray-400 italic">
                      ... and {game.rules.length - 3} more rules
                    </li>
                  )}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => createLobbyWithGame(game.id)}
                disabled={game.status === 'coming-soon'}
                className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                  game.status === 'available'
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                {game.status === 'available' ? (
                  <>🚀 Create Lobby</>
                ) : (
                  <>⏳ Coming Soon</>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Quick Create Section */}
        <div className="mt-12 text-center">
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl mx-auto border border-gray-700">
            <h2 className="text-2xl font-bold mb-4">Ready to Play?</h2>
            <p className="text-gray-300 mb-6">
              Create a lobby and invite your friends to play any of our available games.
              You can change the game type once you're in the lobby.
            </p>
            <button
              onClick={() => navigate(`/lobby/${generateLobbySlug()}`)}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 transform hover:scale-105"
            >
              🎲 Create Random Lobby
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {games.filter(g => g.status === 'available').length}
            </div>
            <div className="text-gray-300">Games Available</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-blue-400 mb-2">2-8</div>
            <div className="text-gray-300">Players Supported</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="text-3xl font-bold text-purple-400 mb-2">5-60</div>
            <div className="text-gray-300">Minutes to Play</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;