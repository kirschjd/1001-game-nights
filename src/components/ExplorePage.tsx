import React from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLobbySlug } from '../utils/lobbyUtils';

interface GameInfo {
  id: string;
  name: string;
  players: string;
  duration: string;
  description: string;
  rules: string[];
  features: string[];
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
      description: 'A strategic card game with multiple variants and AI opponents. Choose your battles wisely!',
      rules: [
        'Each player receives one card from a standard deck',
        'Players choose to either Play or Fold their card',
        'If you Fold, you lose 1 point automatically',
        'If you Play, the player with the highest card wins 1 point',
        'All other players who played lose 1 point',
        'First player to 5 points wins the game',
        'Available variants modify winning conditions'
      ],
      features: [
        '🎯 Multiple game variants (Regular, Aces High)',
        '🤖 AI bot opponents with different strategies',
        '⚡ Quick setup and fast-paced gameplay',
        '🎮 Perfect for casual gaming sessions'
      ],
      status: 'available'
    },
    {
      id: 'dice-factory',
      name: 'Dice Factory',
      players: '3-5 players',
      duration: '45-60 minutes',
      description: '"A Game of Odds and Industriousness" - Score points by creating tricks from your dice pool before the factory collapses.',
      rules: [
        'Start with 4 four-sided dice (d4)',
        'Roll dice each turn and perform actions:',
        '• Score Straights: 3+ consecutive dice values = (highest value) × (dice count)',
        '• Score Sets: 3+ dice of same value = (value) × (dice count + 1)',
        '• Promote dice to larger sizes using pip values',
        '• Recruit new dice by rolling specific values',
        '• Process dice for free pips (2× rolled value)',
        'Factory effects and modifications change rules',
        'When collapse begins, decide to flee with points or risk staying',
        'Crushed players score 0 points!'
      ],
      features: [
        '⚙️ Complex engine-building mechanics',
        '🎲 Dynamic dice management system',
        '💥 Thrilling collapse mechanics',
        '🧠 Strategic depth and planning',
        '🏭 Factory effects and modifications'
      ],
      status: 'available'
    },
    {
      id: 'henhur',
      name: 'HenHur',
      players: '2-6 players',
      duration: 'TBD',
      description: 'A new game framework. Rules and features coming soon!',
      rules: [
        'Game rules will be added soon.'
      ],
      features: [
        '🆕 Blank framework for future development',
        '🚧 More features coming soon'
      ],
      status: 'available'
    },
    {
      id: 'heist-city',
      name: 'Heist City',
      players: '2 players',
      duration: '5 turns (~45 min)',
      description: 'Squad-based heist skirmish where you control 5 unique crew members. Steal objectives, avoid detection, and escape before the SWAT arrives!',
      rules: [
        'Players alternate activating crew members (3 actions each: Move, Shoot, Hack, Con, Special)',
        'Each crew member has unique stats and abilities (Face, Muscle, Ninja, Brain, Spook)',
        'Manage stealth states: Hidden and Disguised units avoid detection, Overt units raise alerts',
        'Alert system escalates from passive guards → active turrets → SWAT reinforcements',
        'Roll 2d6 for attacks (MS/BS), defense (D), hacking (H), and conning (C)',
        'Earn Victory Points by KOing enemies, uploading intel, extracting objectives, and escaping',
        'Combat: Attack → Defense roll → Apply damage. 0 Wounds = Stunned, then Unconscious',
        'Win by earning the most VP across 5 turns or controlling the map'
      ],
      features: [
        '🎭 5 character classes with unique roles and special abilities',
        '🕵️ Stealth mechanics: Hidden, Disguised, and Overt states',
        '🚨 Dynamic 4-level alert system with escalating threats',
        '🎲 Dice-based skill checks for combat, hacking, and social engineering',
        '🗺️ 5 unique maps: Bank Job, Jail Break, Server Hack, Train Robbery, Treasure Hunt',
        '📏 Interactive tools: Drag-and-drop units, ruler, dice roller, game log',
        '💾 Real-time multiplayer sync with map editor mode'
      ],
      status: 'available'
    },
    {
      id: 'van-life',
      name: 'Van Life',
      players: '2-5 players',
      duration: '45-90 minutes',
      description: 'Hit the road through Alaska\'s wilderness! Claim routes between national parks and explore the Last Frontier.',
      rules: [
        'Players take turns claiming routes between Alaska\'s 8 national parks',
        'Routes are claimed by paying the required route cost',
        'Longer routes score more points',
        'Complete destination tickets for bonus points',
        'Player with the most points when routes run out wins'
      ],
      features: [
        '🗺️ Illustrated Alaska map with all 8 national parks',
        '🚐 Ticket-to-Ride style route claiming',
        '🏔️ Explore Denali, Glacier Bay, Wrangell-St. Elias, and more',
        '🌲 2-5 player multiplayer'
      ],
      status: 'available'
    }
  ];

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
            const gameColor = game.id === 'war' ? 'tea-rose' : game.id === 'henhur' ? 'amber-400' : game.id === 'heist-city' ? 'purple-500' : 'uranian-blue';
            const gameBorderColor = game.id === 'war' ? 'border-tea-rose/30' : game.id === 'henhur' ? 'border-amber-400/30' : game.id === 'heist-city' ? 'border-purple-500/30' : 'border-uranian-blue/30';
            const gameAccentColor = game.id === 'war' ? 'bg-tea-rose/10' : game.id === 'henhur' ? 'bg-amber-400/10' : game.id === 'heist-city' ? 'bg-purple-500/10' : 'bg-uranian-blue/10';
            const gameButtonColor = game.id === 'war' ? 'bg-tea-rose hover:bg-tea-rose-light' : game.id === 'henhur' ? 'bg-amber-400 hover:bg-amber-300' : game.id === 'heist-city' ? 'bg-purple-500 hover:bg-purple-400' : 'bg-uranian-blue hover:bg-uranian-blue-light';

            return (
              <div
                key={game.id}
                className={`bg-payne-grey p-8 rounded-xl border-2 ${gameBorderColor} shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1`}
              >
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Game Icon and Basic Info */}
                  <div className="lg:w-1/3">
                    <div className="flex items-center mb-4">
                      <img 
                        src={`/assets/icon-${game.id}.jpg`} 
                        alt={game.name}
                        className={`w-16 h-16 rounded-lg mr-4 border-2 border-${gameColor}`}
                      />
                      <div>
                        <h2 className={`text-3xl font-bold text-${gameColor}`}>{game.name}</h2>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                          <span>👥 {game.players}</span>
                          <span>⏱️ {game.duration}</span>
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-300 mb-4 leading-relaxed">{game.description}</p>
                    
                    {/* Game Features */}
                    <div className={`p-4 rounded-lg ${gameAccentColor} border ${gameBorderColor}`}>
                      <h4 className={`font-semibold mb-2 text-${gameColor}`}>✨ Features:</h4>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {game.features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Game Rules and Actions */}
                  <div className="lg:w-2/3">
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold mb-3 text-white">📋 How to Play</h3>
                      <ul className="text-gray-300 space-y-2">
                        {game.rules.map((rule, index) => (
                          <li key={index} className="flex items-start">
                            <span className={`inline-block w-6 h-6 rounded-full bg-${gameColor}/20 text-${gameColor} text-xs flex items-center justify-center mr-3 mt-0.5 flex-shrink-0`}>
                              {index + 1}
                            </span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      {game.status === 'available' ? (
                        <>
                          <button
                            onClick={() => createLobbyWithGame(game.id)}
                            className={`flex-1 ${gameButtonColor} text-white font-bold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5`}
                          >
                            🚀 Create Lobby
                          </button>
                          <button
                            onClick={() => navigate('/')}
                            className="flex-1 bg-payne-grey-light hover:bg-payne-grey text-white font-bold py-4 px-6 rounded-lg transition-colors border border-payne-grey-light"
                          >
                            🔍 Find Existing Game
                          </button>
                        </>
                      ) : (
                        <button
                          disabled
                          className="flex-1 bg-gray-600 text-gray-400 font-bold py-4 px-6 rounded-lg cursor-not-allowed"
                        >
                          🚧 Coming Soon
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="bg-payne-grey p-6 rounded-xl border border-payne-grey-light">
            <h3 className="text-xl font-semibold mb-3 text-lion-light">🎮 Ready to Play?</h3>
            <p className="text-gray-300 mb-4">
              Create a lobby for any game and invite friends with a simple 3-word link. 
              Games support real-time multiplayer with automatic reconnection.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
              <span>🔄 Real-time sync</span>
              <span>📱 Mobile friendly</span>
              <span>🤖 AI bot support</span>
              <span>⚡ Instant setup</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExplorePage;