import React from 'react';
import PlayerListItem from './PlayerListItem';

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

interface PlayerListProps {
  players: Player[];
  leaderId: string;
  myPlayerName: string;
  isLeader: boolean;
  gameType: string;
  botStyles: BotStyle[];
  onAddBot: () => void;
  onRemoveBot: (botId: string) => void;
  onChangeBotStyle: (botId: string, style: string) => void;
  onChangeName: (newName: string) => void;
  onChangeLeader: () => void;
}

const GAMES_WITH_BOTS = ['war', 'dice-factory', 'kill-team-draft'];

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  leaderId,
  myPlayerName,
  isLeader,
  gameType,
  botStyles,
  onAddBot,
  onRemoveBot,
  onChangeBotStyle,
  onChangeName,
  onChangeLeader,
}) => {
  const showAddBotButton = isLeader && GAMES_WITH_BOTS.includes(gameType);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-lion-light">Players</h3>
        {showAddBotButton && (
          <button
            onClick={onAddBot}
            className="px-3 py-1 bg-uranian-blue hover:bg-uranian-blue-light text-white text-sm rounded transition-colors"
          >
            + Add Bot
          </button>
        )}
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerListItem
            key={player.id}
            player={player}
            isLeader={isLeader}
            isCurrentPlayer={player.name === myPlayerName}
            isLobbyLeader={player.id === leaderId}
            botStyles={botStyles}
            onChangeBotStyle={onChangeBotStyle}
            onRemoveBot={onRemoveBot}
            onChangeName={onChangeName}
            onChangeLeader={onChangeLeader}
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerList;
