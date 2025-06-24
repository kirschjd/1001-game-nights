import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  joinedAt: string;
}

interface LobbyState {
  slug: string;
  title: string;
  players: Player[];
  leaderId: string;
  gameType: string;
  gameOptions: Record<string, any>;
}

const LobbyPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showLeaderSelect, setShowLeaderSelect] = useState(false);
  const [myPlayerName, setMyPlayerName] = useState('');

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('lobby-updated', (lobbyData: LobbyState) => {
      setLobby(lobbyData);
    });

    newSocket.on('game-started', (gameData) => {
      navigate(`/game/${slug}`);
    });

    return () => {
      newSocket.close();
      return;
    };
  }, [slug, navigate]);

  useEffect(() => {
    // Auto-generate player name and join
    if (socket && !isJoined && slug) {
      // Try to get existing name for this lobby, or create new one
      let playerName = sessionStorage.getItem(`player-name-${slug}`);
      if (!playerName) {
        playerName = `Player ${Math.floor(Math.random() * 1000)}`;
        sessionStorage.setItem(`player-name-${slug}`, playerName);
      }
      
      setMyPlayerName(playerName);
      console.log('LobbyPage: Joining as', playerName);
      socket.emit('join-lobby', { slug, playerName });
      setIsJoined(true);
    }
  }, [socket, isJoined, slug]);

  const handleTitleSubmit = () => {
    if (socket && tempTitle.trim()) {
      socket.emit('update-lobby-title', { slug, newTitle: tempTitle.trim() });
      setEditingTitle(false);
    }
  };

  const handleNameSubmit = () => {
    if (socket && tempName.trim()) {
      // Update sessionStorage with new name
      sessionStorage.setItem(`player-name-${slug}`, tempName.trim());
      setMyPlayerName(tempName.trim());
      
      socket.emit('update-player-name', { slug, newName: tempName.trim() });
      setEditingName(false);
    }
  };

  const handleGameTypeChange = (newGameType: string) => {
    if (socket && isLeader) {
      socket.emit('update-game-type', { slug, gameType: newGameType });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Lobby link copied to clipboard!');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Lobby link copied to clipboard!');
    }
  };

  const handleChangeLeader = (newLeaderId: string) => {
    if (socket) {
      socket.emit('change-leader', { slug, newLeaderId });
      setShowLeaderSelect(false);
    }
  };

  const handleStartGame = () => {
    if (socket) {
      socket.emit('start-game', { slug });
    }
  };

  const isLeader = lobby && socket && lobby.leaderId === socket.id;

  // Get game-specific colors
  const gameColor = lobby?.gameType === 'war' ? 'tea-rose' : 'uranian-blue';
  const gameColorClasses = lobby?.gameType === 'war' 
    ? 'border-tea-rose/30 bg-tea-rose/10' 
    : 'border-uranian-blue/30 bg-uranian-blue/10';

  if (!lobby) {
    return (
      <div className="min-h-screen bg-payne-grey-dark text-white flex items-center justify-center relative">
        {/* Subtle texture overlay */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}></div>
        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lion mx-auto mb-4"></div>
          <p className="text-xl text-lion-light">Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header */}
      <header className="p-4 border-b border-payne-grey relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img 
              src="/assets/icon-home.jpg" 
              alt="Home"
              className="w-10 h-10 rounded border-2 border-lion"
            />
            <div>
              <h1 className="text-2xl font-bold text-lion-light">🎯 Game Lobby</h1>
              <p className="text-gray-300">Prepare for {lobby.gameType === 'war' ? 'War' : 'Dice Factory'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-payne-grey hover:bg-payne-grey-light px-4 py-2 rounded-lg transition-colors border border-payne-grey-light text-white"
          >
            ← Back to Home
          </button>
        </div>
      </header>

      <div className="flex min-h-screen relative z-10">
        {/* Left Panel */}
        <div className="w-1/3 p-6 border-r border-payne-grey">
          {/* Lobby Title */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Lobby Title
            </label>
            <div className="flex items-center space-x-2">
              {editingTitle ? (
                <div className="flex-1 flex space-x-2">
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTitleSubmit()}
                    className="flex-1 px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSubmit}
                    className="px-3 py-2 bg-lion hover:bg-lion-dark rounded-lg text-white"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingTitle(false)}
                    className="px-3 py-2 bg-payne-grey hover:bg-payne-grey-light rounded-lg text-white"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 px-3 py-2 bg-payne-grey/30 border border-payne-grey rounded-lg text-white">
                    {lobby.title}
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => {
                        setTempTitle(lobby.title);
                        setEditingTitle(true);
                      }}
                      className="px-3 py-2 bg-lion hover:bg-lion-dark rounded-lg text-white"
                    >
                      ✏️
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
                title="Copy lobby link"
              >
                📋
              </button>
            </div>
          </div>

          {/* Player List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-lion-light">Players</h3>
            <div className="space-y-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    player.isConnected 
                      ? 'bg-payne-grey/30 border-payne-grey' 
                      : 'bg-payne-grey/10 border-payne-grey/50 opacity-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {player.id === lobby.leaderId && (
                      <span className="text-lion" title="Lobby Leader">👑</span>
                    )}
                    {player.name === myPlayerName ? (
                      editingName ? (
                        <div className="flex space-x-1">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                            className="px-2 py-1 bg-payne-grey border border-payne-grey-light rounded text-sm text-white focus:outline-none focus:ring-1 focus:ring-lion"
                            autoFocus
                          />
                          <button
                            onClick={handleNameSubmit}
                            className="px-2 py-1 bg-lion hover:bg-lion-dark rounded text-xs text-white"
                          >
                            ✓
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setTempName(player.name);
                            setEditingName(true);
                          }}
                          className="text-lion hover:text-lion-light"
                        >
                          {player.name} (You)
                        </button>
                      )
                    ) : (
                      <span className="text-white">{player.name}</span>
                    )}
                    {!player.isConnected && (
                      <span className="text-red-400 text-sm">(Disconnected)</span>
                    )}
                  </div>
                  
                  {isLeader && player.id === lobby.leaderId && (
                    <button
                      onClick={() => setShowLeaderSelect(true)}
                      className="text-xs bg-lion hover:bg-lion-dark px-2 py-1 rounded text-white"
                    >
                      Change Leader
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Game Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-lion-light">Game Options</h3>
            
            {/* Game Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Type
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={lobby.gameType}
                  onChange={(e) => handleGameTypeChange(e.target.value)}
                  disabled={!isLeader}
                  className="flex-1 px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-lion"
                >
                  <option value="war">War</option>
                  <option value="dice-factory">Dice Factory</option>
                </select>
                <img 
                  src={`/assets/icon-${lobby.gameType}.jpg`} 
                  alt={lobby.gameType}
                  className={`w-8 h-8 rounded border border-${gameColor}`}
                />
              </div>
            </div>

            {/* Game-specific options placeholder */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Options
              </label>
              <div className={`px-3 py-2 rounded-lg text-gray-400 text-sm border ${gameColorClasses}`}>
                No options available for {lobby.gameType}
              </div>
            </div>

            {/* Bot options placeholder */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bots
              </label>
              <div className="px-3 py-2 bg-payne-grey/20 border border-payne-grey rounded-lg text-gray-400 text-sm">
                Bot support coming soon
              </div>
            </div>
          </div>

          {/* Start Game Button */}
          {isLeader && (
            <button
              onClick={handleStartGame}
              className="w-full bg-lion hover:bg-lion-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              🚀 Start Game
            </button>
          )}
        </div>

        {/* Right Panel - Chat/Info */}
        <div className="flex-1 p-6">
          <div className="bg-payne-grey/30 rounded-lg p-6 h-full border border-payne-grey/30">
            <h3 className="text-xl font-semibold mb-4 text-lion-light">Lobby Information</h3>
            <div className="space-y-3 text-gray-300">
              <p><strong className="text-lion">Lobby Code:</strong> {lobby.slug}</p>
              <p><strong className="text-lion">Players:</strong> {lobby.players.length}</p>
              <p><strong className="text-lion">Game:</strong> {lobby.gameType}</p>
              <p><strong className="text-lion">Leader:</strong> {lobby.players.find(p => p.id === lobby.leaderId)?.name}</p>
              <p><strong className="text-lion">You are:</strong> {myPlayerName}</p>
            </div>
            
            <div className={`mt-8 p-4 rounded-lg border ${gameColorClasses}`}>
              <div className="flex items-center gap-3 mb-2">
                <img 
                  src={`/assets/icon-${lobby.gameType}.jpg`} 
                  alt={lobby.gameType}
                  className={`w-6 h-6 rounded border border-${gameColor}`}
                />
                <h4 className={`font-semibold text-${gameColor}`}>How to play {lobby.gameType}:</h4>
              </div>
              {lobby.gameType === 'war' && (
                <p className="text-sm text-gray-300">
                  Each player gets a card. You can either Play or Fold. 
                  If you fold, you lose 1 point. If you play, the highest card wins 1 point, 
                  and everyone else loses 1 point.
                </p>
              )}
              {lobby.gameType === 'dice-factory' && (
                <p className="text-sm text-gray-300">
                  Manage your dice factory to score points through clever combinations. 
                  Promote dice, recruit new ones, and score tricks before the factory collapses!
                </p>
              )}
            </div>

            {/* Additional game info */}
            <div className="mt-6 p-4 bg-lion/10 rounded-lg border border-lion/30">
              <h4 className="font-semibold mb-2 text-lion">Lobby Features:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Real-time multiplayer with Socket.io</li>
                <li>• Player reconnection support</li>
                <li>• Leader-based game control</li>
                <li>• Share lobby with 3-word URL</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Leader Selection Modal */}
      {showLeaderSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-payne-grey-light">
            <h2 className="text-xl font-bold mb-4 text-lion-light">Select New Leader</h2>
            <div className="space-y-2 mb-4">
              {lobby.players.filter(p => p.isConnected).map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleChangeLeader(player.id)}
                  className="w-full text-left p-3 bg-payne-grey-light hover:bg-lion/20 rounded-lg transition-colors text-white border border-payne-grey-light"
                >
                  {player.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLeaderSelect(false)}
              className="w-full bg-payne-grey-dark hover:bg-payne-grey text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;