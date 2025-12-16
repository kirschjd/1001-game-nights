import React, { useState } from 'react';

interface BotStyle {
  id: string;
  name: string;
}

interface Player {
  id: string;
  name: string;
  isConnected: boolean;
  isBot?: boolean;
  botStyle?: string;
}

interface PlayerListItemProps {
  player: Player;
  isLeader: boolean;
  isCurrentPlayer: boolean;
  isLobbyLeader: boolean;
  botStyles: BotStyle[];
  onChangeBotStyle: (botId: string, style: string) => void;
  onRemoveBot: (botId: string) => void;
  onChangeName: (newName: string) => void;
  onChangeLeader: () => void;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({
  player,
  isLeader,
  isCurrentPlayer,
  isLobbyLeader,
  botStyles,
  onChangeBotStyle,
  onRemoveBot,
  onChangeName,
  onChangeLeader,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      onChangeName(tempName.trim());
      setEditingName(false);
    }
  };

  const handleStartEdit = () => {
    setTempName(player.name);
    setEditingName(true);
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border ${
        player.isConnected
          ? 'bg-payne-grey/30 border-payne-grey'
          : 'bg-payne-grey/10 border-payne-grey/50 opacity-50'
      }`}
    >
      <div className="flex items-center space-x-2">
        {isLobbyLeader && (
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
                  onChange={(e) => onChangeBotStyle(player.id, e.target.value)}
                  className="px-2 py-1 bg-payne-grey border border-payne-grey-light rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-lion"
                >
                  {botStyles.map(style => (
                    <option key={style.id} value={style.id}>{style.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => onRemoveBot(player.id)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        ) : (
          /* Human player controls */
          isCurrentPlayer ? (
            editingName ? (
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
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
                  onClick={handleStartEdit}
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

      {isLeader && isLobbyLeader && !player.isBot && (
        <button
          onClick={onChangeLeader}
          className="text-xs bg-lion hover:bg-lion-dark px-2 py-1 rounded text-white"
        >
          Change Leader
        </button>
      )}
    </div>
  );
};

export default PlayerListItem;
