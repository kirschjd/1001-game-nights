// Simple Race Track Display
// Shows player positions on a linear track visualization

import React from 'react';

interface PlayerPosition {
  playerId: string;
  playerName: string;
  lap: number;
  space: number;
  isMe?: boolean;
}

interface RaceTrackProps {
  myPosition: { lap: number; space: number };
  myName: string;
  otherPlayers: Array<{
    playerId: string;
    playerName: string;
    position: { lap: number; space: number };
  }>;
  trackConfig: {
    trackLength: number;
    lapsToWin: number;
  };
}

const PLAYER_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
];

const RaceTrack: React.FC<RaceTrackProps> = ({
  myPosition,
  myName,
  otherPlayers,
  trackConfig
}) => {
  const { trackLength, lapsToWin } = trackConfig;

  // Combine all players for display
  const allPlayers: PlayerPosition[] = [
    { playerId: 'me', playerName: myName, ...myPosition, isMe: true },
    ...otherPlayers.map(p => ({
      playerId: p.playerId,
      playerName: p.playerName,
      lap: p.position.lap,
      space: p.position.space,
      isMe: false
    }))
  ];

  // Sort by total progress (lap * trackLength + space)
  const sortedPlayers = [...allPlayers].sort((a, b) => {
    const progressA = a.lap * trackLength + a.space;
    const progressB = b.lap * trackLength + b.space;
    return progressB - progressA;
  });

  // Calculate progress percentage
  const getProgressPercent = (lap: number, space: number): number => {
    const totalSpaces = lapsToWin * trackLength;
    const currentProgress = (lap - 1) * trackLength + space;
    return Math.min(100, (currentProgress / totalSpaces) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Track Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-white font-semibold">Race Progress</h3>
        <div className="text-gray-400 text-sm">
          {trackLength} spaces × {lapsToWin} laps = {trackLength * lapsToWin} total
        </div>
      </div>

      {/* Track Visualization */}
      <div className="relative">
        {/* Track Background */}
        <div className="h-8 bg-gray-700 rounded-full relative overflow-hidden">
          {/* Lap markers */}
          {Array.from({ length: lapsToWin - 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-500"
              style={{ left: `${((i + 1) / lapsToWin) * 100}%` }}
            />
          ))}

          {/* Finish line */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-r from-white to-gray-400" />
        </div>

        {/* Lap Labels */}
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>Start</span>
          {Array.from({ length: lapsToWin - 1 }).map((_, i) => (
            <span key={i} style={{ position: 'absolute', left: `${((i + 1) / lapsToWin) * 100}%`, transform: 'translateX(-50%)' }}>
              Lap {i + 2}
            </span>
          ))}
          <span>Finish</span>
        </div>
      </div>

      {/* Player Positions */}
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => {
          const progress = getProgressPercent(player.lap, player.space);
          const colorClass = player.isMe ? 'bg-amber-500' : PLAYER_COLORS[index % PLAYER_COLORS.length];

          return (
            <div key={player.playerId} className="flex items-center gap-3">
              {/* Position indicator */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${colorClass}`}>
                {index + 1}
              </div>

              {/* Player info */}
              <div className="w-24 truncate">
                <div className={`text-sm font-medium ${player.isMe ? 'text-amber-400' : 'text-white'}`}>
                  {player.playerName}
                  {player.isMe && ' (You)'}
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex-1 h-4 bg-gray-700 rounded-full relative overflow-hidden">
                <div
                  className={`absolute left-0 top-0 bottom-0 ${colorClass} transition-all duration-500`}
                  style={{ width: `${progress}%` }}
                />
                {/* Lap markers on individual bars */}
                {Array.from({ length: lapsToWin - 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-gray-600"
                    style={{ left: `${((i + 1) / lapsToWin) * 100}%` }}
                  />
                ))}
              </div>

              {/* Position text */}
              <div className="w-24 text-right text-sm text-gray-400">
                Lap {player.lap}, Space {player.space}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-700">
        <span>🏁 First to complete Lap {lapsToWin} wins!</span>
      </div>
    </div>
  );
};

export default RaceTrack;
