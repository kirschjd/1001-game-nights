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
      const generatedName = `Player ${Math.floor(Math.random() * 1000)}`;
      socket.emit('join-lobby', { slug, playerName: generatedName });
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

  if (!lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl">Loading lobby...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Header */}
      <header className="p-4 border-b border-gray-700">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
        >
          ← Back to Home
        </button>
      </header>

      <div className="flex min-h-screen">
        {/* Left Panel */}
        <div className="w-1/3 p-6 border-r border-gray-700">
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
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    autoFocus
                  />
                  <button
                    onClick={handleTitleSubmit}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingTitle(false)}
                    className="px-3 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg">
                    {lobby.title}
                  </div>
                  {isLeader && (
                    <button
                      onClick={() => {
                        setTempTitle(lobby.title);
                        setEditingTitle(true);
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
                    >
                      ✏️
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg"
                title="Copy lobby link"
              >
                📋
              </button>
            </div>
          </div>

          {/* Player List */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Players</h3>
            <div className="space-y-2">
              {lobby.players.map((player) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.isConnected ? 'bg-gray-700' : 'bg-gray-800 opacity-50'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {player.id === lobby.leaderId && (
                      <span className="text-yellow-400" title="Lobby Leader">👑</span>
                    )}
                    {player.id === socket?.id ? (
                      editingName ? (
                        <div className="flex space-x-1">
                          <input
                            type="text"
                            value={tempName}
                            onChange={(e) => setTempName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                            className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm"
                            autoFocus
                          />
                          <button
                            onClick={handleNameSubmit}
                            className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-xs"
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
                          className="text-green-400 hover:text-green-300"
                        >
                          {player.name} (You)
                        </button>
                      )
                    ) : (
                      <span>{player.name}</span>
                    )}
                    {!player.isConnected && (
                      <span className="text-red-400 text-sm">(Disconnected)</span>
                    )}
                  </div>
                  
                  {isLeader && player.id === lobby.leaderId && (
                    <button
                      onClick={() => setShowLeaderSelect(true)}
                      className="text-xs bg-yellow-600 hover:bg-yellow-500 px-2 py-1 rounded"
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
            <h3 className="text-lg font-semibold mb-3">Game Options</h3>
            
            {/* Game Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Type
              </label>
              <select
                value={lobby.gameType}
                onChange={(e) => handleGameTypeChange(e.target.value)}
                disabled={!isLeader}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
              >
                <option value="war">War</option>
                <option value="dice-factory">Dice Factory</option>
              </select>
            </div>

            {/* Game-specific options placeholder */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Game Options
              </label>
              <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-400 text-sm">
                No options available for {lobby.gameType}
              </div>
            </div>

            {/* Bot options placeholder */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Bots
              </label>
              <div className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-400 text-sm">
                Bot support coming soon
              </div>
            </div>
          </div>

          {/* Start Game Button */}
          {isLeader && (
            <button
              onClick={handleStartGame}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              🚀 Start Game
            </button>
          )}
        </div>

        {/* Right Panel - Chat/Info (placeholder) */}
        <div className="flex-1 p-6">
          <div className="bg-gray-800 rounded-lg p-6 h-full">
            <h3 className="text-xl font-semibold mb-4">Lobby Information</h3>
            <div className="space-y-3 text-gray-300">
              <p><strong>Lobby Code:</strong> {lobby.slug}</p>
              <p><strong>Players:</strong> {lobby.players.length}</p>
              <p><strong>Game:</strong> {lobby.gameType}</p>
              <p><strong>Leader:</strong> {lobby.players.find(p => p.id === lobby.leaderId)?.name}</p>
            </div>
            
            <div className="mt-8 p-4 bg-blue-900 rounded-lg">
              <h4 className="font-semibold mb-2">How to play {lobby.gameType}:</h4>
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
          </div>
        </div>
      </div>

      {/* Leader Selection Modal */}
      {showLeaderSelect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-xl max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Select New Leader</h2>
            <div className="space-y-2 mb-4">
              {lobby.players.filter(p => p.isConnected).map((player) => (
                <button
                  key={player.id}
                  onClick={() => handleChangeLeader(player.id)}
                  className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  {player.name}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowLeaderSelect(false)}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white py-2 rounded-lg"
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