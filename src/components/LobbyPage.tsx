import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import CardSelectionModal from './games/henhur/components/CardSelectionModal';
import { ALL_CARDS } from './games/henhur/data/cards';
import AbilitySelectionModal from './AbilitySelectionModal';
import ABILITY_DECKS from './games/dice-factory-v0.2.1/data/abilityDecks.json';
import { getAvailableMaps } from './games/heist-city/data/mapLoader';
import {
  SOCKET_EVENTS,
  WAR_EVENTS,
  DICE_FACTORY_EVENTS,
  HENHUR_EVENTS,
  HEIST_CITY_EVENTS,
} from '../constants';
import {
  LobbyHeader,
  LobbyTitleEditor,
  PlayerList,
  LeaderSelectModal,
  GameStartButton,
  LobbyInfo,
  GameRulesPanel,
  WarOptions,
  DiceFactoryOptions,
  HenHurOptions,
  KillTeamDraftOptions,
  HeistCityOptions,
} from './lobby';

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
  const { socket, isConnected, rejoinLobby } = useSocket();

  // Core lobby state
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const hasInitializedRef = useRef(false);
  const [myPlayerName, setMyPlayerName] = useState('');
  const [botStyles, setBotStyles] = useState<any[]>([]);

  // UI state
  const [showLeaderSelect, setShowLeaderSelect] = useState(false);
  const [showAbilitySelection, setShowAbilitySelection] = useState(false);
  const [showCardSelection, setShowCardSelection] = useState(false);

  // Game-specific options
  const [selectedVariant, setSelectedVariant] = useState('regular');
  const [selectedDFVariant, setSelectedDFVariant] = useState('v0.1.5');
  const [selectedAbilityIds, setSelectedAbilityIds] = useState<string[]>([]);
  const [selectedHenhurVariant, setSelectedHenhurVariant] = useState('standard');
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>(ALL_CARDS.map(card => card.id));
  const [ktdPackSize, setKtdPackSize] = useState(15);
  const [ktdTotalPacks, setKtdTotalPacks] = useState(3);
  const [selectedHeistCityMap, setSelectedHeistCityMap] = useState('bank-job');

  // Get available Heist City maps
  const heistCityMaps = useMemo(() => getAvailableMaps(), []);

  // Derived state
  const isLeader = lobby && socket && lobby.leaderId === socket.id;

  // Game color classes
  const gameColor = lobby?.gameType === 'war' ? 'tea-rose'
    : lobby?.gameType === 'henhur' ? 'amber-400'
    : lobby?.gameType === 'heist-city' ? 'purple-500'
    : 'uranian-blue';

  const gameColorClasses = lobby?.gameType === 'war'
    ? 'border-tea-rose/30 bg-tea-rose/10'
    : lobby?.gameType === 'henhur'
      ? 'border-amber-400/30 bg-amber-400/10'
      : lobby?.gameType === 'heist-city'
        ? 'border-purple-500/30 bg-purple-500/10'
        : 'border-uranian-blue/30 bg-uranian-blue/10';

  // Register socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdated = (lobbyData: LobbyState) => {
      setLobby(lobbyData);
    };

    const handleGameStarted = () => {
      navigate(`/game/${slug}`);
    };

    const handleBotStyles = (data: { styles: any[] }) => {
      setBotStyles(data.styles);
    };

    socket.on(SOCKET_EVENTS.LOBBY_UPDATED, handleLobbyUpdated);
    socket.on(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
    socket.on(SOCKET_EVENTS.BOT_STYLES, handleBotStyles);

    return () => {
      socket.off(SOCKET_EVENTS.LOBBY_UPDATED, handleLobbyUpdated);
      socket.off(SOCKET_EVENTS.GAME_STARTED, handleGameStarted);
      socket.off(SOCKET_EVENTS.BOT_STYLES, handleBotStyles);
    };
  }, [socket, slug, navigate]);

  // Initial join lobby
  useEffect(() => {
    if (socket && isConnected && !hasInitializedRef.current && slug) {
      hasInitializedRef.current = true;

      let playerName = localStorage.getItem(`player-name-${slug}`);
      if (!playerName) {
        playerName = `Player ${Math.floor(Math.random() * 1000)}`;
        localStorage.setItem(`player-name-${slug}`, playerName);
      }

      setMyPlayerName(playerName);
      socket.emit(SOCKET_EVENTS.JOIN_LOBBY, { slug, playerName });
      socket.emit(SOCKET_EVENTS.GET_BOT_STYLES);
      setIsJoined(true);
    }
  }, [socket, isConnected, slug]);

  // Handle reconnection
  useEffect(() => {
    if (isConnected && isJoined && slug) {
      rejoinLobby(slug);
    }
  }, [isConnected, isJoined, slug, rejoinLobby]);

  // Request bot styles when game type changes
  useEffect(() => {
    if (socket && lobby?.gameType) {
      socket.emit(SOCKET_EVENTS.GET_BOT_STYLES);
    }
    if (lobby?.gameType === 'henhur' && lobby.gameOptions) {
      setSelectedHenhurVariant(lobby.gameOptions.henhurVariant || 'standard');
    }
  }, [socket, lobby?.gameType, lobby?.gameOptions]);

  // Initialize all ability IDs as selected by default
  useEffect(() => {
    if (selectedAbilityIds.length === 0) {
      const allAbilityIds = [
        ...ABILITY_DECKS.tier1.map((a: any) => a.id),
        ...ABILITY_DECKS.tier2.map((a: any) => a.id),
        ...ABILITY_DECKS.tier3.map((a: any) => a.id),
        ...ABILITY_DECKS.tier4.map((a: any) => a.id)
      ];
      setSelectedAbilityIds(allAbilityIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handlers
  const handleTitleChange = (newTitle: string) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.UPDATE_LOBBY_TITLE, { slug, newTitle });
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Lobby link copied to clipboard!');
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Lobby link copied to clipboard!');
    }
  };

  const handleNameChange = (newName: string) => {
    if (socket) {
      localStorage.setItem(`player-name-${slug}`, newName);
      setMyPlayerName(newName);
      socket.emit(SOCKET_EVENTS.UPDATE_PLAYER_NAME, { slug, newName });
    }
  };

  const handleGameTypeChange = (newGameType: string) => {
    if (socket && isLeader) {
      socket.emit(SOCKET_EVENTS.UPDATE_GAME_TYPE, { slug, gameType: newGameType });
    }
  };

  const handleChangeLeader = (newLeaderId: string) => {
    if (socket) {
      socket.emit(SOCKET_EVENTS.CHANGE_LEADER, { slug, newLeaderId });
      setShowLeaderSelect(false);
    }
  };

  const handleAddBot = () => {
    if (socket && isLeader) {
      const botName = `Bot ${Math.floor(Math.random() * 1000)}`;
      const defaultBotStyle = lobby?.gameType === 'dice-factory' ? 'pass' : 'random';
      socket.emit(SOCKET_EVENTS.ADD_BOT, { slug, botName, botStyle: defaultBotStyle });
    }
  };

  const handleRemoveBot = (botId: string) => {
    if (socket && isLeader) {
      socket.emit(SOCKET_EVENTS.REMOVE_BOT, { slug, botId });
    }
  };

  const handleChangeBotStyle = (botId: string, newStyle: string) => {
    if (socket && isLeader) {
      socket.emit(SOCKET_EVENTS.CHANGE_BOT_STYLE, { slug, botId, newStyle });
    }
  };

  const handleDFVariantChange = (variant: string) => {
    setSelectedDFVariant(variant);
    if (socket && isLeader) {
      socket.emit(DICE_FACTORY_EVENTS.UPDATE_VARIANT, { slug, variant });
    }
  };

  const handleHenhurVariantChange = (variant: string) => {
    setSelectedHenhurVariant(variant);
    if (socket && isLeader) {
      socket.emit(HENHUR_EVENTS.UPDATE_VARIANT, { slug, variant });
    }
  };

  const handleHeistCityMapChange = (mapId: string) => {
    setSelectedHeistCityMap(mapId);
    if (socket) {
      socket.emit(HEIST_CITY_EVENTS.UPDATE_MAP, { slug, mapId });
    }
  };

  const handleStartGame = () => {
    if (!socket || !lobby) return;

    if (lobby.gameType === 'war') {
      socket.emit(WAR_EVENTS.START_ENHANCED_WAR, { slug, variant: selectedVariant });
    } else if (lobby.gameType === 'dice-factory') {
      socket.emit(SOCKET_EVENTS.START_GAME, { slug, version: selectedDFVariant });
    } else if (lobby.gameType === 'henhur') {
      socket.emit(SOCKET_EVENTS.START_GAME, {
        slug,
        variant: selectedHenhurVariant,
        selectedCards: selectedCardIds
      });
    } else if (lobby.gameType === 'kill-team-draft') {
      if (!lobby.gameOptions) lobby.gameOptions = {};
      lobby.gameOptions.packSize = ktdPackSize;
      lobby.gameOptions.totalPacks = ktdTotalPacks;
      socket.emit(SOCKET_EVENTS.START_GAME, { slug });
    } else if (lobby.gameType === 'heist-city') {
      if (!lobby.gameOptions) lobby.gameOptions = {};
      lobby.gameOptions.mapId = selectedHeistCityMap;
      socket.emit(SOCKET_EVENTS.START_GAME, { slug });
    } else {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Invalid game type' });
    }
  };

  // Loading state
  if (!lobby) {
    return (
      <div className="min-h-screen bg-payne-grey-dark flex items-center justify-center">
        <div className="text-white text-xl">Loading lobby...</div>
      </div>
    );
  }

  // Determine which variant to show in rules (leader sees local, others see lobby)
  const displayDFVariant = isLeader ? selectedDFVariant : lobby.gameOptions?.version || 'v0.1.5';

  return (
    <div className="min-h-screen bg-payne-grey-dark text-white relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-40" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: '20px 20px'
      }}></div>

      {/* Header */}
      <LobbyHeader
        gameType={lobby.gameType}
        title={lobby.title}
        gameColor={gameColor}
        gameColorClasses={gameColorClasses}
        onBack={() => navigate('/')}
      />

      <div className="flex min-h-screen relative z-10">
        {/* Left Panel */}
        <div className="w-1/3 p-6 border-r border-payne-grey">
          {/* Lobby Title Editor */}
          <LobbyTitleEditor
            title={lobby.title}
            isLeader={!!isLeader}
            onTitleChange={handleTitleChange}
            onCopyLink={handleCopyLink}
          />

          {/* Player List */}
          <PlayerList
            players={lobby.players}
            leaderId={lobby.leaderId}
            myPlayerName={myPlayerName}
            isLeader={!!isLeader}
            gameType={lobby.gameType}
            botStyles={botStyles}
            onAddBot={handleAddBot}
            onRemoveBot={handleRemoveBot}
            onChangeBotStyle={handleChangeBotStyle}
            onChangeName={handleNameChange}
            onChangeLeader={() => setShowLeaderSelect(true)}
          />

          {/* Game Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-lion-light">Game Options</h3>

            {/* Game Type Selection */}
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
                  <option value="heist-city">Heist City</option>
                  <option value="kill-team-draft">Kill Team Draft</option>
                </select>
                <img
                  src={`/assets/icon-${lobby.gameType}.jpg`}
                  alt={lobby.gameType}
                  className={`w-8 h-8 rounded border border-${gameColor}`}
                />
              </div>
            </div>

            {/* Game-specific options */}
            {lobby.gameType === 'war' && (
              <WarOptions
                selectedVariant={selectedVariant}
                isLeader={!!isLeader}
                onVariantChange={setSelectedVariant}
              />
            )}

            {lobby.gameType === 'dice-factory' && (
              <DiceFactoryOptions
                selectedVariant={selectedDFVariant}
                selectedAbilityCount={selectedAbilityIds.length}
                isLeader={!!isLeader}
                onVariantChange={handleDFVariantChange}
                onOpenAbilitySelection={() => setShowAbilitySelection(true)}
              />
            )}

            {lobby.gameType === 'henhur' && (
              <HenHurOptions
                selectedVariant={selectedHenhurVariant}
                selectedCardCount={selectedCardIds.length}
                totalCardCount={ALL_CARDS.length}
                isLeader={!!isLeader}
                onVariantChange={handleHenhurVariantChange}
                onOpenCardSelection={() => setShowCardSelection(true)}
              />
            )}

            {lobby.gameType === 'kill-team-draft' && (
              <KillTeamDraftOptions
                packSize={ktdPackSize}
                totalPacks={ktdTotalPacks}
                playerCount={lobby.players.length}
                isLeader={!!isLeader}
                onPackSizeChange={setKtdPackSize}
                onTotalPacksChange={setKtdTotalPacks}
              />
            )}

            {lobby.gameType === 'heist-city' && (
              <HeistCityOptions
                selectedMap={selectedHeistCityMap}
                availableMaps={heistCityMaps}
                isLeader={!!isLeader}
                onMapChange={handleHeistCityMapChange}
              />
            )}
          </div>

          {/* Start Game Button */}
          <GameStartButton
            isLeader={!!isLeader}
            gameType={lobby.gameType}
            selectedVariant={selectedVariant}
            onStartGame={handleStartGame}
          />
        </div>

        {/* Right Panel - Game Rules */}
        <div className="flex-1 p-6">
          <GameRulesPanel
            gameType={lobby.gameType}
            gameColorClasses={gameColorClasses}
            selectedVariant={selectedVariant}
            dfVariant={displayDFVariant}
          />

          <LobbyInfo />
        </div>
      </div>

      {/* Modals */}
      <LeaderSelectModal
        isOpen={showLeaderSelect}
        players={lobby.players}
        onSelectLeader={handleChangeLeader}
        onClose={() => setShowLeaderSelect(false)}
      />

      <CardSelectionModal
        isOpen={showCardSelection}
        onClose={() => setShowCardSelection(false)}
        selectedCardIds={selectedCardIds}
        onSave={(cardIds) => setSelectedCardIds(cardIds)}
      />

      <AbilitySelectionModal
        isOpen={showAbilitySelection}
        onClose={() => setShowAbilitySelection(false)}
        selectedAbilityIds={selectedAbilityIds}
        onSave={(abilityIds) => {
          setSelectedAbilityIds(abilityIds);
          if (socket && slug) {
            socket.emit(DICE_FACTORY_EVENTS.UPDATE_ABILITIES, { slug, abilityIds });
          }
        }}
      />
    </div>
  );
};

export default LobbyPage;
