import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  joinedAt: string;
  isBot?: boolean;
  botStyle?: string;
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
  const [selectedVariant, setSelectedVariant] = useState('regular');
  const [botStyles, setBotStyles] = useState<any[]>([]);
  const [selectedDFVariant, setSelectedDFVariant] = useState('standard');
  const [experimentalTurnLimit, setExperimentalTurnLimit] = useState(11);

  useEffect(() => {
    const newSocket = io(process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('lobby-updated', (lobbyData: LobbyState) => {
      setLobby(lobbyData);
    });

    newSocket.on('game-started', (gameData) => {
      navigate(`/game/${slug}`);
    });

    // Load bot styles for war game
    newSocket.on('bot-styles', (data) => {
      setBotStyles(data.styles);
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
      
      // UPDATED: Request bot styles for any game (not just war)
      socket.emit('get-bot-styles');
      
      setIsJoined(true);
    }
  }, [socket, isJoined, slug]);

  
  useEffect(() => {
    // Request bot styles when lobby game type changes
    if (socket && lobby?.gameType) {
      console.log('Game type changed to:', lobby.gameType);
      socket.emit('get-bot-styles');
    }
  }, [socket, lobby?.gameType]);

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
    if (socket && lobby) {
      if (lobby.gameType === 'war') {
        // Don't send existing bots as configurations - they're already in the lobby
        socket.emit('start-enhanced-war', {
          slug,
          variant: selectedVariant
          // Removed: bots array - use existing lobby bots only
        });
      } else {
        // Start Dice Factory with variant support
        socket.emit('start-game', { 
          slug, 
          variant: selectedDFVariant,
          experimentalTurnLimit: selectedDFVariant === 'experimental' ? experimentalTurnLimit : undefined
        });
      }
    }
  };

  const handleAddBot = () => {
    if (socket && isLeader) {
      const botName = `Bot ${Math.floor(Math.random() * 1000)}`;

      // Use appropriate default bot style based on game type
      const defaultBotStyle = lobby?.gameType === 'dice-factory' ? 'pass' : 'random';

      socket.emit('add-bot', { 
        slug, 
        botName,
        botStyle: defaultBotStyle
      });
    }
  };

  const handleRemoveBot = (botId: string) => {
    if (socket && isLeader) {
      socket.emit('remove-bot', { slug, botId });
    }
  };

  const handleChangeBotStyle = (botId: string, newStyle: string) => {
    if (socket && isLeader) {
      socket.emit('change-bot-style', { slug, botId, newStyle });
    }
  };

  const isLeader = lobby && socket && lobby.leaderId === socket.id;

  // Get game-specific colors
  const gameColor = lobby?.gameType === 'war' ? 'tea-rose' : lobby?.gameType === 'henhur' ? 'amber-400' : 'uranian-blue';
  const gameColorClasses = lobby?.gameType === 'war' 
    ? 'border-tea-rose/30 bg-tea-rose/10' 
    : lobby?.gameType === 'henhur' 
      ? 'border-amber-400/30 bg-amber-400/10' 
      : 'border-uranian-blue/30 bg-uranian-blue/10';

  if (!lobby) {
    return (
      <div className="min-h-screen bg-payne-grey-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading lobby...</div>
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
      <header className={`p-4 border-b ${gameColorClasses} relative z-10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <img 
              src={`/assets/icon-${lobby.gameType}.jpg`} 
              alt={lobby.gameType}
              className={`w-12 h-12 rounded-lg mr-4 border-2 border-${gameColor}`}
            />
            <div>
              <h1 className="text-3xl font-bold mb-1 text-lion-light">🎮 {lobby.title}</h1>
              <p className="text-gray-300">
                Playing: {lobby.gameType === 'war' ? 'War' : lobby.gameType === 'dice-factory' ? 'Dice Factory' : lobby.gameType === 'henhur' ? 'HenHur' : lobby.gameType}
              </p>
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-lion-light">Players</h3>
              {isLeader && (lobby.gameType === 'war' || lobby.gameType === 'dice-factory') && (
                <button
                  onClick={handleAddBot}
                  className="px-3 py-1 bg-uranian-blue hover:bg-uranian-blue-light text-white text-sm rounded transition-colors"
                >
                  + Add Bot
                </button>
              )}
            </div>
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
                    
                    {/* Bot indicator and controls */}
                    {player.isBot ? (
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-uranian-blue/20 text-uranian-blue text-xs rounded border border-uranian-blue/30">
                          BOT
                        </span>
                        <span className="font-medium text-white">{player.name}</span>
                        {isLeader && (
                          <>
                            <select
                              value={player.botStyle || 'random'}
                              onChange={(e) => handleChangeBotStyle(player.id, e.target.value)}
                              className="px-2 py-1 bg-payne-grey border border-payne-grey-light rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-lion"
                            >
                              {botStyles.map(style => (
                                <option key={style.id} value={style.id}>{style.name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleRemoveBot(player.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      /* Human player controls */
                      player.name === myPlayerName ? (
                        editingName ? (
                          <div className="flex space-x-2">
                            <input
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                              className="px-2 py-1 bg-payne-grey border border-payne-grey-light rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-lion"
                              autoFocus
                            />
                            <button
                              onClick={handleNameSubmit}
                              className="px-2 py-1 bg-lion hover:bg-lion-dark rounded text-white text-xs"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingName(false)}
                              className="px-2 py-1 bg-payne-grey hover:bg-payne-grey-light rounded text-white text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{player.name} (You)</span>
                            <button
                              onClick={() => {
                                setTempName(player.name);
                                setEditingName(true);
                              }}
                              className="text-xs text-lion hover:text-lion-light"
                            >
                              ✏️
                            </button>
                          </div>
                        )
                      ) : (
                        <span className="font-medium">{player.name}</span>
                      )
                    )}
                    
                    {!player.isConnected && !player.isBot && (
                      <span className="text-red-400 text-sm">(Disconnected)</span>
                    )}
                  </div>
                  
                  {isLeader && player.id === lobby.leaderId && !player.isBot && (
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
                  <option value="henhur">HenHur</option>
                </select>
                <img 
                  src={`/assets/icon-${lobby.gameType}.jpg`} 
                  alt={lobby.gameType}
                  className={`w-8 h-8 rounded border border-${gameColor}`}
                />
              </div>
            </div>

            {/* War Game Variant Selection */}
            {lobby.gameType === 'war' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  War Variant
                </label>
                <select
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  disabled={!isLeader}
                  className="w-full px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-lion"
                >
                  <option value="regular">Regular War</option>
                  <option value="aces-high">Aces High</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {selectedVariant === 'aces-high' 
                    ? 'Aces always win, regardless of other cards' 
                    : 'Standard rules - highest card wins'
                  }
                </p>
              </div>
            )}

            {/* Dice Factory Variant Selection */}
            {lobby.gameType === 'dice-factory' && isLeader && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Game Mode
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedDFVariant}
                    onChange={e => {
                      const newVariant = e.target.value;
                      setSelectedDFVariant(newVariant);
                      if (socket && isLeader) {
                        socket.emit('update-df-variant', { slug, variant: newVariant });
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
                  >
                    <option value="standard">Standard</option>
                    <option value="experimental">Experimental</option>
                  </select>
                  {selectedDFVariant === 'experimental' && (
                    <select
                      value={experimentalTurnLimit}
                      onChange={e => setExperimentalTurnLimit(Number(e.target.value))}
                      className="px-3 py-2 bg-payne-grey border border-payne-grey-light rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-lion"
                    >
                      <option value={8}>8 turns</option>
                      <option value={9}>9 turns</option>
                      <option value={10}>10 turns</option>
                      <option value={11}>11 turns</option>
                      <option value={12}>12 turns</option>
                      <option value={13}>13 turns</option>
                      <option value={14}>14 turns</option>
                      <option value={15}>15 turns</option>
                    </select>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  <strong>Standard:</strong> Classic Dice Factory rules.<br/>
                  <strong>Experimental:</strong> New or test mechanics (see release notes).
                </div>
              </div>
            )}
          </div>

          {/* Start Game Button */}
          {isLeader && (
            <button
              onClick={handleStartGame}
              className="w-full bg-lion hover:bg-lion-dark text-white font-bold py-3 px-6 rounded-lg transition-colors shadow-lg"
            >
              🚀 Start {lobby.gameType === 'war' ? selectedVariant === 'aces-high' ? 'Aces High' : 'Regular War' : 'Game'}
            </button>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 p-6">
          {/* Game Rules and Description */}
          {lobby.gameType === 'war' ? (
            <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
              <h2 className="text-2xl font-bold mb-4 text-tea-rose">
                ⚔️ {selectedVariant === 'aces-high' ? 'Aces High War' : 'Regular War'}
              </h2>
              
              <div className="space-y-4 text-gray-300">
                <p className="text-lg">
                  A strategic card game where timing and nerve determine victory. 
                  Choose your battles wisely!
                </p>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">📋 How to Play</h3>
                  <ol className="space-y-2 text-sm">
                    <li><strong>1.</strong> Each round, every player receives one random card (Ace to King)</li>
                    <li><strong>2.</strong> Players simultaneously choose to either <span className="text-green-400">Play</span> or <span className="text-red-400">Fold</span></li>
                    <li><strong>3.</strong> If you <span className="text-red-400">Fold</span>: You automatically lose 1 point (safe option)</li>
                    <li><strong>4.</strong> If you <span className="text-green-400">Play</span>: Your card competes with other players who played</li>
                    <li><strong>5.</strong> <strong>Winner:</strong> Highest card gets +1 point, all others who played get -1 point</li>
                    <li><strong>6.</strong> <strong>Victory:</strong> First player to reach 5 points wins the game!</li>
                  </ol>
                </div>

                {selectedVariant === 'aces-high' && (
                  <div className="p-3 bg-tea-rose/20 border border-tea-rose/40 rounded">
                    <h4 className="font-semibold text-tea-rose mb-1">🎯 Aces High Special Rule</h4>
                    <p className="text-sm">
                      In this variant, <strong>Aces always win</strong> regardless of other cards played. 
                      If multiple players play Aces, it's a tie with no points awarded.
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">🎲 Game Info</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>Players:</strong> 2-8 players</div>
                    <div><strong>Duration:</strong> 5-10 minutes</div>
                    <div><strong>Difficulty:</strong> Easy</div>
                    <div><strong>Strategy:</strong> Risk vs Reward</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">🤖 Bot Opponents</h3>
                  <div className="space-y-1 text-sm">
                    <div><strong>Random:</strong> Makes unpredictable decisions (70% play rate)</div>
                    <div><strong>Always Play:</strong> Never folds, always commits to the round</div>
                    <div><strong>Conservative:</strong> Only plays with strong cards (9+, Aces)</div>
                    <div><strong>Aggressive:</strong> Takes risks, plays most hands regardless</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">💡 Strategy Tips</h3>
                  <ul className="space-y-1 text-sm">
                    <li>• <strong>Fold</strong> with low cards (2-6) to minimize losses</li>
                    <li>• <strong>Play</strong> confidently with high cards (10-King)</li>
                    <li>• Consider the risk: losing 1 point vs potentially losing more</li>
                    <li>• Watch opponent patterns - some players are more aggressive</li>
                    <li>• In Aces High: Always play Aces, they can't lose!</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : lobby.gameType === 'henhur' ? (
            <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
              <h2 className="text-2xl font-bold mb-4 text-amber-400">🐓 HenHur</h2>
              <p className="text-lg font-semibold text-amber-400 mb-4">This is a placeholder for the HenHur game. Rules and features will be added soon!</p>
              <div className="space-y-4 text-gray-300">
                <p className="text-lg">A new game framework. Stay tuned for updates and gameplay details.</p>
              </div>
            </div>
          ) : (
            /* Dice Factory Rules */
            <div className={`p-6 rounded-lg border ${gameColorClasses}`}>
              <h2 className="text-2xl font-bold mb-4 text-uranian-blue">🎲 Dice Factory</h2>
              {(() => {
                // Use local variant for leader, lobby variant for others
                const variant = isLeader ? selectedDFVariant : lobby.gameOptions?.variant || 'standard';
                return (
                  <p className="text-lg font-semibold text-uranian-blue mb-4">
                    {variant === 'experimental'
                      ? 'Experimental Mode: Compete for points in a fixed number of turns. No collapse mechanics.'
                      : 'Standard Mode: A Game of Odds and Industriousness'}
                  </p>
                );
              })()}
              <div className="space-y-4 text-gray-300">
                {(() => {
                  const variant = isLeader ? selectedDFVariant : lobby.gameOptions?.variant || 'standard';
                  return (
                    <p className="text-lg">
                      {variant === 'experimental'
                        ? 'Score as many points as possible before the turn limit is reached. The player with the highest score wins.'
                        : "The game's purpose is to score points. This is done by scoring tricks."}
                    </p>
                  );
                })()}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">🎲 Dice Pool</h3>
                  <p className="text-sm mb-2">
                    Tricks are made from each players' dice pool. Each player starts with a minimum dice pool of 4d4. 
                    A player's dice minimum dice pool determines the number of die they cannot go below. The dice pool 
                    is what a player rolls at the beginning of their turn. If a players dice pool falls below their 
                    minimum dice pool, they will automatically recruit up to the minimum dice pool.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">📋 Standard Actions</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Promotion</h4>
                      <p>A die can be promoted to a die of one larger size. This can only be done on a die with max pips. This exhausts the die.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Recruitment</h4>
                      <p>Dice can be recruited into the dice pool by rolling a number corresponding to the recruitment table:</p>
                      <div className="bg-payne-grey/30 p-3 rounded mt-2 text-xs">
                        <div><strong>D4:</strong> Roll 1 → D4</div>
                        <div><strong>D6:</strong> Roll 1,2 → D6, D4</div>
                        <div><strong>D8:</strong> Roll 1,2,3 → D8, D6, D4</div>
                        <div><strong>D10:</strong> Roll 1,2,3,4 → D10, D8, D6, D4</div>
                        <div><strong>D12:</strong> Roll 1,2,3,4,5 → D12, D10, D8, D6, D4</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Processing</h4>
                      <p>Dice can be processed for free pips. Doing so removes the die from the dice pool. The player immediately gets free pips equal to 2× the rolled value.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Scoring</h4>
                      <p>Tricks can be straights or sets.</p>
                      <ul className="mt-1 space-y-1">
                        <li>• <strong>Straights:</strong> 3+ dice in increasing order = (highest #) × (# of dice)</li>
                        <li>• <strong>Sets:</strong> 3+ dice of the same value = (number on dice) × (# of dice + 1)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">💰 Standard Pip Actions</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Increase 1 die by 1: <strong>4 pips</strong></div>
                    <div>Decrease 1 die by 1: <strong>3 pips</strong></div>
                    <div>Reroll a die: <strong>2 pips</strong></div>
                    <div>Factory Effects: <strong>7 pips</strong></div>
                    <div>Factory Modification: <strong>9 pips</strong></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">🏭 Factory System</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Factory Effects</h4>
                      <p>Powerful one-time effects that go to your hand when bought and can be played on later turns.</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-uranian-blue">Factory Modifications</h4>
                      <p>Permanently change rules for the player that bought them. Effects persist immediately.</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">💥 Ending the Game</h3>
                  {(() => {
                    const variant = isLeader ? selectedDFVariant : lobby.gameOptions?.variant || 'standard';
                    return variant === 'experimental' ? (
                      <p className="text-sm">
                        The game ends after a set number of turns. Players compete to score the most points within 
                        the time limit, with no factory collapse mechanics.
                      </p>
                    ) : (
                      <p className="text-sm">
                        The factory begins to collapse when the turn indicator exceeds the collapse dice (1d6, 1d8, 1d10). 
                        Each turn 1 is added to the turn counter and the collapse dice are rolled and added. If the sum is 
                        less than the turn counter, the collapse begins. Players can choose to stay or flee. When a player 
                        flees, their point total is locked and a collapse die is removed. If the turn counter ≤ 0, any 
                        remaining players are crushed and their score goes to 0.
                      </p>
                    );
                  })()}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">🔄 Turn Structure</h3>
                  <ol className="space-y-1 text-sm">
                    <li><strong>1.</strong> Roll collapse dice</li>
                    <li><strong>2.</strong> Play Factory Effects</li>
                    <li><strong>3.</strong> Dice are rolled</li>
                    <li><strong>4.</strong> Perform Dice actions</li>
                    <li><strong>5.</strong> Check for collapse</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Additional lobby info */}
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