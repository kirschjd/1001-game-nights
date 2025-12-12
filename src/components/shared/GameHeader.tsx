// 1001 Game Nights - Shared Game Header Component
// Version: 1.0.0 - Shows all players with status icons
// Updated: December 2024

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  isBot?: boolean;
  botStyle?: string;
}

interface GameHeaderProps {
  gameType: string;
  gameTitle?: string;
  players: Player[];
  leaderId: string;
  currentPlayerId: string;
  currentPlayerName?: string;
  socket?: Socket | null;
  slug?: string;
  isLeader: boolean;
  onNameChange?: (newName: string) => void;
  onTransferLeadership?: (newLeaderId: string) => void;
  onHome?: () => void;
}

const GAME_DISPLAY_NAMES: Record<string, string> = {
  'war': 'War',
  'dice-factory': 'Dice Factory',
  'henhur': 'HenHur',
  'heist-city': 'Heist City',
  'kill-team-draft': 'Kill Team Draft',
};

const GAME_COLORS: Record<string, { border: string; bg: string; text: string }> = {
  'war': { border: 'border-tea-rose/30', bg: 'bg-tea-rose/10', text: 'text-tea-rose' },
  'dice-factory': { border: 'border-uranian-blue/30', bg: 'bg-uranian-blue/10', text: 'text-uranian-blue' },
  'henhur': { border: 'border-amber-400/30', bg: 'bg-amber-400/10', text: 'text-amber-400' },
  'heist-city': { border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-500' },
  'kill-team-draft': { border: 'border-uranian-blue/30', bg: 'bg-uranian-blue/10', text: 'text-uranian-blue' },
};

const GameHeader: React.FC<GameHeaderProps> = ({
  gameType,
  gameTitle,
  players,
  leaderId,
  currentPlayerId,
  currentPlayerName,
  socket,
  slug,
  isLeader,
  onNameChange,
  onTransferLeadership,
  onHome,
}) => {
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);

  // Derive current player name from players list if not provided
  const derivedPlayerName = currentPlayerName || players.find(p => p.id === currentPlayerId)?.name || '';
  const [tempName, setTempName] = useState(derivedPlayerName);
  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const playerListRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = GAME_COLORS[gameType] || GAME_COLORS['dice-factory'];
  const displayName = GAME_DISPLAY_NAMES[gameType] || gameType;

  // Focus input when editing
  useEffect(() => {
    if (editingName && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingName]);

  const handleNameSubmit = () => {
    if (tempName.trim() && tempName.trim() !== derivedPlayerName) {
      // Update localStorage if slug provided
      if (slug) {
        localStorage.setItem(`player-name-${slug}`, tempName.trim());
      }

      // Use callback if provided, otherwise emit directly to socket
      if (onNameChange) {
        onNameChange(tempName.trim());
      } else if (socket && slug) {
        socket.emit('update-player-name', { slug, newName: tempName.trim() });
      }
    }
    setEditingName(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setTempName(derivedPlayerName);
      setEditingName(false);
    }
  };

  const handleTransferLeadershipInternal = (newLeaderId: string) => {
    // Use callback if provided, otherwise emit directly to socket
    if (onTransferLeadership) {
      onTransferLeadership(newLeaderId);
    } else if (socket && slug && isLeader) {
      socket.emit('change-leader', { slug, newLeaderId });
    }
    setShowLeaderModal(false);
  };

  const handleHomeInternal = () => {
    // Use callback if provided, otherwise navigate directly
    if (onHome) {
      onHome();
    } else {
      navigate('/');
    }
  };

  // Sort players: leader first, then by join order (assuming ID order reflects join order)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === leaderId) return -1;
    if (b.id === leaderId) return 1;
    return 0;
  });

  return (
    <>
      <header className={`p-4 border-b ${colors.border} ${colors.bg} flex items-center justify-between relative z-10`}>
        {/* Left: Game icon and title */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <img
            src={`/assets/icon-${gameType}.jpg`}
            alt={gameType}
            className={`w-10 h-10 rounded border-2 ${colors.border}`}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl font-bold text-lion-light">
              {gameTitle || displayName}
            </h1>
          </div>
        </div>

        {/* Center: Player list (scrollable) */}
        <div
          ref={playerListRef}
          className="flex-1 mx-4 overflow-x-auto scrollbar-thin scrollbar-thumb-payne-grey-light scrollbar-track-transparent"
        >
          <div className="flex items-center gap-2 py-1 min-w-min">
            {sortedPlayers.map((player) => {
              const isCurrentPlayer = player.id === currentPlayerId || player.name === derivedPlayerName;
              const isPlayerLeader = player.id === leaderId;
              const isDisconnected = !player.isConnected && !player.isBot;

              return (
                <div
                  key={player.id}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm whitespace-nowrap
                    ${isCurrentPlayer
                      ? 'bg-emerald-500/20 border border-emerald-500/40'
                      : 'bg-payne-grey/30 border border-payne-grey-light/30'
                    }
                    ${isDisconnected ? 'opacity-60' : ''}
                  `}
                >
                  {/* Leader crown */}
                  {isPlayerLeader && (
                    <span className="text-yellow-400" title="Lobby Leader">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10 1l3 6 6 .75-4.12 4.62L16 18l-6-3-6 3 1.13-5.63L1 7.75 7 7l3-6z"/>
                      </svg>
                    </span>
                  )}

                  {/* Bot icon */}
                  {player.isBot && (
                    <span className="text-uranian-blue" title="Bot">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L10 6.477V16h2a1 1 0 110 2H8a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" clipRule="evenodd"/>
                      </svg>
                    </span>
                  )}

                  {/* Disconnected icon */}
                  {isDisconnected && (
                    <span className="text-red-400" title="Disconnected">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 15.352V16.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z"/>
                        <path d="M16.707 3.293a1 1 0 010 1.414L15.414 6l1.293 1.293a1 1 0 01-1.414 1.414L14 7.414l-1.293 1.293a1 1 0 01-1.414-1.414L12.586 6l-1.293-1.293a1 1 0 011.414-1.414L14 4.586l1.293-1.293a1 1 0 011.414 0z"/>
                      </svg>
                    </span>
                  )}

                  {/* Player name */}
                  {isCurrentPlayer && editingName ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onKeyDown={handleKeyPress}
                      onBlur={handleNameSubmit}
                      className="w-24 px-1 py-0.5 bg-payne-grey border border-payne-grey-light rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  ) : (
                    <span className={isCurrentPlayer ? 'text-emerald-400 font-medium' : 'text-white'}>
                      {player.name}
                    </span>
                  )}

                  {/* Edit pencil for current player */}
                  {isCurrentPlayer && !editingName && (
                    <button
                      onClick={() => {
                        setTempName(derivedPlayerName);
                        setEditingName(true);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      title="Edit your name"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"/>
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Leader transfer + Home buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Leader transfer button (only for leader) */}
          {isLeader && (
            <button
              onClick={() => setShowLeaderModal(true)}
              className="bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 px-3 py-2 rounded-lg transition-colors border border-yellow-600/30 flex items-center gap-1.5"
              title="Transfer Leadership"
            >
              {/* Crown + Gear icons */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 1l3 6 6 .75-4.12 4.62L16 18l-6-3-6 3 1.13-5.63L1 7.75 7 7l3-6z"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd"/>
              </svg>
            </button>
          )}

          {/* Home button */}
          <button
            onClick={handleHomeInternal}
            className="bg-payne-grey hover:bg-payne-grey-light text-white px-4 py-2 rounded-lg transition-colors border border-payne-grey-light"
          >
            Home
          </button>
        </div>
      </header>

      {/* Leader Transfer Modal */}
      {showLeaderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-payne-grey p-6 rounded-xl max-w-md w-full mx-4 border border-payne-grey-light">
            <h2 className="text-xl font-bold mb-4 text-lion-light flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-yellow-400">
                <path d="M10 1l3 6 6 .75-4.12 4.62L16 18l-6-3-6 3 1.13-5.63L1 7.75 7 7l3-6z"/>
              </svg>
              Transfer Leadership
            </h2>
            <p className="text-gray-400 text-sm mb-4">Select a player to become the new lobby leader:</p>
            <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
              {players
                .filter(p => p.isConnected && p.id !== currentPlayerId && !p.isBot)
                .map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handleTransferLeadershipInternal(player.id)}
                    className="w-full text-left p-3 bg-payne-grey-light hover:bg-lion/20 rounded-lg transition-colors text-white border border-payne-grey-light flex items-center gap-2"
                  >
                    <span className="font-medium">{player.name}</span>
                  </button>
                ))}
              {players.filter(p => p.isConnected && p.id !== currentPlayerId && !p.isBot).length === 0 && (
                <p className="text-gray-500 text-center py-4">No other connected players available</p>
              )}
            </div>
            <button
              onClick={() => setShowLeaderModal(false)}
              className="w-full bg-payne-grey-dark hover:bg-payne-grey text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameHeader;
