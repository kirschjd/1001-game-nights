import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface BotConfig {
  style: string;
  count: number;
}

interface BotStyle {
  id: string;
  name: string;
  description: string;
}

interface EnhancedWarSetupProps {
  socket: Socket;
  isLeader: boolean;
  lobbySlug: string;
  onStartGame: () => void;
  currentPlayers: number;
}

const EnhancedWarSetup: React.FC<EnhancedWarSetupProps> = ({
  socket,
  isLeader,
  lobbySlug,
  onStartGame,
  currentPlayers
}) => {
  const [botStyles, setBotStyles] = useState<BotStyle[]>([]);
  const [bots, setBots] = useState<BotConfig[]>([]);
  const [showBotConfig, setShowBotConfig] = useState(false);

  useEffect(() => {
    // Request available bot styles
    socket.emit('get-bot-styles');

    socket.on('bot-styles', (data) => {
      setBotStyles(data.styles);
    });

    return () => {
      socket.off('bot-styles');
    };
  }, [socket]);

  const addBot = (style: string) => {
    const existingBot = bots.find(b => b.style === style);
    if (existingBot) {
      setBots(bots.map(b => 
        b.style === style 
          ? { ...b, count: Math.min(b.count + 1, 4) }
          : b
      ));
    } else {
      setBots([...bots, { style, count: 1 }]);
    }
  };

  const removeBot = (style: string) => {
    setBots(bots.map(b => 
      b.style === style 
        ? { ...b, count: Math.max(b.count - 1, 0) }
        : b
    ).filter(b => b.count > 0));
  };

  if (!isLeader) {
    return (
      <div className="bg-payne-grey/30 rounded-lg p-6 border border-tea-rose/30">
        <h3 className="text-xl font-bold text-tea-rose mb-4">🤖 Bot Configuration</h3>
        <p className="text-gray-300">Waiting for lobby leader to configure bots...</p>
      </div>
    );
  }

  return (
    <div className="bg-payne-grey/30 rounded-lg p-6 border border-tea-rose/30">
      <h3 className="text-xl font-bold text-tea-rose mb-6">🤖 Bot Configuration</h3>

      {/* Bot Configuration */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-semibold text-white">Bot Players</h4>
          <button
            onClick={() => setShowBotConfig(!showBotConfig)}
            className="text-tea-rose hover:text-tea-rose-light text-sm"
          >
            {showBotConfig ? 'Hide' : 'Add Bots'}
          </button>
        </div>
        
        {showBotConfig && (
          <div className="space-y-3 bg-payne-grey-dark/50 rounded p-4">
            {botStyles.map(style => {
              const botConfig = bots.find(b => b.style === style.id);
              const count = botConfig?.count || 0;
              
              return (
                <div key={style.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-white font-medium">{style.name}</div>
                    <div className="text-gray-400 text-sm">{style.description}</div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => removeBot(style.id)}
                      disabled={count === 0}
                      className="w-8 h-8 bg-tea-rose/20 text-tea-rose rounded hover:bg-tea-rose/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      -
                    </button>
                    <span className="w-8 text-center text-white font-medium">{count}</span>
                    <button
                      onClick={() => addBot(style.id)}
                      disabled={false}
                      className="w-8 h-8 bg-tea-rose/20 text-tea-rose rounded hover:bg-tea-rose/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bot Summary */}
        {bots.length > 0 && (
          <div className="mt-3 p-3 bg-tea-rose/10 rounded border border-tea-rose/30">
            <div className="text-tea-rose font-medium">Bot Summary:</div>
            <div className="text-gray-300 text-sm">
              {bots.map(bot => (
                <div key={bot.style}>
                  {bot.count}x {botStyles.find(s => s.id === bot.style)?.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Game Rules Summary */}
      <div className="mt-6 p-4 bg-payne-grey-dark/30 rounded border border-gray-600">
        <h5 className="text-white font-semibold mb-2">Bot Styles:</h5>
        <ul className="text-gray-300 text-sm space-y-1">
          <li>• <strong>Random:</strong> Unpredictable decisions</li>
          <li>• <strong>Always Play:</strong> Never folds, always commits</li>
          <li>• <strong>Conservative:</strong> Only plays strong cards</li>
          <li>• <strong>Aggressive:</strong> Takes risks with most hands</li>
        </ul>
      </div>
    </div>
  );
};

export default EnhancedWarSetup;