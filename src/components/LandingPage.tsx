import React from 'react';
import { useNavigate } from 'react-router-dom';
import { generateLobbySlug } from '../utils/lobbyUtils';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNewLobby = () => {
    const slug = generateLobbySlug();
    navigate(`/lobby/${slug}`);
  };

  const handleExploreGames = () => {
    navigate('/explore');
  };





  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header with Banner */}
      <header className="relative text-center py-16 overflow-hidden">
        {/* Banner Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/assets/banner-main.jpg" 
            alt="1001 Game Nights Banner"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40"></div>
        </div>
        
        {/* Content over banner */}
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/assets/icon-home.jpg" 
              alt="Home Icon"
              className="w-16 h-16 rounded-lg mr-4 border-2 border-lion"
            />
            <h1 className="text-6xl font-bold text-white text-shadow" style={{lineHeight: '1.1'}}>
              1001 Game Nights
            </h1>
          </div>
          <p className="text-xl text-gray-300">
            Create lobbies, play games, have fun with friends!
          </p>
        </div>
      </header>

      {/* Main Actions */}
      <main className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="flex flex-col gap-8 mb-16 max-w-2xl mx-auto">
          {/* Create New Lobby */}
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-2xl p-8 hover:bg-lion/20 transition-all duration-300 hover:transform hover:scale-105 border border-payne-grey/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🚪</div>
              <h2 className="text-3xl font-bold mb-4 text-lion-light">Create New Lobby</h2>
              <p className="text-gray-300 mb-6">
                Start a new game lobby with a unique URL. Invite friends and play together!
              </p>
              <button
                onClick={handleNewLobby}
                className="bg-gradient-to-r from-lion to-lion-light hover:from-lion-dark hover:to-lion px-8 py-4 rounded-lg text-xl font-semibold transition-all duration-300 hover:transform hover:scale-105 shadow-lg text-white"
              >
                Create Lobby
              </button>
            </div>
          </div>

          {/* Explore Games */}
          <div className="bg-payne-grey/20 backdrop-blur-md rounded-2xl p-8 hover:bg-lion/20 transition-all duration-300 hover:transform hover:scale-105 border border-payne-grey/30">
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <h2 className="text-3xl font-bold mb-4 text-lion-light">Explore Games</h2>
              <p className="text-gray-300 mb-6">
                Discover available games, learn the rules, and find the perfect game for your group.
              </p>
              <button
                onClick={handleExploreGames}
                className="bg-gradient-to-r from-payne-grey to-payne-grey-light hover:from-payne-grey-dark hover:to-payne-grey px-8 py-4 rounded-lg text-xl font-semibold transition-all duration-300 hover:transform hover:scale-105 shadow-lg text-white"
              >
                Explore Games
              </button>
            </div>
          </div>
        </div>



        {/* Footer Actions */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => window.open('https://nam11.safelinks.protection.outlook.com/?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1-i9-0fwq5D19Z82_pFol3ZvRJe1xHbQOeP0avzCx6Xo%2Fedit%3Fusp%3Ddrivesdk&data=05%7C02%7Cjkirschenheiter%40fedsig.com%7Ca196274490134a53b03208ddb5a60e1e%7Ca76e6f68d11b4ed58958c89cdfc498d3%7C0%7C0%7C638866447023093978%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=i4EkwhtXeyAbYfQZvOw7wKbe3KadxZucaL2BkdsNGBY%3D&reserved=0', '_blank')}
            className="bg-payne-grey hover:bg-payne-grey-light px-6 py-3 rounded-lg transition-colors border border-payne-grey-light"
          >
            📋 Requests
          </button>
          <button
            onClick={() => window.open('https://nam11.safelinks.protection.outlook.com/?url=https%3A%2F%2Fdocs.google.com%2Fspreadsheets%2Fd%2F1-HMDnvSZb4nph4F-uWe18YTNxxpzzkGNKkd4kIPa210%2Fedit%3Fusp%3Ddrivesdk&data=05%7C02%7Cjkirschenheiter%40fedsig.com%7Ca196274490134a53b03208ddb5a60e1e%7Ca76e6f68d11b4ed58958c89cdfc498d3%7C0%7C0%7C638866447023069340%7CUnknown%7CTWFpbGZsb3d8eyJFbXB0eU1hcGkiOnRydWUsIlYiOiIwLjAuMDAwMCIsIlAiOiJXaW4zMiIsIkFOIjoiTWFpbCIsIldUIjoyfQ%3D%3D%7C0%7C%7C%7C&sdata=uKMZxcmyFxNSmH6Y5q%2Fk2HL6Pc9zeN4q5wcH7Q0ZSkU%3D&reserved=0', '_blank')}
            className="bg-payne-grey hover:bg-payne-grey-light px-6 py-3 rounded-lg transition-colors border border-payne-grey-light"
          >
            🐛 Bug Tracker
          </button>
        </div>




      </main>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 relative z-10">
        <p>Created by John Kirschenheiter</p>
      </footer>
    </div>
  );
};

export default LandingPage;